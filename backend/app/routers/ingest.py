import logging
import asyncio
from fastapi import APIRouter, HTTPException
from app.models import VideoProcessRequest, ProcessVideosResponse
from app.routers.videos import process_videos

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ingest"])

@router.post("/ingest", response_model=ProcessVideosResponse)
async def ingest_videos_legacy(payload: VideoProcessRequest):
    """
    Backward Compatibility Ingestion Endpoint:
    React client issues: POST /api/ingest
    Utilizes the same high-performance concurrent scraping and indexing pipeline.
    """
    logger.info(f"Received legacy POST ingest request: YT={payload.youtube_url}, IG={payload.instagram_url}")
    return await process_videos(payload)
