import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Compute absolute path for ChromaDB persist directory
# Path(__file__).parent is backend/services
# Path(__file__).parent.parent is backend
DB_DIR = str(Path(__file__).parent.parent / "chroma_db")
logger.info(f"VectorService absolute ChromaDB directory configured at: {DB_DIR}")

# 2. Initialize stateless RecursiveCharacterTextSplitter globally
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""]
)

# 3. Initialize global HuggingFaceEmbeddings model (loaded once at module import)
logger.info("Loading HuggingFace Embeddings: all-MiniLM-L6-v2...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

# 4. Initialize global Chroma instance (persists connection globally)
chroma_db = Chroma(
    collection_name="creator_lens_transcripts",
    persist_directory=DB_DIR,
    embedding_function=embeddings
)

def parse_first_timestamp(text: str) -> str:
    """Find the first timestamp in the format [M:SS] or [MM:SS] within the text chunk and normalize to MM:SS."""
    match = re.search(r'\[(\d+):(\d{2})\]', text)
    if match:
        return f"{int(match.group(1)):02d}:{match.group(2)}"
    return "00:00"

def process_and_store(video_data: dict) -> int:
    """
    Split the transcript into semantic chunks (500 chars, 50 overlap), 
    tag chunks with denormalized metadata, assign unique IDs, and persist in ChromaDB.
    
    If transcript is unavailable, creates a single synthetic fallback document.
    """
    video_id = video_data.get("video_id", "A")
    platform = video_data.get("platform", "youtube")
    creator = video_data.get("creator", "Unknown")
    
    logger.info(f"Processing and storing transcript for Video {video_id} ({platform}) by {creator}")
    
    transcript = video_data.get("transcript", "")
    
    # Check if transcript is missing or explicitly unavailable
    if transcript == "Transcript not available for this video." or not transcript.strip():
        logger.warning(f"No transcript available for Video {video_id}. Creating metadata-only synthetic chunk.")
        chunk_texts = ["No transcript available. Metadata only."]
        
        metadata = {
            "video_id": video_id,
            "platform": platform,
            "creator": creator,
            "chunk_index": 0,
            "views": int(video_data.get("views", 0)),
            "likes": int(video_data.get("likes", 0)),
            "comments": int(video_data.get("comments", 0)),
            "engagement_rate": float(video_data.get("engagement_rate", 0.0)),
            "upload_date": str(video_data.get("upload_date", "")),
            "source_url": video_data.get("url", ""),
            "timestamp": "00:00",
            "tags": ", ".join(video_data.get("tags", [])) if isinstance(video_data.get("tags"), list) else str(video_data.get("tags", ""))
        }
        chunk_metadatas = [metadata]
        chunk_ids = [f"{video_id}_0"]
    else:
        # Split normal transcript
        chunks = text_splitter.split_text(transcript)
        chunk_texts = []
        chunk_metadatas = []
        chunk_ids = []
        
        for i, chunk in enumerate(chunks):
            chunk_texts.append(chunk)
            metadata = {
                "video_id": video_id,
                "platform": platform,
                "creator": creator,
                "chunk_index": i,
                "views": int(video_data.get("views", 0)),
                "likes": int(video_data.get("likes", 0)),
                "comments": int(video_data.get("comments", 0)),
                "engagement_rate": float(video_data.get("engagement_rate", 0.0)),
                "upload_date": str(video_data.get("upload_date", "")),
                "source_url": video_data.get("url", ""),
                "timestamp": parse_first_timestamp(chunk),
                "tags": ", ".join(video_data.get("tags", [])) if isinstance(video_data.get("tags"), list) else str(video_data.get("tags", ""))
            }
            chunk_metadatas.append(metadata)
            chunk_ids.append(f"{video_id}_{i}")
            
    logger.info(f"Created {len(chunk_texts)} chunks for Video {video_id}. Storing in ChromaDB...")
    
    # Batch add chunks to ChromaDB
    chroma_db.add_texts(
        texts=chunk_texts,
        metadatas=chunk_metadatas,
        ids=chunk_ids
    )
    
    # Explicitly call persist (defensive coding to guarantee persistence)
    chroma_db.persist()
    logger.info(f"Successfully persisted {len(chunk_texts)} chunks to ChromaDB.")
    
    return len(chunk_texts)

def clear_collection():
    """
    Surgically clear the ChromaDB collection by deleting all stored document IDs.
    This preserves the global ChromaDB client instance reference in memory.
    """
    logger.info("Resetting ChromaDB collection surgically...")
    try:
        results = chroma_db.get()
        all_ids = results.get("ids", [])
        if all_ids:
            chroma_db.delete(ids=all_ids)
            logger.info(f"Surgically deleted {len(all_ids)} document IDs from ChromaDB.")
        else:
            logger.info("ChromaDB collection is already empty.")
    except Exception as e:
        logger.warning(f"Error surgically clearing ChromaDB collection: {str(e)}")

def retrieve_relevant_chunks(query: str, video_id_filter: str = None, k: int = 5) -> List[Tuple[Document, float]]:
    """
    Query the vector store for top k semantically relevant chunks.
    Allows filtering results exclusively by video_id ('A' or 'B').
    
    Returns a list of (Document, float) tuples containing the LangChain document and similarity distance score.
    """
    logger.info(f"Retrieving top {k} chunks for query: '{query}' (filter: {video_id_filter})")
    
    search_filter = {"video_id": video_id_filter} if video_id_filter else None
    
    results = chroma_db.similarity_search_with_score(
        query=query,
        k=k,
        filter=search_filter
    )
    
    logger.info(f"Retrieved {len(results)} chunks from similarity search.")
    return results
