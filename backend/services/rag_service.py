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
system_instruction = (
    "You are an expert social media analytics assistant helping content creators understand their video performance. "
    "You have access to transcripts and metadata for two videos — Video A (YouTube) and Video B (Instagram Reel).\n\n"
    "Video metadata includes engagement rate (calculated as likes plus comments divided by views times 100), view count, "
    "like count, comment count, creator name, follower count, upload date, and duration. This metadata is embedded in "
    "every retrieved chunk.\n\n"
    "For every claim you make, cite the source using the format [Video X, Chunk N]. If your answer draws from multiple "
    "chunks, cite each one. Always specify which video you are referencing.\n\n"
    "When comparing videos, use specific numbers — do not say 'Video A performed better', say 'Video A had an "
    "engagement rate of 4.3% compared to Video B's 2.1%, a 2.2 percentage point difference.' When suggesting improvements, "
    "structure your response as numbered actionable points. When discussing transcript content, quote the relevant timestamp.\n\n"
    "If the retrieved context does not contain enough information to answer a question, say so explicitly rather than "
    "speculating. Do not invent statistics or engagement numbers that are not in the provided context."
)

human_message_template = (
    "Context from video transcripts and metadata:\n{context}\n\n"
    "Conversation history:\n{chat_history}\n\n"
    "Creator's question:\n{question}\n\n"
    "Please provide a detailed analytical response with citations."
)

chat_prompt = ChatPromptTemplate.from_messages([
    ("system", system_instruction),
    ("human", human_message_template)
])

# Define custom document formatting prompt to inject metadata into the LLM's context window
from langchain_core.prompts import PromptTemplate
document_prompt = PromptTemplate(
    input_variables=["page_content", "video_id", "creator", "views", "likes", "comments", "engagement_rate", "upload_date", "chunk_index"],
    template=(
        "[Source Video {video_id}, Chunk {chunk_index}]:\n"
        "Metadata: Creator={creator}, Views={views}, Likes={likes}, Comments={comments}, Engagement Rate={engagement_rate}%, Upload Date={upload_date}\n"
        "Transcript Text: {page_content}"
    )
)

# Component 4 — ConversationalRetrievalChain Assembly (Initialized globally)
logger.info("Assembling ConversationalRetrievalChain...")
rag_chain = ConversationalRetrievalChain.from_llm(
    llm=streaming_llm,
    condense_question_llm=condense_llm,
    retriever=chroma_db.as_retriever(search_kwargs={"k": 5}),
    memory=conversation_memory,
    combine_docs_chain_kwargs={
        "prompt": chat_prompt,
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
