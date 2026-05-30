import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.youtube_service import get_youtube_data
from services.instagram_service import get_instagram_data
from app.services.vector_store import store_transcript_in_db
from app.services.rag_chain import rag_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ingest"])

class IngestRequest(BaseModel):
    youtube_url: str
    instagram_url: str

class IngestResponse(BaseModel):
    video_a: dict
    video_b: dict
    message: str

@router.post("/ingest", response_model=IngestResponse)
async def ingest_videos(payload: IngestRequest):
    """
    Ingestion Pipeline:
    1. Parse YouTube & Instagram Reel URLs.
    2. Extract stats (views, likes, comments, author) and calculate Engagement Rates.
    3. Generate transcripts (YouTube transcript API -> Whisper fallback; Instagram -> Groq Whisper).
    4. Chunk transcripts and store in ChromaDB with 'A' and 'B' tags.
    5. Save metadata into the active RAG manager session.
    """
    logger.info(f"Received ingestion request. YT: {payload.youtube_url}, IG: {payload.instagram_url}")
    
    try:
        # Step 1: Scrape YouTube metadata & transcript
        logger.info("Processing YouTube Video A...")
        meta_a = get_youtube_data(payload.youtube_url)
            
        # Step 2: Scrape Instagram Reels metadata & transcript
        logger.info("Processing Instagram Reel Video B...")
        meta_b = get_instagram_data(payload.instagram_url)
        
        # Backwards compatibility mappings for RAG and Frontend
        meta_a["follower_count"] = meta_a.get("subscriber_count", 0)
        meta_a["hashtags"] = meta_a.get("tags", [])
        meta_a["thumbnail"] = meta_a.get("thumbnail_url", "")
        
        meta_b["follower_count"] = meta_b.get("subscriber_count", 0)
        meta_b["hashtags"] = meta_b.get("tags", [])
        meta_b["thumbnail"] = meta_b.get("thumbnail_url", "")

        # Step 3: Clear any existing database/memory before storing new URLs
        logger.info("Resetting existing RAG database & session memory for fresh ingestion...")
        rag_manager.reset()

        # Step 4: Index transcripts into ChromaDB
        logger.info("Indexing transcripts into ChromaDB...")
        chunks_a = store_transcript_in_db("A", meta_a["transcript"], payload.youtube_url, "youtube")
        chunks_b = store_transcript_in_db("B", meta_b["transcript"], payload.instagram_url, "instagram")
        
        logger.info(f"Persisted {chunks_a} chunks for Video A and {chunks_b} chunks for Video B.")

        # Step 5: Save metadata in RAG manager session
        rag_manager.set_video_metadata(meta_a, meta_b)

        return IngestResponse(
            video_a=meta_a,
            video_b=meta_b,
            message="Successfully ingested both videos, generated transcripts, and loaded ChromaDB."
        )

    except Exception as e:
        logger.error(f"Ingestion failed with error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest videos: {str(e)}"
        )
