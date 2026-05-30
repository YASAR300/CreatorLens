"""
YouTube Data Service — Phase 2
================================
Responsible for: video ID extraction, transcript fetching with timestamps,
metadata scraping via yt-dlp, engagement rate calculation.

Output: a single clean dict that the vector store and RAG chain consume.
Every key name here is a contract — downstream code references them directly.
"""

import logging
from datetime import datetime
from urllib.parse import urlparse, parse_qs

import yt_dlp
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Step 1 — Video ID Extraction
# ---------------------------------------------------------------------------

def extract_video_id(url: str) -> str:
    """
    Pull the 11-character video ID from a YouTube URL.

    Handles two formats:
      - Long:  https://www.youtube.com/watch?v=dQw4w9WgXcQ
      - Short: https://youtu.be/dQw4w9WgXcQ

    Uses urllib.parse — no fragile regex, safe against extra params like &t=30s.
    Raises ValueError if neither format matches, so the router can return 400.
    """
    parsed = urlparse(url)

    # Long format: youtube.com/watch?v=VIDEO_ID
    if "youtube.com" in parsed.netloc:
        params = parse_qs(parsed.query)
        if "v" in params and params["v"]:
            return params["v"][0]

    # Short format: youtu.be/VIDEO_ID
    if "youtu.be" in parsed.netloc:
        video_id = parsed.path.lstrip("/")
        # Strip any trailing query path segments e.g. /dQw4w9WgXcQ?si=abc
        video_id = video_id.split("?")[0].split("/")[0]
        if video_id:
            return video_id

    raise ValueError(
        f"Invalid YouTube URL format: '{url}'. "
        "Expected https://www.youtube.com/watch?v=... or https://youtu.be/..."
    )


# ---------------------------------------------------------------------------
# Step 2 — Transcript Fetch
# ---------------------------------------------------------------------------

def _fetch_transcript(video_id: str) -> str:
    """
    Fetch the video transcript with embedded timestamps for citation quality.

    Returns a string formatted as:
        "[0:05] Hello and welcome  [0:12] Today we talk about ..."

    Preserving timestamps means that when ChromaDB later chunks this text and
    the RAG chain cites a chunk, the chunk itself already contains the offset
    into the video — the frontend can link directly to that moment.

    NOTE: youtube-transcript-api v1.x switched to an instance-based API.
    - YouTubeTranscriptApi() must be instantiated first.
    - api.fetch(video_id) replaces the old class-method get_transcript().
    - Each snippet exposes .text / .start / .duration as attributes, not dict keys.

    Returns a fallback string (not an exception) on TranscriptsDisabled /
    NoTranscriptFound so the ingestion pipeline stays alive for metadata-only runs.
    """
    try:
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id)        # returns FetchedTranscript (iterable)
        snippets = list(fetched)

        logger.info(
            "Fetched %d transcript segments for video %s", len(snippets), video_id
        )

        parts = []
        for snip in snippets:
            start_sec = int(snip.start)
            minutes, seconds = divmod(start_sec, 60)
            timestamp = f"[{minutes}:{seconds:02d}]"
            text = snip.text.replace("\n", " ").strip()
            parts.append(f"{timestamp} {text}")

        return " ".join(parts)

    except TranscriptsDisabled:
        logger.warning("Captions are disabled for video %s", video_id)
        return "Transcript not available for this video."
    except NoTranscriptFound:
        logger.warning("No transcript found for video %s", video_id)
        return "Transcript not available for this video."
    except Exception as exc:
        logger.error("Unexpected transcript error for %s: %s", video_id, exc)
        return "Transcript not available for this video."


# ---------------------------------------------------------------------------
# Step 3 — Metadata Fetch via yt-dlp
# ---------------------------------------------------------------------------

