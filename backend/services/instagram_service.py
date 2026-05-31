"""
Instagram Data Service — Phase 3
==================================
Responsible for: shortcode extraction, metadata scraping via instaloader,
audio downloading via yt-dlp, Groq Whisper transcribing with timestamps,
and engagement rate calculation.

Output: a single clean dict that the vector store and RAG chain consume,
matching the exact contract and schema of the YouTube service.
"""

import os
import re
import shutil
import logging
from datetime import datetime
import tempfile
import instaloader
from instaloader.exceptions import (
    InstaloaderException,
    LoginRequiredException,
    ConnectionException,
    TwoFactorAuthRequiredException,
)
import yt_dlp
from groq import Groq

logger = logging.getLogger(__name__)

# Directory where instaloader session files are persisted so we don't have to
# re-login (and re-trigger Instagram's suspicious-login challenges) every run.
SESSION_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ig_sessions")

# Local scratch directory for downloaded reel audio (backend/tmp). Using an
# absolute, OS-correct path instead of a hard-coded "/tmp" (which is invalid on
# Windows) means the audio file is reliably found and handed to Whisper.
TMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tmp")


def _session_file_for(username: str) -> str:
    """Absolute path of the saved session file for a given Instagram username."""
    return os.path.join(SESSION_DIR, f"session-{username}")


def _get_authenticated_loader() -> instaloader.Instaloader:
    """
    Build an Instaloader instance, authenticated when possible.

    Auth strategy (most reliable first):
      1. If a saved session file exists for INSTAGRAM_USERNAME, load it.
         Saved sessions survive restarts and avoid Instagram's repeated
         "suspicious login" / checkpoint challenges that break password login.
      2. Otherwise, if INSTAGRAM_USERNAME + INSTAGRAM_PASSWORD are set, log in
         with the password and SAVE the resulting session for next time.
      3. Otherwise (or on any failure), fall back to anonymous scraping.

    Never raises — login problems degrade gracefully to anonymous mode so the
    rest of the pipeline keeps working.
    """
    loader = instaloader.Instaloader()
    loader.dirname_pattern = "tmp"

    username = os.getenv("INSTAGRAM_USERNAME")
    password = os.getenv("INSTAGRAM_PASSWORD")

    if not username:
        logger.info("No INSTAGRAM_USERNAME set; scraping Instagram anonymously.")
        return loader

    session_file = _session_file_for(username)

    # 1. Try a previously saved session first.
    if os.path.exists(session_file):
        try:
            loader.load_session_from_file(username, session_file)
            logger.info("Loaded saved Instagram session for '%s' from %s", username, session_file)
            return loader
        except Exception as load_exc:
            logger.warning(
                "Could not load saved session for '%s' (%s). Will try password login.",
                username, load_exc,
            )

    # 2. Fall back to password login, then persist the session on success.
    if password:
        logger.info("Logging in to Instagram as '%s' via password...", username)
        try:
            loader.login(username, password)
            try:
                os.makedirs(SESSION_DIR, exist_ok=True)
                loader.save_session_to_file(session_file)
                logger.info("Saved Instagram session for '%s' to %s", username, session_file)
            except Exception as save_exc:
                logger.warning("Login succeeded but saving session failed: %s", save_exc)
            return loader
        except TwoFactorAuthRequiredException:
            logger.warning(
                "Instagram account '%s' has 2FA enabled. Password login can't complete here. "
                "Create a session once via: instaloader --login=%s  then place the session file in %s. "
                "Proceeding anonymously.",
                username, username, SESSION_DIR,
            )
        except ConnectionException as conn_exc:
            logger.warning(
                "Instagram login blocked/challenged for '%s' (%s). "
                "Create a session once via: instaloader --login=%s  then place the session file in %s. "
                "Proceeding anonymously.",
                username, conn_exc, username, SESSION_DIR,
            )
        except Exception as login_exc:
            logger.warning("Instagram login failed: %s. Proceeding anonymously.", login_exc)
    else:
        logger.info(
            "INSTAGRAM_PASSWORD not set and no saved session found for '%s'; scraping anonymously.",
            username,
        )

    return loader


# ---------------------------------------------------------------------------
# Step 1 — Shortcode Extraction
# ---------------------------------------------------------------------------

def extract_shortcode(url: str) -> str:
    """
    Extract the alphanumeric shortcode from an Instagram Post/Reel URL.

    Handles formats like:
      - https://www.instagram.com/reel/C8xK2mNLpQr/
      - https://www.instagram.com/p/C8xK2mNLpQr/

    Uses re module with r'/(?:reel|p)/([A-Za-z0-9_-]+)' pattern.
    Raises ValueError if the pattern does not match.
    """
    pattern = r"/(?:reel|p)/([A-Za-z0-9_-]+)"
    match = re.search(pattern, url)
    if not match:
        raise ValueError(
            "Invalid Instagram URL. Please provide a reel or post URL."
        )
    return match.group(1)


