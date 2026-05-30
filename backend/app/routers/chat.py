import logging
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.services.rag_chain import rag_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

@router.get("/chat")
async def chat_with_bot(query: str = Query(..., description="The user question for the chatbot")):
    """
    RAG Streaming Chatbot:
    Streams conversational response back to the client as Server-Sent Events (SSE).
    Includes source citations and text generation deltas in JSON frames.
    """
    logger.info(f"Received chat query: {query}")
    return StreamingResponse(
        rag_manager.generate_rag_stream(query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable proxy buffering (Nginx, etc.) for direct streaming
        }
    )

@router.post("/chat/reset")
async def reset_chat_session():
    """
    Reset RAG session history, cached metadata, and ChromaDB records.
    Called when a creator wishes to start fresh or compare new URLs.
    """
    logger.info("Received request to reset chat session and vector store.")
    success = rag_manager.reset()
    if success:
        return {"status": "success", "message": "Successfully cleared conversational memory and deleted ChromaDB embeddings."}
    else:
        return {"status": "error", "message": "Failed to reset session completely."}
