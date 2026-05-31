import logging
import asyncio
import uuid
import httpx
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from instaloader.exceptions import InstaloaderException
from sqlalchemy.orm import Session

from models import VideoProcessRequest, ProcessVideosResponse, VideoMetadata, AnalysisSummary
from services.youtube_service import get_youtube_data, extract_video_id
from services.instagram_service import get_instagram_data
from services.vector_service import clear_collection, process_and_store, set_current_user, set_current_analysis
from services.rag_service import set_video_metadata, reset_memory
from db import get_db, User, Analysis
from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def _meta_for_rag(data: dict) -> dict:
    """Shape scraped video data into the metadata dict the RAG prompt expects."""
    return {
        "creator": data.get("creator", "Unknown"),
        "follower_count": int(data.get("subscriber_count", 0)),
        "views": int(data.get("views", 0)),
        "likes": int(data.get("likes", 0)),
        "comments": int(data.get("comments", 0)),
        "engagement_rate": float(data.get("engagement_rate", 0.0)),
        "duration": data.get("duration", 0),
        "upload_date": str(data.get("upload_date", "Unknown")),
        "upload_time": str(data.get("upload_time", "")),
        "hashtags": data.get("tags", []),
    }


def _card_to_rag_meta(card: dict) -> dict:
    """Rebuild RAG metadata from a saved VideoMetadata card (for loading history)."""
    return {
        "creator": card.get("creator", "Unknown"),
        "follower_count": int(card.get("follower_count", 0)),
        "views": int(card.get("views", 0)),
        "likes": int(card.get("likes", 0)),
        "comments": int(card.get("comments", 0)),
        "engagement_rate": float(card.get("engagement_rate", 0.0)),
        "duration": card.get("duration", 0),
        "upload_date": str(card.get("upload_date", "Unknown")),
        "upload_time": str(card.get("upload_time", "")),
        "hashtags": card.get("hashtags", []),
    }


@router.get("/thumbnail-proxy")
async def thumbnail_proxy(url: str = Query(..., description="CDN image URL to proxy")):
    """
    Server-side image proxy for Instagram CDN thumbnails.
    Instagram blocks cross-origin <img> loads from browsers, but fetching
    from the server has no such restriction. Streams the image bytes back
    with the correct Content-Type header.
    """
    if not url or not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid image URL.")
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg")
            return StreamingResponse(
                iter([resp.content]),
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=3600"},
            )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch thumbnail from CDN.")
    except Exception as e:
        logger.error(f"Thumbnail proxy error: {e}")
        raise HTTPException(status_code=502, detail="Could not retrieve thumbnail image.")