# ---------------------------------------------------------------------------
# Step 2 & 3 — Metadata Fetch via instaloader with Auth & Rate Limit Handling
# ---------------------------------------------------------------------------

def _extract_view_count(post) -> int:
    """
    Robustly resolve the view/play count for a Reel.

    instaloader's `post.video_view_count` and `post.video_play_count` frequently
    return None for Reels fetched anonymously, because Instagram serves the count
    under one of several shifting raw-metadata keys. We probe the public
    properties first, then fall back to digging the raw node / full-metadata dict
    via `post._field()`, and finally the logged-in mobile (iPhone) API struct,
    which is the most reliable source when the GraphQL endpoint returns 403.

    Returns 0 for non-video posts (e.g. photo carousels), which is correct.
    """
    # 1. Public properties (guarded by is_video internally)
    for prop in ("video_view_count", "video_play_count"):
        try:
            val = getattr(post, prop, None)
            if val:
                return int(val)
        except Exception:
            pass

    # 2. Raw metadata keys (covers Reels + older/newer GraphQL schemas)
    raw_keys = (
        "video_play_count",
        "play_count",
        "video_view_count",
        "view_count",
        "ig_play_count",
    )
    for key in raw_keys:
        try:
            val = post._field(key)
            if val:
                return int(val)
        except Exception:
            continue

    # 3. Logged-in mobile API struct (works when GraphQL is 403'd)
    try:
        struct = post._iphone_struct
        for key in ("play_count", "ig_play_count", "view_count", "video_view_count"):
            val = struct.get(key)
            if val:
                return int(val)
    except Exception:
        pass

    return 0


def _extract_duration_seconds(post) -> int:
    """
    Resolve the video duration in whole seconds, with the same multi-source
    fallback strategy as view count. Returns 0 for non-video posts.
    """
    # 1. Public property
    try:
        val = getattr(post, "video_duration", None)
        if val:
            return int(float(val))
    except Exception:
        pass

    # 2. Raw metadata
    for key in ("video_duration", "duration"):
        try:
            val = post._field(key)
            if val:
                return int(float(val))
        except Exception:
            continue

    # 3. Mobile API struct
    try:
        struct = post._iphone_struct
        for key in ("video_duration", "duration"):
            val = struct.get(key)
            if val:
                return int(float(val))
    except Exception:
        pass

    return 0


