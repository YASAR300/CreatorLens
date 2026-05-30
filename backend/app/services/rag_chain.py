import os
import json
import logging
from typing import AsyncGenerator, Dict, Any, List
from langchain_groq import ChatGroq
from langchain_classic.memory import ConversationBufferWindowMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.config import settings
from app.services.vector_store import query_vector_store, reset_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGManager:
    def __init__(self):
        # Initialize memory with a window size of 5 turns
        self.memory = ConversationBufferWindowMemory(
            k=5,
            memory_key="chat_history",
            return_messages=True
        )
        self.video_metadata: Dict[str, Dict[str, Any]] = {}

    def set_video_metadata(self, video_a: Dict[str, Any], video_b: Dict[str, Any]):
        """Store metadata in-memory for the current session to enrich prompt context."""
        self.video_metadata = {
            "A": video_a,
            "B": video_b
        }
        logger.info(f"RAGManager metadata loaded. Video A: {video_a['creator']}, Video B: {video_b['creator']}")

    def reset(self) -> bool:
        """Clear memory and reset vector store."""
        try:
            self.memory.clear()
            self.video_metadata = {}
            db_reset = reset_db()
            logger.info("RAGManager conversation history and metadata cleared successfully.")
            return db_reset
        except Exception as e:
            logger.error(f"Failed to reset RAG session: {str(e)}")
            return False

    async def generate_rag_stream(self, query: str) -> AsyncGenerator[str, None]:
        """
        Stream the RAG chat response as structured SSE JSON frames:
        1. Query ChromaDB for top 5 context chunks.
        2. Format context and include video metadata (engagement rates, likes, views).
        3. Invoke Groq LLM (Llama 3.1 70B) in streaming mode.
        4. Stream text delta content and citations.
        """
        if not settings.GROQ_API_KEY:
            yield f"data: {json.dumps({'type': 'error', 'content': 'GROQ_API_KEY is missing from environment. Please add it.'})}\n\n"
            return

        # Step 1: Retrieve context chunks from ChromaDB
        docs = query_vector_store(query, k=5)
        
        # Format citations to send immediately to the frontend
        citations = []
        context_str = ""
        
        for doc in docs:
            v_id = doc.metadata.get("video_id", "A")
            platform = doc.metadata.get("platform", "youtube")
            timestamp = doc.metadata.get("timestamp", "00:00")
            url = doc.metadata.get("source_url", "")
            
            citations.append({
                "video_id": v_id,
                "platform": platform,
                "timestamp": timestamp,
                "url": url,
                "content": doc.page_content
            })
            
            # Enrich context with metadata reference
            context_str += f"[Source Video {v_id} ({platform}), Timestamp: {timestamp}]:\n{doc.page_content}\n---\n"

        # Yield citations first so the frontend has reference tags immediately
        yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

        # Step 2: Incorporate global metadata metrics (views, engagement rates)
        metadata_summary = ""
        if self.video_metadata:
            meta_a = self.video_metadata.get("A", {})
            meta_b = self.video_metadata.get("B", {})
            metadata_summary = (
                f"Global Video Performance Summary:\n"
                f"- Video A ({meta_a.get('platform', 'YouTube')}): Creator is {meta_a.get('creator', 'N/A')}, Follower Count: {meta_a.get('follower_count', 0)}, Views: {meta_a.get('views', 0)}, Likes: {meta_a.get('likes', 0)}, Comments: {meta_a.get('comments', 0)}, Engagement Rate: {meta_a.get('engagement_rate', 0.0)}%, Duration: {meta_a.get('duration', 0)}s, Upload Date: {meta_a.get('upload_date', 'N/A')}, Hashtags: {', '.join(meta_a.get('hashtags', []))}.\n"
                f"- Video B ({meta_b.get('platform', 'Instagram Reels')}): Creator is {meta_b.get('creator', 'N/A')}, Follower Count: {meta_b.get('follower_count', 0)}, Views: {meta_b.get('views', 0)}, Likes: {meta_b.get('likes', 0)}, Comments: {meta_b.get('comments', 0)}, Engagement Rate: {meta_b.get('engagement_rate', 0.0)}%, Duration: {meta_b.get('duration', 0)}s, Upload Date: {meta_b.get('upload_date', 'N/A')}, Hashtags: {', '.join(meta_b.get('hashtags', []))}.\n\n"
            )

        # Step 3: Define Prompt
        system_instruction = (
            "You are CreatorLens, an elite social media strategist and RAG bot.\n"
            "Your goal is to help creators analyze their content by comparing two of their videos (Video A and Video B).\n"
            "You MUST use the provided Context Chunks and Global Video Performance Summary to answer questions.\n\n"
            "CRITICAL RESPONSE RULES:\n"
            "1. You MUST explain the analytics thoroughly (e.g. comparing hooks, loopability, engagement rates, viewers behavior, suggestions).\n"
            "2. Cite your sources in the text using strict inline citations, e.g. '[Video A, 00:05]' or '[Video B, 00:03]'. Every statement drawing from a chunk must be cited.\n"
            "3. If you reference global metrics, cite them as e.g. '[Video A, Metadata]' or '[Video B, Metadata]'.\n"
            "4. Maintain memory of previous conversational exchanges to deliver context-aware answers.\n"
            "5. If the context doesn't contain relevant information, state that it's not present in the transcripts, but suggest strategist advice anyway based on global metrics.\n\n"
            f"{metadata_summary}"
            f"Context Chunks from Transcripts:\n{context_str}"
        )

        # Extract chat history messages for LangChain
        chat_history = self.memory.load_memory_variables({}).get("chat_history", [])

        # Create structured prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_instruction),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}")
        ])

        # Step 4: Stream response from ChatGroq
        try:
            logger.info("Initializing ChatGroq (Llama-3.3-70b-versatile)...")
            llm = ChatGroq(
                model_name="llama-3.3-70b-versatile",
                groq_api_key=settings.GROQ_API_KEY,
                temperature=0.3,
                streaming=True
            )

            # Bind prompts and history
            chain = prompt | llm
            
            full_response_text = ""
            async for chunk in chain.astream({"question": query, "chat_history": chat_history}):
                content = chunk.content
                if content:
                    full_response_text += content
                    yield f"data: {json.dumps({'type': 'content', 'delta': content})}\n\n"
            
            # Save the full exchange to memory buffer
            self.memory.save_context({"input": query}, {"output": full_response_text})
            logger.info("Saved current turn to conversational memory.")
            
        except Exception as e:
            logger.error(f"Error during LLM inference: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': f'LLM streaming error: {str(e)}'})}\n\n"

        # Signal completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

# Singleton instance for active session
rag_manager = RAGManager()