@router.get("/history", response_model=list[AnalysisSummary])
def analysis_history(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the current user's saved analyses, most recent first."""
    rows = (
        db.query(Analysis)
        .filter(Analysis.user_id == current.id)
        .order_by(Analysis.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        AnalysisSummary(
            id=r.id, youtube_url=r.youtube_url, instagram_url=r.instagram_url,
            video_a=r.video_a or {}, video_b=r.video_b or {},
            chunks_stored=r.chunks_stored, created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/load/{analysis_id}", response_model=AnalysisSummary)
def load_analysis(analysis_id: str, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Re-open a saved analysis: re-hydrate its RAG metadata and reset its chat
    memory so the user can immediately chat against it. The vectors for this
    analysis already live in Qdrant (tagged with analysis_id), so retrieval works.
    """
    row = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == current.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    set_current_user(current.id)
    set_current_analysis(row.id)
    # Rebuild the metadata block the LLM uses, from the saved cards.
    set_video_metadata(_card_to_rag_meta(row.video_a or {}), _card_to_rag_meta(row.video_b or {}))
    reset_memory()  # fresh chat for the reopened analysis
    logger.info("[user=%s] loaded analysis %s", current.id, row.id)

    return AnalysisSummary(
        id=row.id, youtube_url=row.youtube_url, instagram_url=row.instagram_url,
        video_a=row.video_a or {}, video_b=row.video_b or {},
        chunks_stored=row.chunks_stored, created_at=row.created_at.isoformat(),
    )


@router.post("/process", response_model=ProcessVideosResponse)
async def process_videos(
    request: VideoProcessRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ingestion Pipeline Endpoint (per-user):
    1. Parse and validate YouTube & Instagram Reel URLs.
    2. Extract metadata and transcripts concurrently (run_in_executor).
    3. Timeout protection (120s) for slow Instagram transcriptions.
    4. Clear the current user's old vectors in Qdrant.
    5. Chunk, embed, store both transcripts (tagged with user_id), save the analysis.
    """
    # Scope every vector/memory operation in this request to the authenticated
    # user AND a fresh analysis id (so prior comparisons stay queryable in Qdrant).
    analysis_id = str(uuid.uuid4())
    set_current_user(current.id)
    set_current_analysis(analysis_id)
    logger.info(f"[user={current.id} analysis={analysis_id}] processing YT={request.youtube_url}, IG={request.instagram_url}")
    
    try:
        # Extract YouTube Video ID upfront to raise 400 on invalid formats
        try:
            youtube_video_id = extract_video_id(request.youtube_url)
        except ValueError as val_err:
            raise HTTPException(status_code=400, detail=str(val_err))
            
        loop = asyncio.get_event_loop()
        
        # 1. Prepare concurrent scraping tasks running in thread pool executor
        yt_task = loop.run_in_executor(None, get_youtube_data, request.youtube_url)
        ig_task = loop.run_in_executor(None, get_instagram_data, request.instagram_url)
        
        # 2. Execute concurrently with a 120-second timeout guard
        logger.info("Executing YouTube and Instagram scrapers concurrently...")
        try:
            yt_data, ig_data = await asyncio.wait_for(
                asyncio.gather(yt_task, ig_task),
                timeout=120.0
            )
        except asyncio.TimeoutError:
            logger.error("Scraping and transcription pipeline timed out after 120 seconds.")
            raise HTTPException(
                status_code=504,
                detail="Video processing timed out. Instagram transcription may be slow. Please try again."
            )
            
        logger.info("Concurrency scraper completed successfully. Storing vectors in Qdrant...")

        # 3. (No global wipe.) Vectors are tagged with this fresh analysis_id, so
        #    previous analyses remain intact and queryable.
        # 4. Process and store Video A (YouTube) and Video B (Instagram)
        chunks_a = process_and_store(yt_data)
        chunks_b = process_and_store(ig_data)
        
        # Construct predictable, validated response models
        video_a_meta = VideoMetadata(
            video_id="A",
            platform="youtube",
            creator=yt_data.get("creator", "Unknown"),
            views=int(yt_data.get("views", 0)),
            likes=int(yt_data.get("likes", 0)),
            comments=int(yt_data.get("comments", 0)),
            engagement_rate=float(yt_data.get("engagement_rate", 0.0)),
            follower_count=int(yt_data.get("subscriber_count", 0)),
            hashtags=yt_data.get("tags", []),
            duration=str(yt_data.get("duration", "0:00")),
            thumbnail_url=f"https://img.youtube.com/vi/{youtube_video_id}/maxresdefault.jpg",
            upload_date=str(yt_data.get("upload_date", "Unknown")),
            upload_time=str(yt_data.get("upload_time", "")),
            chunks_stored=chunks_a
        )
        
        video_b_meta = VideoMetadata(
            video_id="B",
            platform="instagram",
            creator=ig_data.get("creator", "Unknown"),
            views=int(ig_data.get("views", 0)),
            likes=int(ig_data.get("likes", 0)),
            comments=int(ig_data.get("comments", 0)),
            engagement_rate=float(ig_data.get("engagement_rate", 0.0)),
            follower_count=int(ig_data.get("subscriber_count", 0)),
            hashtags=ig_data.get("tags", []),
            duration=str(ig_data.get("duration", "0:00")),
            thumbnail_url=ig_data.get("thumbnail_url") or "",
            upload_date=str(ig_data.get("upload_date", "Unknown")),
            upload_time=str(ig_data.get("upload_time", "")),
            chunks_stored=chunks_b
        )
        
        logger.info(f"Ingestion successful! Stored A={chunks_a} chunks, B={chunks_b} chunks.")

        # Persist this analysis (with our generated id) for the user's history.
        try:
            db.add(Analysis(
                id=analysis_id,
                user_id=current.id,
                youtube_url=request.youtube_url,
                instagram_url=request.instagram_url,
                video_a=video_a_meta.model_dump(),
                video_b=video_b_meta.model_dump(),
                chunks_stored=chunks_a + chunks_b,
            ))
            db.commit()
        except Exception as save_exc:
            db.rollback()
            logger.warning("Could not save analysis history: %s", save_exc)

        # Inject metadata into the RAG system prompt for this analysis scope.
        set_video_metadata(meta_a=_meta_for_rag(yt_data), meta_b=_meta_for_rag(ig_data))

        return ProcessVideosResponse(
            analysis_id=analysis_id,
            video_a=video_a_meta,
            video_b=video_b_meta
        )
    
    except HTTPException as http_ex:
        # Re-raise explicit HTTPExceptions
        raise http_ex
    except ValueError as val_err:
        logger.error(f"Validation error: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except InstaloaderException as inst_ex:
        logger.error(f"Instaloader exception: {str(inst_ex)}")
        raise HTTPException(
            status_code=503,
            detail="Instagram scraping service is temporarily unavailable due to rate limits. Please try again later."
        )
    except Exception as e:
        logger.error(f"Unexpected error in process_videos endpoint: {str(e)}", exc_info=True)
        # Handle instaloader/instagram scrapers exceptions or unexpected service errors
        error_msg = str(e)
        if "rate limit" in error_msg.lower() or "forbidden" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Instagram scraping service is temporarily unavailable due to rate limits. Please try again later."
            )
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal error occurred during video processing."
        )