def _fetch_metadata(url: str, shortcode: str) -> dict:
    """
    Scrape Instagram post metadata using instaloader.

    Implements progressive login credentials from the environment:
    - Checks for INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD.
    - If present, logs in before fetching.
    - If not present, proceeds with public scraping (progressive enhancement).

    Strictly uses post.owner_profile.followers for creator's subscriber count.

    Raises RuntimeError with friendly clean messages on exceptions so raw
    instaloader exceptions never bubble up to the API response.
    """
    # Build an authenticated loader (saved session preferred, password fallback,
    # anonymous as last resort). Never raises.
    loader = _get_authenticated_loader()

    try:
        logger.info("Scraping metadata for Instagram shortcode: %s", shortcode)
        post = instaloader.Post.from_shortcode(loader.context, shortcode)

        # Extract counts
        views = _extract_view_count(post)
        likes = post.likes or 0
        comments = post.comments or 0

        # Creator handle and followers count
        creator = post.owner_username or "Unknown"
        subscriber_count = 0
        try:
            # Mandated by rules: post.owner_profile.followers
            subscriber_count = post.owner_profile.followers
        except Exception as follower_exc:
            logger.warning("Could not fetch owner followers count: %s", follower_exc)

        # Hashtags
        tags = post.caption_hashtags or []

        # Upload date & time: datetime object → "Month Day, Year" + "HH:MM"
        upload_date = "Unknown"
        upload_time = ""
        if post.date:
            upload_date = post.date.strftime("%B %d, %Y")
            upload_time = post.date.strftime("%H:%M")

        # Duration: float seconds → "minutes:seconds" + keep raw seconds
        duration_secs = _extract_duration_seconds(post)
        minutes, seconds = divmod(duration_secs, 60)
        duration = f"{minutes}:{seconds:02d}"

        # Thumbnail: fall back to post.url (direct CDN URL)
        thumbnail_url = post.url or ""

        # Caption: keep the FULL caption — it's the richest description of what
        # the post is about and becomes searchable RAG content downstream.
        caption = post.caption or ""
        title = caption[:60] + "..." if len(caption) > 60 else (caption or f"Instagram Reel {shortcode}")
        is_video = bool(getattr(post, "is_video", False))

        return {
            "title": title,
            "caption": caption,
            "is_video": is_video,
            "creator": creator,
            "subscriber_count": subscriber_count,
            "views": views,
            "likes": likes,
            "comments": comments,
            "tags": tags,
            "upload_date": upload_date,
            "upload_time": upload_time,
            "duration": duration,
            "duration_seconds": duration_secs,
            "thumbnail_url": thumbnail_url,
        }

    except LoginRequiredException as exc:
        logger.error("Instagram authentication required for %s: %s", shortcode, exc)
        raise RuntimeError(
            "This Instagram reel requires authentication. Add credentials to .env file."
        ) from exc
    except InstaloaderException as exc:
        logger.error("Instaloader error for %s: %s", shortcode, exc)
        raise RuntimeError(
            "Instagram rate limited or post unavailable. Try again in a few minutes."
        ) from exc
    except Exception as exc:
        logger.error("Unexpected instaloader error for %s: %s", shortcode, exc)
        raise RuntimeError(
            f"Failed to fetch Instagram metadata. Reason: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# Step 4, 5 & 6 — Audio Extract with yt-dlp & Transcribe with Groq Whisper
# ---------------------------------------------------------------------------

def _fetch_transcript(url: str, shortcode: str) -> str:
    """
    Extract transcript by downloading Reel audio using yt-dlp, transcribing
    with Groq Whisper, and cleaning up disk space inside a finally block.

    Timestamp segments are formatted as [minutes:seconds] to provide clean citations.

    Works WITHOUT ffmpeg: if ffmpeg is unavailable we skip the FFmpegExtractAudio
    post-processor and hand the raw audio container (m4a/webm/mp4) straight to
    Groq Whisper, which accepts all of those formats natively. This removes a
    hard system dependency that previously caused every Instagram transcription
    to silently fail.

    Returns the fallback string on transcript/network failures so metadata
    ingestion remains non-blocking.
    """
    if not os.getenv("GROQ_API_KEY"):
        logger.warning("GROQ_API_KEY is not set. Cannot run Groq transcription.")
        return "Transcript not available for this video."

    os.makedirs(TMP_DIR, exist_ok=True)
    out_template = os.path.join(TMP_DIR, f"ig_audio_{shortcode}.%(ext)s")
    downloaded_files: list = []

    ffmpeg_available = shutil.which("ffmpeg") is not None

    try:
        ydl_opts = {
            # Prefer m4a audio (small, Whisper-friendly); fall back to any audio/best.
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": out_template,
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }
        # Only convert to mp3 when ffmpeg exists; otherwise keep the raw container.
        if ffmpeg_available:
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
            }]
        else:
            logger.warning(
                "ffmpeg not found — sending raw audio container to Whisper "
                "(no conversion). Install ffmpeg for smaller uploads."
            )

        logger.info("Downloading Instagram Reel audio via yt-dlp for: %s", url)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Locate whatever file yt-dlp actually produced for this shortcode.
        for file_name in os.listdir(TMP_DIR):
            if file_name.startswith(f"ig_audio_{shortcode}") and file_name.endswith(
                (".mp3", ".m4a", ".webm", ".mp4", ".wav", ".ogg", ".opus", ".aac")
            ):
                downloaded_files.append(os.path.join(TMP_DIR, file_name))

        if not downloaded_files:
            raise FileNotFoundError(
                f"yt-dlp did not produce an audio file for shortcode {shortcode}"
            )

        # Prefer mp3/m4a if multiple variants exist.
        downloaded_files.sort(key=lambda p: (not p.endswith((".mp3", ".m4a")), len(p)))
        open_path = downloaded_files[0]

        logger.info("Submitting audio %s to Groq Whisper whisper-large-v3", open_path)
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        with open(open_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(open_path), f.read()),
                model="whisper-large-v3",
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

        # Parse segments and embed timestamps
        parts = []
        segments = getattr(transcription, "segments", [])
        if segments:
            for segment in segments:
                if hasattr(segment, "start"):
                    start = getattr(segment, "start")
                    text = getattr(segment, "text", "")
                elif isinstance(segment, dict):
                    start = segment.get("start", 0)
                    text = segment.get("text", "")
                else:
                    continue

                minutes, seconds = divmod(int(start), 60)
                timestamp = f"[{minutes}:{seconds:02d}]"
                text_clean = str(text).replace("\n", " ").strip()
                parts.append(f"{timestamp} {text_clean}")

            transcript_text = " ".join(parts)
        else:
            # Fallback to plain text if segment list is missing
            text = getattr(transcription, "text", "")
            if text:
                transcript_text = f"[0:00] {text.strip()}"
            else:
                transcript_text = "Transcript not available for this video."

        return transcript_text if transcript_text else "Transcript not available for this video."

    except Exception as exc:
        logger.error("Instagram transcription failed for %s: %s", shortcode, exc)
        return "Transcript not available for this video."

    finally:
        # Guarantee audio file cleanup to protect storage
        for path_to_clean in downloaded_files:
            if path_to_clean and os.path.exists(path_to_clean):
                try:
                    os.remove(path_to_clean)
                    logger.info("Cleaned up temporary audio file: %s", path_to_clean)
                except Exception as cleanup_exc:
                    logger.warning("Failed to remove temporary file %s: %s", path_to_clean, cleanup_exc)


