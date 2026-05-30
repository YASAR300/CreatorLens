import os
import sys
import logging

# Configure basic logging to see details
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("vector_service_tester")

# Set paths so we can import from services directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from services.vector_service import (
        clear_collection,
        process_and_store,
        retrieve_relevant_chunks
    )
except ImportError as e:
    logger.error(f"Failed to import from services.vector_service: {str(e)}")
    sys.exit(1)

def run_tests():
    logger.info("Starting Phase 4 Vector Service Verification Sequence...")

    # --- Step 1: Clear the collection ---
    logger.info("=== Check 1: Clearing Collection ===")
    clear_collection()
    logger.info("Collection cleared successfully.")

    # --- Step 2: Ingest fake video data with distinct paragraphs ---
    logger.info("=== Check 2: Storing Video Data ===")
    # 150+ words transcript divided into Fitness, Nutrition, and Sleep
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
        "engagement_rate": 4.30,  # calculated as: (20000 + 1500) / 500000 * 100
        "upload_date": "May 30, 2026",
        "tags": ["fitness", "bodybuilding", "sleep", "diet"],
        "transcript": fake_transcript
    }

    chunks_stored = process_and_store(fake_video_data)
    logger.info(f"Chunks stored: {chunks_stored}")
    assert chunks_stored >= 2, f"Expected 2 or more chunks, but got {chunks_stored}"
    logger.info("Check 2 passed: Successfully chunked and stored fake video!")

    # --- Step 3: Retrieve without filters ---
    logger.info("=== Check 3: Querying Without Filters ===")
    query = "fitness workout routine"
    results = retrieve_relevant_chunks(query, video_id_filter=None, k=3)
    
    logger.info(f"Query results for '{query}':")
    for idx, (doc, score) in enumerate(results):
        logger.info(f"Rank {idx+1}: [Score: {score:.4f}] - {doc.page_content[:150]}...")
        
    assert len(results) > 0, "No chunks retrieved!"
    # The first document should contain 'fitness' or 'workout' or 'beginners'
    first_doc_content = results[0][0].page_content.lower()
    assert "fitness" in first_doc_content or "workout" in first_doc_content or "beginners" in first_doc_content, \
        "First result did not seem relevant to fitness!"
    logger.info("Check 3 passed: Retrieval results returned and rank 1 is highly relevant!")

    # --- Step 4: Retrieve with Video A filter ---
    logger.info("=== Check 4: Querying With Filter A ===")
    results_a = retrieve_relevant_chunks(query, video_id_filter="A", k=3)
    logger.info(f"Retrieved {len(results_a)} chunks for Video A filter.")
    assert len(results_a) == len(results), "Expected identical results when filtering for the only present video (A)!"
    logger.info("Check 4 passed: Filter A works correctly.")

    # --- Step 5: Retrieve with Video B filter (should be empty) ---
    logger.info("=== Check 5: Querying With Filter B ===")
    results_b = retrieve_relevant_chunks(query, video_id_filter="B", k=3)
    logger.info(f"Retrieved {len(results_b)} chunks for Video B filter.")
    assert len(results_b) == 0, f"Expected 0 chunks for Video B filter, but retrieved {len(results_b)}!"
    logger.info("Check 5 passed: Filter B returned empty as expected.")

    # --- Step 6: Verify metadata tagging and denormalization ---
    logger.info("=== Check 6: Verifying Metadata Tagging ===")
    target_doc = results[0][0]
    meta = target_doc.metadata
    logger.info(f"Full Metadata dict: {meta}")
    
    assert meta.get("video_id") == "A", f"Expected video_id 'A', got {meta.get('video_id')}"
    assert meta.get("creator") == "Coach Alex", f"Expected creator 'Coach Alex', got {meta.get('creator')}"
    assert meta.get("engagement_rate") == 4.30, f"Expected engagement_rate 4.30, got {meta.get('engagement_rate')}"
    assert "chunk_index" in meta, "Expected chunk_index key in metadata"
    assert "timestamp" in meta, "Expected timestamp key in metadata"
    
    logger.info(f"Metadata check fields validated perfectly. First chunk timestamp is: {meta.get('timestamp')}")
    logger.info("Check 6 passed: Metadata tagging validated successfully.")

    # --- Step 7: Clear collection and verify final state is empty ---
    logger.info("=== Check 7: Clearing and Querying Again ===")
    clear_collection()
    final_results = retrieve_relevant_chunks(query, video_id_filter=None, k=3)
    logger.info(f"Final retrieved chunks after clearing: {len(final_results)}")
    assert len(final_results) == 0, f"Expected 0 chunks after clearing collection, but got {len(final_results)}"
    logger.info("Check 7 passed: Collection cleared cleanly.")

    logger.info("🎉 SUCCESS: All 7 Vector Service verification checks passed perfectly! 🎉")

if __name__ == "__main__":
    run_tests()
