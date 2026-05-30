import os
import re
import logging
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize local HuggingFace embeddings
logger.info("Loading HuggingFace Embeddings: all-MiniLM-L6-v2...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    cache_folder=os.path.join(settings.TEMP_DIR, "hf_cache")
)

def parse_first_timestamp(text: str) -> str:
    """Find the first timestamp in the format [MM:SS] within the text chunk."""
    match = re.search(r'\[(\d{2}):(\d{2})\]', text)
    if match:
        return f"{match.group(1)}:{match.group(2)}"
    return "00:00"

def get_chroma_client() -> Chroma:
    """Return the instantiated Chroma Vector Store."""
    return Chroma(
        collection_name="creator_lens_rag",
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_DB_DIR
    )

def store_transcript_in_db(video_id: str, transcript: str, url: str, platform: str) -> int:
    """
    Split the transcript into semantic chunks, parse timestamps, tag video_id (A/B),
    and persist to ChromaDB.
    """
    if not transcript:
        logger.warning(f"Empty transcript for {video_id} ({platform}). Skipping db storage.")
        return 0
        
    logger.info(f"Chunking and embedding transcript for {video_id} ({platform})")
    
    # Instantiate splitter (500 chars, 50 overlap)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    # Split text into chunks
    chunks = text_splitter.split_text(transcript)
    documents = []
    
    for i, chunk in enumerate(chunks):
        # Extract the timestamp from this chunk to tag it
        timestamp = parse_first_timestamp(chunk)
        
        metadata = {
            "video_id": video_id,            # "A" or "B"
            "platform": platform,            # "youtube" or "instagram"
            "source_url": url,
            "timestamp": timestamp,
            "chunk_index": i
        }
        
        doc = Document(page_content=chunk, metadata=metadata)
        documents.append(doc)
        
    logger.info(f"Created {len(documents)} chunks. Persisting to ChromaDB at {settings.CHROMA_DB_DIR}")
    
    db = get_chroma_client()
    db.add_documents(documents)
    
    # Force persistence (Chroma automatically handles this, but good practice to log confirmation)
    logger.info("Successfully persisted chunks to vector database.")
    return len(documents)

def query_vector_store(query: str, k: int = 5) -> List[Document]:
    """Retrieve top k relevant chunks from vector store."""
    logger.info(f"Querying vector store for: {query}")
    db = get_chroma_client()
    
    # Check if DB has any documents
    try:
        results = db.similarity_search(query, k=k)
        logger.info(f"Retrieved {len(results)} relevant documents from ChromaDB.")
        return results
    except Exception as e:
        logger.error(f"Error querying ChromaDB: {str(e)}")
        return []

def reset_db() -> bool:
    """Clear all documents from ChromaDB collections to allow fresh sessions."""
    try:
        logger.info("Resetting ChromaDB collection...")
        db = get_chroma_client()
        db.delete_collection()
        logger.info("ChromaDB collection successfully reset and recreated.")
        return True
    except Exception as e:
        logger.error(f"Failed to reset vector database: {str(e)}")
        return False