def _fetch_metadata(url: str, video_id: str) -> dict:
    """
    Extract video metadata using yt-dlp's extract_info (no download).

    yt-dlp returns a large dict (50–100 keys). We cherry-pick only what the
    RAG pipeline needs: counts, creator identity, tags, date, duration.
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    # --- Core counts ---
    views = info.get("view_count") or 0
    likes = info.get("like_count") or 0
    # comment_count can be None when creator disables comments
    comments = info.get("comment_count") or 0

    # --- Creator identity ---
    creator = info.get("uploader") or info.get("channel") or "Unknown"
    subscriber_count = (
        info.get("channel_follower_count")
        or info.get("subscriber_count")
        or 0
    )

    # --- Tags ---
    tags = info.get("tags") or []

    # --- Upload date: "20240315" → "March 15, 2024" ---
    raw_date = info.get("upload_date", "")
    try:
        upload_date = datetime.strptime(raw_date, "%Y%m%d").strftime("%B %d, %Y")
    except (ValueError, TypeError):
        upload_date = raw_date or "Unknown"

    # --- Duration: seconds → "4:32" ---
    duration_secs = info.get("duration") or 0
    minutes, seconds = divmod(int(duration_secs), 60)
    duration = f"{minutes}:{seconds:02d}"

    # --- Thumbnail: always available via predictable CDN URL ---
    # yt-dlp thumbnail can be low-res; maxresdefault is highest quality
    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

    title = info.get("title") or "Untitled"

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


# ---------------------------------------------------------------------------
# Step 4 — Engagement Rate
# ---------------------------------------------------------------------------

def _compute_engagement_rate(views: int, likes: int, comments: int) -> float:
    """
    Engagement rate = (likes + comments) / views × 100, rounded to 2 dp.
    Returns 0.0 when views == 0 to avoid ZeroDivisionError on brand-new videos.
    """
    if views <= 0:
        return 0.0
    return round((likes + comments) / views * 100, 2)


# ---------------------------------------------------------------------------
# Step 5 — Public Entry Point
# ---------------------------------------------------------------------------

def get_youtube_data(url: str) -> dict:
    """
    Main entry point consumed by the ingestion router.

    Extracts video ID → fetches transcript → fetches metadata → computes
    engagement rate → returns a unified dict tagged as Video A.

    Contract: transcript failure is recoverable (returns fallback string).
              Metadata failure raises — without it there is no engagement rate
              and the comparison is meaningless.

    Returned dict keys (downstream code references these by name):
        video_id, platform, url, title, transcript,
        creator, subscriber_count, views, likes, comments,
        engagement_rate, tags, upload_date, duration, thumbnail_url
    """
    # --- 1. Extract video ID (raises ValueError on bad URL) ---
    video_id = extract_video_id(url)
    logger.info("Processing YouTube video: %s  (id=%s)", url, video_id)

    # --- 2. Transcript (always succeeds — returns fallback on failure) ---
    transcript = _fetch_transcript(video_id)
    has_transcript = not transcript.startswith("Transcript not available")
    logger.info(
        "Transcript status for %s: %s",
        video_id,
        "loaded" if has_transcript else "unavailable",
    )

    # --- 3. Metadata (raises on failure — fatal without this) ---
    try:
        meta = _fetch_metadata(url, video_id)
    except Exception as exc:
        logger.error("Metadata extraction failed for %s: %s", url, exc)
        raise RuntimeError(
            f"Could not fetch YouTube metadata for '{url}'. "
            f"Reason: {exc}"
        ) from exc

    # --- 4. Engagement rate ---
    engagement_rate = _compute_engagement_rate(
        meta["views"], meta["likes"], meta["comments"]
    )

    # --- 5. Assemble and return unified dict ---
    return {
        "video_id": "A",                   # Video A is always YouTube
        "platform": "youtube",
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
# Quick smoke-test (run: python -m backend.services.youtube_service)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import json
    import sys

    logging.basicConfig(level=logging.INFO)

    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    print(f"\nFetching data for: {test_url}\n")

    result = get_youtube_data(test_url)
    # Print transcript separately (can be long)
    transcript_preview = result["transcript"][:300] + "..." if len(result["transcript"]) > 300 else result["transcript"]
    display = {k: v for k, v in result.items() if k != "transcript"}
    display["transcript_preview"] = transcript_preview

    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(display, indent=2, ensure_ascii=False))
    print(f"\nAll keys present: {list(result.keys())}")
