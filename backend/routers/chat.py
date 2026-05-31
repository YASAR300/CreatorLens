import json
import asyncio
import logging
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse

from models import ChatRequest
from services.rag_service import ask_question, reset_memory
from services.vector_service import set_current_user, set_current_analysis
from db import User
from auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Phase 6 Endpoints (SSE Text Stream & POST Requests)
# ---------------------------------------------------------------------------

@router.post("/stream")
async def stream_chat(
    request: ChatRequest,
    analysis_id: str = Query("default", description="Which saved analysis to chat against"),
    current: User = Depends(get_current_user),
):
    """
    Phase 6 Streaming Chat Endpoint:
    Accepts ChatRequest (message) via POST and returns an SSE text stream.
    
    Format Specs:
    - Content tokens are streamed as default data frames: `data: token\n\n`
    - Citations are streamed as a named event sources: `event: sources\ndata: json_array\n\n`
    - Stream closure is signalled by: `data: [DONE]\n\n`
    """
    set_current_user(current.id)
    set_current_analysis(analysis_id)
    logger.info(f"[user={current.id} analysis={analysis_id}] stream chat: '{request.message}'")
    
    async def event_generator(message: str):
        set_current_user(current.id)         # ensure scope inside the streaming task
        set_current_analysis(analysis_id)
        queue = asyncio.Queue()
        # Schedule the ask_question coroutine concurrently in the background as a Task
        task = asyncio.create_task(ask_question(message, queue))
        
        try:
            while True:
                # Retrieve next token with 30-second timeout guard
                try:
                    token = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    logger.error("Token queue read timed out after 30 seconds.")
                    yield f"data: {json.dumps({'type': 'error', 'content': 'LLM response generation timed out.'})}\n\n"
                    break
                
                # Check for sentinel stream end
                if token == "[STREAM_END]":
                    logger.info("LLM generation stream complete. Fetching source documents...")
                    try:
                        results = await task
                        sources = results.get("source_documents", [])
                        
                        # Yield citations as named SSE sources event
                        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
                    except Exception as e:
                        logger.error(f"Error retrieving sources: {str(e)}")
                        
                    # Yield closure signal
                    yield "data: [DONE]\n\n"
                    break
                # Check for sentinel error
                elif token.startswith("[STREAM_ERROR]"):
                    err_msg = token.replace("[STREAM_ERROR]: ", "")
                    logger.error(f"Stream error encountered: {err_msg}")
                    yield f"data: {json.dumps({'type': 'error', 'content': err_msg})}\n\n"
                    break
                else:
                    # Stream tokens in real time
                    yield f"data: {token}\n\n"
        except Exception as e:
            logger.error(f"Unexpected error in event_generator stream: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            
    return StreamingResponse(
        event_generator(request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Prevents buffering on Nginx proxies
        }
    )

@router.post("/reset")
async def reset_chat(
    analysis_id: str = Query("default", description="Which analysis's memory to clear"),
    current: User = Depends(get_current_user),
):
    """Wipe the current (user, analysis) sliding-window chat memory."""
    set_current_user(current.id)
    set_current_analysis(analysis_id)
    logger.info(f"[user={current.id} analysis={analysis_id}] wiping chat memory via /reset.")
    reset_memory()
    return {"status": "memory cleared", "message": "Successfully cleared conversation memory buffer."}

# ---------------------------------------------------------------------------
# Backward Compatibility Endpoints (React / Next.js Frontend Support)
# ---------------------------------------------------------------------------

@router.get("")
async def chat_with_bot_legacy(
    query: str = Query(..., description="The user question for the chatbot"),
    analysis_id: str = Query("default", description="Which saved analysis to chat against"),
    current: User = Depends(get_current_user),
):
    """
    Legacy Frontend compatibility streaming endpoint:
    React client issues: GET /api/chat?query=...
    This endpoint parses parameters and formats tokens as specific JSON frames:
    - Citations: {"type": "citations", "citations": [...]}
    - Content: {"type": "content", "delta": "..."}
    - Closure: {"type": "done"}
    """
    set_current_user(current.id)
    set_current_analysis(analysis_id)
    logger.info(f"[user={current.id} analysis={analysis_id}] legacy GET chat query: '{query}'")
    
    async def legacy_event_generator(message: str):
        set_current_user(current.id)         # ensure scope inside the streaming task
        set_current_analysis(analysis_id)
        queue = asyncio.Queue()
        task = asyncio.create_task(ask_question(message, queue))
        
        try:
            while True:
                try:
                    token = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Streaming timeout.'})}\n\n"
                    break
                    
                if token == "[STREAM_END]":
                    results = await task
                    sources = results.get("source_documents", [])
                    
                    yield f"data: {json.dumps({'type': 'citations', 'citations': sources})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    break
                elif token.startswith("[STREAM_ERROR]"):
                    err_msg = token.replace("[STREAM_ERROR]: ", "")
                    yield f"data: {json.dumps({'type': 'error', 'content': err_msg})}\n\n"
                    break
                else:
                    yield f"data: {json.dumps({'type': 'content', 'delta': token})}\n\n"
        except Exception as e:
            logger.error(f"Unexpected legacy streaming error: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            
    return StreamingResponse(
        legacy_event_generator(query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
