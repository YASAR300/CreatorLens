import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ingest, chat

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CreatorLens RAG API",
    description="Backend service for CreatorLens: Ingest YouTube and Instagram Reels, perform Whisper audio transcription, Chroma DB indexing, and LangChain Groq RAG.",
    version="1.0.0"
)

# CORS configurations - Allow Next.js frontend connections
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(ingest.router)
app.include_router(chat.router)

@app.get("/")
def health_check():
    """Simple API status endpoint."""
    return {
        "status": "healthy",
        "app": "CreatorLens RAG API",
        "version": "1.0.0",
        "environment": settings.ENV
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting CreatorLens server at {settings.HOST}:{settings.PORT} in {settings.ENV} mode...")
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
