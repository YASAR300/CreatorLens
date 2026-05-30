import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.videos import router as videos_router, process_videos
from routers.chat import router as chat_router
from models import VideoProcessRequest, ProcessVideosResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CreatorLens API",
    description="RAG-powered social media video analysis",
    version="1.0.0"
)

# CORS configurations - Allow Vite and Next.js frontend connections
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(videos_router, prefix="/api/videos", tags=["Videos"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])

# Backward compatibility legacy endpoint /api/ingest
@app.post("/api/ingest", response_model=ProcessVideosResponse, tags=["Videos"])
async def ingest_legacy(payload: VideoProcessRequest):
    """Legacy endpoint delegating to the processed videos handler."""
    logger.info("Delegating legacy /api/ingest request to process_videos handler")
    return await process_videos(payload)

@app.on_event("startup")
async def startup_event():
    """Warm up the HuggingFace embeddings model at server startup."""
    logger.info("FastAPI startup: Warming up embedding models...")
    # Simply importing vector_service triggers the module-level HuggingFace model load
    from services.vector_service import embeddings
    logger.info("Embedding model loaded and ready")

@app.get("/health")
def health_check():
    """Simple API status endpoint."""
    return {
        "status": "healthy",
        "model": "llama-3.1-70b-versatile",
        "vector_db": "chromadb"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
