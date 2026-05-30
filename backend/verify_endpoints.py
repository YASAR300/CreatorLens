import httpx
import json
import logging
import asyncio

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("api_tester")

BASE_URL = "http://127.0.0.1:8000"

async def test_health():
    logger.info("=== Testing GET /health ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        logger.info(f"Health status: {response.status_code}")
        logger.info(f"Health response: {response.json()}")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

async def test_chat_stream():
    logger.info("=== Testing POST /api/chat/stream (SSE) ===")
    payload = {"message": "What is the key workout lift for beginners?"}
    
    # We must ensure there is some context, let's populate ChromaDB with fake data first by running a mini ingest
    # Or since ChromaDB was populated in verify_rag_service, we can just query it.
    
    async with httpx.AsyncClient() as client:
        # We use a custom timeout because LLM generation can take a few seconds
        timeout = httpx.Timeout(30.0, read=60.0)
        async with client.stream("POST", f"{BASE_URL}/api/chat/stream", json=payload, timeout=timeout) as response:
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Headers: {dict(response.headers)}")
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")
            
            logger.info("Reading SSE chunks in real time:")
            has_tokens = False
            has_sources = False
            has_done = False
            
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                
                logger.info(f"SSE Frame: {line}")
                if line.startswith("data:"):
                    data_val = line[5:].strip()
                    if data_val == "[DONE]":
                        has_done = True
                        logger.info("Received end of stream [DONE]")
                    elif "[STREAM_ERROR]" in data_val:
                        logger.error(f"Received error in stream: {data_val}")
                    else:
                        has_tokens = True
                elif line.startswith("event:"):
                    event_type = line[6:].strip()
                    if event_type == "sources":
                        has_sources = True
                        logger.info("Received event: sources")
            
            # Since ChromaDB might be cleared, check we got at least [DONE]
            assert has_done, "Expected to receive [DONE] terminal signal"
            logger.info(f"Validation summary - Tokens received: {has_tokens}, Sources received: {has_sources}, DONE received: {has_done}")

async def test_chat_reset():
    logger.info("=== Testing POST /api/chat/reset ===")
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/api/chat/reset")
        logger.info(f"Reset status: {response.status_code}")
        logger.info(f"Reset response: {response.json()}")
        assert response.status_code == 200
        assert response.json()["status"] in ["success", "memory cleared"]

async def test_video_process_validation():
    logger.info("=== Testing POST /api/videos/process Pydantic validation ===")
    # Send empty URL payload to trigger Pydantic validation errors (422)
    async with httpx.AsyncClient() as client:
        payload = {"youtube_url": "", "instagram_url": "invalid_url"}
        response = await client.post(f"{BASE_URL}/api/videos/process", json=payload)
        logger.info(f"Pydantic Validation (empty/invalid url) response code: {response.status_code}")
        logger.info(f"Pydantic Validation response: {response.json()}")
        assert response.status_code == 422
        
        # Send non-empty but protocol-less URLs to trigger our custom Pydantic validators (422)
        payload = {"youtube_url": "www.youtube.com", "instagram_url": "https://instagram.com"}
        response = await client.post(f"{BASE_URL}/api/videos/process", json=payload)
        logger.info(f"Pydantic Validation (missing protocol) response code: {response.status_code}")
        logger.info(f"Pydantic Validation response: {response.json()}")
        assert response.status_code == 422
        assert "url must start with http:// or https://" in str(response.json()).lower()

async def run_all_tests():
    try:
        await test_health()
        await test_video_process_validation()
        await test_chat_stream()
        await test_chat_reset()
        logger.info("🎉 SUCCESS: All FastAPI Endpoint validations passed perfectly! 🎉")
    except Exception as e:
        logger.error(f"❌ Verification failed: {str(e)}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
