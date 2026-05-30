import os
import asyncio
import logging
from typing import Dict, Any, List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.callbacks import BaseCallbackHandler
from app.config import settings
from services.vector_service import chroma_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback for langchain memory / chains changes across versions
try:
    from langchain.chains import ConversationalRetrievalChain
except ImportError:
    from langchain_classic.chains import ConversationalRetrievalChain

try:
    from langchain.memory import ConversationBufferWindowMemory
except ImportError:
    from langchain_classic.memory import ConversationBufferWindowMemory

# Retrieve API key dynamically from settings or environment
groq_api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY

# Component 1 — The Groq LLM Setup (Initialized globally)
# Note: Groq llama-3.1-70b-versatile is decommissioned; we use llama-3.3-70b-versatile to guarantee active API execution.
logger.info("Initializing streaming and non-streaming ChatGroq models...")
streaming_llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    temperature=0.3,  # factual consistency
    streaming=True,
    groq_api_key=groq_api_key
)

condense_llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    temperature=0.0,  # deterministic question condensation
    streaming=False,
    groq_api_key=groq_api_key
)

# Component 2 — Conversation Memory Setup (Initialized globally for persistence)
logger.info("Initializing ConversationBufferWindowMemory (k=5)...")
conversation_memory = ConversationBufferWindowMemory(
    k=5,
    memory_key="chat_history",
    return_messages=True,
    output_key="answer"
)

# Component 3 — The System Prompt
# NOTE: video_metadata_summary is injected dynamically per-request via build_system_prompt()
_BASE_SYSTEM_INSTRUCTION = (
    "You are CreatorLens, an expert social media analytics assistant helping content creators understand their video performance.\n"
    "You have access to transcripts and metadata for TWO videos:\n"
    "  - Video A = the YouTube video\n"
    "  - Video B = the Instagram Reel\n\n"
    "CRITICAL RULES:\n"
    "1. The Global Video Metadata block below contains the EXACT creator name, follower count, views, likes, comments, \n"
    "   engagement rate, upload date, and duration for BOTH videos. Always read this block first.\n"
    "2. When asked specifically about Video B, answer ONLY from Video B data. Never substitute Video A data for Video B.\n"
    "3. When asked specifically about Video A, answer ONLY from Video A data. Never substitute Video B data for Video A.\n"
    "4. Cite every factual claim: use [Video A, Metadata] or [Video B, Metadata] for stats, and [Video X, Chunk N] for transcript content.\n"
    "5. Use specific numbers. Never say 'performed better' — say exact figures with percentage-point differences.\n"
    "6. When suggesting improvements, use numbered actionable bullet points.\n"
    "7. If context is insufficient, say so explicitly rather than speculating or hallucinating numbers.\n\n"
)

def build_system_prompt(video_metadata: dict) -> str:
    """Build a system prompt that includes the full metadata summary for both videos."""
    meta_a = video_metadata.get("A", {})
    meta_b = video_metadata.get("B", {})
    
    metadata_block = (
        "=== GLOBAL VIDEO METADATA (Source of Truth) ===\n"
        f"VIDEO A (YouTube):\n"
        f"  Creator       : {meta_a.get('creator', 'N/A')}\n"
        f"  Follower Count: {meta_a.get('follower_count', 0):,}\n"
        f"  Views         : {meta_a.get('views', 0):,}\n"
        f"  Likes         : {meta_a.get('likes', 0):,}\n"
        f"  Comments      : {meta_a.get('comments', 0):,}\n"
        f"  Engagement    : {meta_a.get('engagement_rate', 0.0)}%\n"
        f"  Duration      : {meta_a.get('duration', 0)}s\n"
        f"  Upload Date   : {meta_a.get('upload_date', 'N/A')}\n"
        f"  Hashtags      : {', '.join(meta_a.get('hashtags', [])) or 'None'}\n"
        f"\nVIDEO B (Instagram Reel):\n"
        f"  Creator       : {meta_b.get('creator', 'N/A')}\n"
        f"  Follower Count: {meta_b.get('follower_count', 0):,}\n"
        f"  Views         : {meta_b.get('views', 0):,}\n"
        f"  Likes         : {meta_b.get('likes', 0):,}\n"
        f"  Comments      : {meta_b.get('comments', 0):,}\n"
        f"  Engagement    : {meta_b.get('engagement_rate', 0.0)}%\n"
        f"  Duration      : {meta_b.get('duration', 0)}s\n"
        f"  Upload Date   : {meta_b.get('upload_date', 'N/A')}\n"
        f"  Hashtags      : {', '.join(meta_b.get('hashtags', [])) or 'None'}\n"
        "==============================================\n\n"
    )
    return _BASE_SYSTEM_INSTRUCTION + metadata_block

human_message_template = (
    "Retrieved transcript context:\n{context}\n\n"
    "Conversation history:\n{chat_history}\n\n"
    "Creator's question:\n{question}\n\n"
    "Please provide a detailed analytical response with citations."
)

chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "{system}"),
    ("human", human_message_template)
])

# Define custom document formatting prompt to inject metadata into the LLM's context window
from langchain_core.prompts import PromptTemplate
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from typing import List
from pydantic import Field

document_prompt = PromptTemplate(
    input_variables=["page_content", "video_id", "creator", "views", "likes", "comments", "engagement_rate", "upload_date", "chunk_index"],
    template=(
        "[Source Video {video_id}, Chunk {chunk_index}]:\n"
        "Metadata: Creator={creator}, Views={views}, Likes={likes}, Comments={comments}, Engagement Rate={engagement_rate}%, Upload Date={upload_date}\n"
        "Transcript Text: {page_content}"
    )
)

