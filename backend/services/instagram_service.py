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
import logging
from datetime import datetime
import tempfile
import instaloader
from instaloader.exceptions import InstaloaderException, LoginRequiredException
import yt_dlp
from groq import Groq

logger = logging.getLogger(__name__)


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
    loader = instaloader.Instaloader()
    loader.dirname_pattern = "tmp"

    # Progressive login check
    username = os.getenv("INSTAGRAM_USERNAME")
    password = os.getenv("INSTAGRAM_PASSWORD")

    if username and password:
        logger.info("Logging in to Instagram as user: %s", username)
        try:
            loader.login(username, password)
        except Exception as login_exc:
            logger.warning("Instagram login failed: %s. Proceeding anonymously.", login_exc)

    try:
        logger.info("Scraping metadata for Instagram shortcode: %s", shortcode)
        post = instaloader.Post.from_shortcode(loader.context, shortcode)

        # Extract counts
        views = post.video_view_count or 0
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

        # Upload date: datetime object → "Month Day, Year"
        upload_date = "Unknown"
        if post.date:
            upload_date = post.date.strftime("%B %d, %Y")

        # Duration: float → "minutes:seconds"
        duration_secs = post.video_duration or 0.0
        minutes, seconds = divmod(int(duration_secs), 60)
        duration = f"{minutes}:{seconds:02d}"

        # Thumbnail: fall back to post.url (direct CDN URL)
        thumbnail_url = post.url or ""

        # Title: first 60 characters of caption, or default
        caption = post.caption or ""
        title = caption[:60] + "..." if len(caption) > 60 else (caption or f"Instagram Reel {shortcode}")

        return {
            "title": title,
            "creator": creator,
            "subscriber_count": subscriber_count,
            "views": views,
            "likes": likes,
            "comments": comments,
            "tags": tags,
            "upload_date": upload_date,
            "duration": duration,
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

    Returns the fallback string on transcript/network failures so metadata
    ingestion remains non-blocking.
    """
    if not os.getenv("GROQ_API_KEY"):
        logger.warning("GROQ_API_KEY is not set. Cannot run Groq transcription.")
        return "Transcript not available for this video."

    audio_path = f"/tmp/instagram_audio_{shortcode}.mp3"
    normalized_path = os.path.normpath(audio_path)

    try:
        # Ensure /tmp directory exists on Windows/Unix
        try:
            os.makedirs("/tmp", exist_ok=True)
        except Exception:
            pass

        # Configure yt-dlp for high-quality audio extraction via FFmpeg
        ydl_opts = {
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
            }],
            "outtmpl": "/tmp/instagram_audio_%(id)s.%(ext)s",
            "quiet": True,
            "no_warnings": True,
        }

        logger.info("Downloading Instagram Reel audio stream using yt-dlp for URL: %s", url)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Resolve paths for both Windows and Unix environments
        if not os.path.exists(normalized_path) and not os.path.exists(audio_path):
            tmp_dir = "/tmp"
            if os.path.exists(tmp_dir):
                for file_name in os.listdir(tmp_dir):
                    if shortcode in file_name and file_name.endswith(".mp3"):
                        audio_path = os.path.join(tmp_dir, file_name)
                        normalized_path = os.path.normpath(audio_path)
                        break

        open_path = normalized_path if os.path.exists(normalized_path) else audio_path
        if not os.path.exists(open_path):
            raise FileNotFoundError(f"Could not find downloaded audio file at {open_path}")

        # Transcribe audio using Groq Whisper API
        logger.info("Submitting audio %s to Groq Whisper whisper-large-v3", open_path)
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        with open(open_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(f"instagram_audio_{shortcode}.mp3", f),
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
        for path_to_clean in [audio_path, normalized_path]:
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

    # 3. Transcript fetch (non-fatal, falls back safely)
    transcript = _fetch_transcript(url, shortcode)

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
        "transcript": transcript,
        "creator": meta["creator"],
        "subscriber_count": meta["subscriber_count"],
        "views": meta["views"],
        "likes": meta["likes"],
        "comments": meta["comments"],
        "engagement_rate": engagement_rate,
        "tags": meta["tags"],
        "upload_date": meta["upload_date"],
        "duration": meta["duration"],
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
