import logging
import asyncio
from fastapi import APIRouter, HTTPException
from app.models import VideoProcessRequest, ProcessVideosResponse, VideoMetadata
from services.youtube_service import get_youtube_data, extract_video_id
from services.instagram_service import get_instagram_data
from services.vector_service import clear_collection, process_and_store

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/process", response_model=ProcessVideosResponse)
async def process_videos(request: VideoProcessRequest):
    """
    Ingestion Pipeline Endpoint:
    1. Parse YouTube & Instagram Reel URLs.
    2. Extract stats concurrently via a thread pool (run_in_executor) to prevent blocking.
    3. Impose timeout protection (120 seconds) for slow Instagram transcriptions.
    4. Clear old ChromaDB collection surgically to keep the persistent connection.
    5. Chunk, embed, and store both transcripts, returning metadata and chunks stored count.
    """
    logger.info(f"Received video processing request: YT={request.youtube_url}, IG={request.instagram_url}")
    
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
                detail="Video processing timed out. Instagram scraping or transcription took too long. Please try again."
            )
            
        logger.info("Concurrency scraper completed successfully. Storing in ChromaDB...")
        
        # 3. Reset existing database surgically (preserves reference in rag_service)
        clear_collection()
        
        # 4. Process and store Video A (YouTube)
        chunks_a = process_and_store(yt_data)
        
        # 5. Process and store Video B (Instagram)
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
            chunks_stored=chunks_b
        )
        
        logger.info(f"Ingestion successful! Stored A={chunks_a} chunks, B={chunks_b} chunks.")
        
        return ProcessVideosResponse(
            video_a=video_a_meta,
            video_b=video_b_meta
        )
        
    except HTTPException as http_ex:
        # Re-raise explicit HTTPExceptions
        raise http_ex
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
            detail=f"An unexpected internal error occurred during video processing: {error_msg}"
        )