# Component 4a — Balanced Retriever
# Fetches top k_per_video chunks from EACH video independently so both A and B
# are always represented in the LLM context window, regardless of semantic distance.
class BalancedRetriever(BaseRetriever):
    """Custom retriever that always returns chunks from BOTH Video A and Video B."""
    k_per_video: int = Field(default=3)

    def _get_relevant_documents(self, query: str, **kwargs) -> List[Document]:
        from services.vector_service import retrieve_relevant_chunks
        results_a = retrieve_relevant_chunks(query, video_id_filter="A", k=self.k_per_video)
        results_b = retrieve_relevant_chunks(query, video_id_filter="B", k=self.k_per_video)
        # Merge: interleave A and B so context alternates and neither dominates
        docs = []
        for doc_a, doc_b in zip(results_a, results_b):
            docs.append(doc_a[0])
            docs.append(doc_b[0])
        # Append any remainder (when one list is shorter)
        longer = results_a if len(results_a) > len(results_b) else results_b
        for doc, _ in longer[min(len(results_a), len(results_b)):]:
            docs.append(doc)
        logger.info(f"BalancedRetriever returned {len(docs)} docs ({len(results_a)} from A, {len(results_b)} from B)")
        return docs

    async def _aget_relevant_documents(self, query: str, **kwargs) -> List[Document]:
        return self._get_relevant_documents(query, **kwargs)

balanced_retriever = BalancedRetriever(k_per_video=3)

# Component 4b — video_metadata store (set by the /process endpoint after scraping)
# This dict is populated by set_video_metadata() and read in ask_question().
video_metadata_store: dict = {}

def set_video_metadata(meta_a: dict, meta_b: dict) -> None:
    """Store metadata for both videos so every ask_question call can inject it into the prompt."""
    video_metadata_store["A"] = meta_a
    video_metadata_store["B"] = meta_b
    logger.info(f"video_metadata_store updated: A={meta_a.get('creator')}, B={meta_b.get('creator')}")

def _build_rag_chain():
    """Build a fresh ConversationalRetrievalChain with the current video metadata injected."""
    system_text = build_system_prompt(video_metadata_store)
    dynamic_prompt = ChatPromptTemplate.from_messages([
        ("system", system_text),
        ("human", human_message_template)
    ])
    return ConversationalRetrievalChain.from_llm(
        llm=streaming_llm,
        condense_question_llm=condense_llm,
        retriever=balanced_retriever,
        memory=conversation_memory,
        combine_docs_chain_kwargs={
            "prompt": dynamic_prompt,
            "document_prompt": document_prompt
        },
        return_source_documents=True,
        verbose=False
    )

# Component 5 — The Streaming Callback Bridge
class StreamingCallbackHandler(BaseCallbackHandler):
    """
    Callback handler for LangChain token streaming. 
    Bridges synchronous callback calls to an asynchronous asyncio.Queue.
    Ignores non-streaming question condensation runs by tracking streaming status.
    """
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.streaming_started = False

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        """Called on each new token generated by the LLM."""
        self.streaming_started = True
        self.queue.put_nowait(token)

    def on_llm_end(self, response, **kwargs) -> None:
        """Called when LLM completes token generation."""
        # Only signal STREAM_END if this was the streaming run
        if self.streaming_started:
            self.queue.put_nowait("[STREAM_END]")

    def on_llm_error(self, error, **kwargs) -> None:
        """Called when LLM encounters an error."""
        logger.error(f"Error during LLM streaming: {str(error)}")
        self.queue.put_nowait(f"[STREAM_ERROR]: {str(error)}")

# The ask_question Function
async def ask_question(user_message: str, queue: asyncio.Queue) -> dict:
    """
    Query the Conversational Retrieval Chain asynchronously in a thread pool.
    Streams generated tokens back to the client via callbacks into the provided queue.
    Returns a dictionary containing the full answer text and formatted source documents.
    """
    logger.info(f"Querying RAG chain with user message: '{user_message}'")
    handler = StreamingCallbackHandler(queue)
    loop = asyncio.get_event_loop()
    
    # Build a fresh chain with the current video metadata baked into the system prompt
    rag_chain = _build_rag_chain()
    
    # Define synchronous call to execute inside thread pool executor
    def run_chain():
        # Pass callbacks parameter directly to the chain call
        return rag_chain(
            {"question": user_message},
            callbacks=[handler]
        )
        
    try:
        response = await loop.run_in_executor(None, run_chain)
        
        # Extract and format retrieved source documents
        source_docs = response.get("source_documents", [])
        formatted_docs = []
        
        for doc in source_docs:
            meta = doc.metadata
            formatted_docs.append({
                "video_id": meta.get("video_id", ""),
                "chunk_index": meta.get("chunk_index", 0),
                "platform": meta.get("platform", ""),
                "creator": meta.get("creator", ""),
                "engagement_rate": meta.get("engagement_rate", 0.0),
                "timestamp": meta.get("timestamp", "00:00"),
                "url": meta.get("source_url", ""),
                "content": doc.page_content
            })
            
        logger.info(f"RAG chain query completed successfully. Retrieved {len(formatted_docs)} source documents.")
        return {
            "answer": response.get("answer", ""),
            "source_documents": formatted_docs
        }
    except Exception as e:
        logger.error(f"Failed to query RAG chain: {str(e)}")
        # Put error sentinel in queue to notify consumer
        queue.put_nowait(f"[STREAM_ERROR]: {str(e)}")
        return {
            "answer": "",
            "source_documents": []
        }

# The reset_memory Function
def reset_memory():
    """Wipe the sliding window memory buffer to start a fresh chat session."""
    logger.info("Clearing conversation memory...")
    conversation_memory.clear()
    logger.info("Conversation memory cleared successfully.")
