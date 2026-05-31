import logging
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.videos import router as videos_router
from routers.chat import router as chat_router
from routers.auth_router import router as auth_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CreatorLens API",
    description="Multi-user RAG-powered social media video analysis (Qdrant + Postgres)",
    version="2.0.0"
)

# CORS — credentials enabled so the httpOnly auth cookie flows cross-origin.
# Only explicitly-allowed origins (local dev + the deployed frontend) may call
# the API. Add/override deployed URLs via FRONTEND_ORIGINS (comma-separated).
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://creatorlens-blush.vercel.app",
]
_extra = os.getenv("FRONTEND_ORIGINS", "")
origins += [o.strip().rstrip("/") for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)  # /api/auth/*
app.include_router(videos_router, prefix="/api/videos", tags=["Videos"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])


@app.on_event("startup")
async def startup_event():
    """
    Kick off DB init + warmup in the BACKGROUND so the event loop binds the port
    immediately (critical on slow free-tier hosts that scan for an open port).
    Nothing here blocks startup.
    """
    import asyncio

    def _warmup():
        try:
            from db import init_db
            init_db()
        except Exception as exc:
            logger.error("DB init failed: %s", exc)
        try:
            from services.vector_service import embeddings  # noqa: F401
            logger.info("Warmup complete (DB + embeddings ready).")
        except Exception as exc:
            logger.error("Warmup failed: %s", exc)

    logger.info("FastAPI startup: scheduling background warmup...")
    asyncio.get_event_loop().run_in_executor(None, _warmup)


@app.get("/health")
def health_check():
    """Simple API status endpoint."""
    return {
        "status": "healthy",
        "model": "llama-3.3-70b-versatile",
        "vector_db": "qdrant",
        "database": "postgres",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
