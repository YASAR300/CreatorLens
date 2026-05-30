import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# Load .env config
load_dotenv()

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("rag_service_tester")

# Set paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from services.vector_service import clear_collection, process_and_store
    from services.rag_service import ask_question, reset_memory, conversation_memory
except ImportError as e:
    logger.error(f"Failed to import RAG / Vector modules: {str(e)}")
    sys.exit(1)

# Craft fake video data (same as verify_vector_service.py)
fake_transcript = (
    "[0:00] Hey everyone, welcome back to my channel! Today we are discussing an ultimate fitness workout routine "
    "designed specifically for beginners. You should focus on simple compound lifts like squats, deadlifts, and bench "
    "presses to build a solid physical foundation. Remember to keep proper form and consistency. "
    "[1:30] Next, let's talk about the key to muscle growth which is clean nutrition and a balanced diet. "
    "Make sure to consume enough protein, complex carbohydrates, and healthy fats while staying in a slight caloric surplus. "
    "Avoid processed sugars and empty calories. "
    "[3:15] Finally, never underestimate the power of deep sleep and complete muscle recovery. "
    "Your body releases the highest amount of growth hormone during stages of deep sleep, so target at least eight hours "
    "of high-quality, uninterrupted rest every single night to allow your muscle fibers to heal."
)

fake_video_data = {
    "video_id": "A",
    "platform": "youtube",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Beginner Fitness, Nutrition, and Sleep Strategy",
    "creator": "Coach Alex",
    "views": 500000,
    "likes": 20000,
    "comments": 1500,
    "engagement_rate": 4.30,  # (20000 + 1500) / 500000 * 100
    "upload_date": "May 30, 2026",
    "tags": ["fitness", "bodybuilding", "sleep", "diet"],
    "transcript": fake_transcript
}

async def consume_queue(queue: asyncio.Queue):
    """Drain tokens from queue and print them in real-time as they stream."""
    print("\n--- Streaming Response (Real-time) ---")
    full_answer = ""
    while True:
        token = await queue.get()
        if token == "[STREAM_END]":
            print("\n--------------------------------------")
            break
        elif token.startswith("[STREAM_ERROR]"):
            print(f"\n[Error Token Received]: {token}")
            print("\n--------------------------------------")
            break
        else:
            print(token, end="", flush=True)
            full_answer += token
    return full_answer

async def run_verification_tests():
    logger.info("Initializing vector store for RAG tests...")
    
    # 1. Clear database and process fake video data
    clear_collection()
    chunks = process_and_store(fake_video_data)
    logger.info(f"Populated ChromaDB with {chunks} chunks for Video A.")
    
    # 2. Reset conversation memory to ensure a clean slate
    reset_memory()
    
    # 3. Create an asyncio queue for the stream
    queue = asyncio.Queue()
    
    # 4. Invoke ask_question with our first test question (fusing views/likes/engagement)
    user_query = "What is the engagement rate and creator name of Video A?"
    logger.info(f"=== Check 1: Querying: '{user_query}' ===")
    
    # Run ask_question concurrently
    ask_task = asyncio.create_task(ask_question(user_query, queue))
    
    # Read tokens as they arrive
    full_text = await consume_queue(queue)
    
    # Wait for the task to finish to get document outputs
    results = await ask_task
    
    # Validate the results
    logger.info("=== Check 2: Verifying Response Factual Accuracy ===")
    logger.info(f"Formatted Source Docs length: {len(results['source_documents'])}")
    assert len(results["source_documents"]) > 0, "Expected at least 1 retrieved source document!"
    
    lower_text = full_text.lower()
    # Check if 'Alex' or 'Coach Alex' is printed
    assert "alex" in lower_text, f"Expected creator name 'Alex' in LLM response: {full_text}"
    # Check if '4.3' or '4.3%' is printed
    assert "4.3" in lower_text, f"Expected engagement rate '4.3%' in LLM response: {full_text}"
    # Check if a citation in the format [Video A, Chunk N] is printed
    assert "video a" in lower_text, f"Expected citations to Video A in LLM response: {full_text}"
    
    logger.info("Check 2 passed: Response contains exact factual numbers and citations!")

    # 5. Test Memory: Ask a follow-up question
    logger.info("=== Check 3: Querying Follow-up (Testing Memory Context) ===")
    queue_followup = asyncio.Queue()
    followup_query = "How many views did it get?"
    
    followup_task = asyncio.create_task(ask_question(followup_query, queue_followup))
    followup_text = await consume_queue(queue_followup)
    followup_results = await followup_task
    
    logger.info(f"Follow-up answer text: {followup_text}")
    assert "500,000" in followup_text or "500000" in followup_text, \
        f"Expected views '500,000' in memory follow-up response, got: {followup_text}"
    logger.info("Check 3 passed: Memory retention works perfectly!")

    # 6. Test Memory Reset: clear and verify the memory state is empty
    logger.info("=== Check 4: Querying After Memory Reset ===")
    
    # Check that memory has turns before reset
    pre_reset_history = conversation_memory.load_memory_variables({}).get("chat_history", [])
    logger.info(f"Memory turns before reset: {len(pre_reset_history)}")
    assert len(pre_reset_history) > 0, "Expected memory turns to be present before reset!"
    
    reset_memory()
    
    # Check that memory has 0 turns after reset
    post_reset_history = conversation_memory.load_memory_variables({}).get("chat_history", [])
    logger.info(f"Memory turns after reset: {len(post_reset_history)}")
    assert len(post_reset_history) == 0, f"Expected 0 memory turns after reset, but got {len(post_reset_history)}!"
    logger.info("Check 4 passed: Memory successfully cleared!")

    # 7. Final Clean-up
    clear_collection()
    reset_memory()
    logger.info("🎉 SUCCESS: All 4 Phase 5 RAG Service verification checks passed perfectly! 🎉")

if __name__ == "__main__":
    asyncio.run(run_verification_tests())