# ---------------------------------------------------------------------------
# Step 7 — Engagement Rate Calculation
# ---------------------------------------------------------------------------

def _compute_engagement_rate(views: int, likes: int, comments: int) -> float:
    """
    Engagement rate = (likes + comments) / views * 100, rounded to 2 dp.
    Returns 0.0 if views == 0 to prevent ZeroDivisionError.
    """
    if views <= 0:
        return 0.0
    return round((likes + comments) / views * 100, 2)


# ---------------------------------------------------------------------------
# Step 8 — Unified Entry Point
# ---------------------------------------------------------------------------

def get_instagram_data(url: str) -> dict:
    """
    Main entry point for Instagram ingestion.

    Extracts shortcode → fetches metadata → fetches transcript → computes
    engagement rate → returns a unified dictionary tagged as Video B.

    Contract: transcript failure is non-fatal (returns fallback string).
              Metadata failure raises — comparison relies on metadata and metrics.
    """
    # 1. Extract shortcode
    shortcode = extract_shortcode(url)
    logger.info("Processing Instagram reel/post: %s  (shortcode=%s)", url, shortcode)

    # 2. Scrape metadata (raises error on rate-limit/login block)
    meta = _fetch_metadata(url, shortcode)

    # 3. Transcript fetch — only for actual videos. Photo posts/carousels have
    #    no audio track, so we skip the (pointless, slow) download attempt.
    if meta.get("is_video"):
        transcript = _fetch_transcript(url, shortcode)
    else:
        logger.info("Post %s is not a video (no audio); skipping transcription.", shortcode)
        transcript = "Transcript not available for this video."

    # 4. Engagement rate
    engagement_rate = _compute_engagement_rate(
        meta["views"], meta["likes"], meta["comments"]
    )

    # 5. Assemble and return unified dict matching YouTube's schema contract
    return {
        "video_id": "B",                   # Video B is always Instagram
        "platform": "instagram",
        "url": url,
        "title": meta["title"],
        "caption": meta.get("caption", ""),
        "transcript": transcript,
        "creator": meta["creator"],
        "subscriber_count": meta["subscriber_count"],
        "views": meta["views"],
        "likes": meta["likes"],
        "comments": meta["comments"],
        "engagement_rate": engagement_rate,
        "tags": meta["tags"],
        "upload_date": meta["upload_date"],
        "upload_time": meta["upload_time"],
        "duration": meta["duration"],
        "duration_seconds": meta["duration_seconds"],
        "thumbnail_url": meta["thumbnail_url"],
    }


# ---------------------------------------------------------------------------
# Quick smoke-test (run: python -m backend.services.instagram_service)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import json
    import sys

    logging.basicConfig(level=logging.INFO)

    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://www.instagram.com/reel/C8xK2mNLpQr/"
    print(f"\nFetching data for: {test_url}\n")

    # Local validation logic check
    mock_engagement = _compute_engagement_rate(500000, 25000, 800)
    print(f"Mathematical validation: 500,000 views, 25,000 likes, 800 comments")
    print(f"Computed engagement rate: {mock_engagement}%  (Expected: 5.16%)\n")

    try:
        result = get_instagram_data(test_url)
        # Print transcript separately (can be long)
        transcript_preview = (
            result["transcript"][:300] + "..."
            if len(result["transcript"]) > 300
            else result["transcript"]
        )
        display = {k: v for k, v in result.items() if k != "transcript"}
        display["transcript_preview"] = transcript_preview

        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
        print(json.dumps(display, indent=2, ensure_ascii=False))
        print(f"\nAll keys present: {list(result.keys())}")
    except Exception as test_exc:
        print(f"\nScraping demo failed (as expected on rate limits/network issues): {test_exc}")
        print("Note: In production or local setups, adding Instagram credentials to the .env file bypasses rate blocks.")
