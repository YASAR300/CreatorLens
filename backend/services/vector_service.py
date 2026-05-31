"""
vector_service.py — Qdrant-backed vector store with per-user isolation.

Migrated from embedded ChromaDB to Qdrant Cloud so the system is multi-user and
horizontally scalable. Every point is tagged with `user_id` and `video_id`, and
every read/write is filtered by the current user so accounts never see each
other's data.

The current user is tracked via a ContextVar (`current_user_id`) set per request,
which lets the existing BalancedRetriever (which has no user param) stay correct.

Public contract (unchanged for callers):
  - process_and_store(video_data) -> int
  - clear_collection()
  - retrieve_relevant_chunks(query, video_id_filter, k) -> List[(Document, float)]
"""
import os
import re
import uuid
import logging
import contextvars
from typing import List, Tuple

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

COLLECTION = "creator_lens"
EMBED_DIM = 384  # all-MiniLM-L6-v2

# Per-request user scope. Defaults to a shared bucket if auth is somehow absent.
current_user_id: contextvars.ContextVar[str] = contextvars.ContextVar(
    "current_user_id", default="anonymous"
)
# Per-request ACTIVE analysis scope. Lets a user keep many saved comparisons in
# Qdrant simultaneously and chat against whichever one is currently open.
current_analysis_id: contextvars.ContextVar[str] = contextvars.ContextVar(
    "current_analysis_id", default="default"
)


def set_current_user(user_id: str) -> None:
    current_user_id.set(user_id or "anonymous")


def set_current_analysis(analysis_id: str) -> None:
    current_analysis_id.set(analysis_id or "default")


# ── Text splitter ──
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
)

# ── Embeddings (loaded once) ──
logger.info("Loading HuggingFace Embeddings: all-MiniLM-L6-v2...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

# ── Qdrant client ──
qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    timeout=30,
)


def _ensure_collection() -> None:
    """Create the collection once if it doesn't exist."""
    try:
        if not qdrant.collection_exists(COLLECTION):
            qdrant.create_collection(
                collection_name=COLLECTION,
                vectors_config=qmodels.VectorParams(
                    size=EMBED_DIM, distance=qmodels.Distance.COSINE
                ),
            )
            # Index the fields we filter on for fast scoped queries.
            for field in ("user_id", "video_id", "analysis_id"):
                try:
                    qdrant.create_payload_index(
                        COLLECTION, field_name=field,
                        field_schema=qmodels.PayloadSchemaType.KEYWORD,
                    )
                except Exception:
                    pass
            logger.info("Created Qdrant collection '%s'.", COLLECTION)
    except Exception as exc:
        logger.error("Could not ensure Qdrant collection: %s", exc)
        raise


_ensure_collection()

# Ensure the analysis_id index exists even on a pre-existing collection.
try:
    qdrant.create_payload_index(
        COLLECTION, field_name="analysis_id",
        field_schema=qmodels.PayloadSchemaType.KEYWORD,
    )
except Exception:
    pass


def parse_first_timestamp(text: str) -> str:
    match = re.search(r"\[(\d+):(\d{2})\]", text)
    if match:
        return f"{int(match.group(1)):02d}:{match.group(2)}"
    return "00:00"


def _build_content_document(video_data: dict) -> str:
    """Richest text blob describing a video — always present, even with no transcript."""
    title = (video_data.get("title") or "").strip()
    creator = (video_data.get("creator") or "").strip()
    description = (video_data.get("caption") or video_data.get("description") or "").strip()
    platform = video_data.get("platform", "")

    parts = []
    if title:
        parts.append(f"Title: {title}")
    if creator:
        parts.append(f"Creator: {creator} ({platform})")
    if description:
        parts.append(f"Description / Caption: {description}")
    return "\n".join(parts).strip()


def _point_id(user_id: str, analysis_id: str, video_id: str, idx: int) -> str:
    """Deterministic UUID so re-ingesting the same slot overwrites cleanly."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{user_id}/{analysis_id}/{video_id}/{idx}"))


def _scope_filter(user_id: str, analysis_id: str = None, video_id: str = None) -> qmodels.Filter:
    must = [qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=user_id))]
    if analysis_id:
        must.append(qmodels.FieldCondition(key="analysis_id", match=qmodels.MatchValue(value=analysis_id)))
    if video_id:
        must.append(qmodels.FieldCondition(key="video_id", match=qmodels.MatchValue(value=video_id)))
    return qmodels.Filter(must=must)


def process_and_store(video_data: dict) -> int:
    """
    Chunk content (overview chunk + transcript chunks), embed, and upsert into
    Qdrant tagged with the current user_id and the video_id (A/B).
    """
    user_id = current_user_id.get()
    analysis_id = current_analysis_id.get()
    video_id = video_data.get("video_id", "A")
    platform = video_data.get("platform", "youtube")
    creator = video_data.get("creator", "Unknown")

    logger.info("Storing content for user=%s analysis=%s Video %s (%s) by %s", user_id, analysis_id, video_id, platform, creator)

    transcript = video_data.get("transcript", "") or ""
    transcript_missing = (
        transcript.strip() == "" or transcript.startswith("Transcript not available")
    )

    base_meta = {
        "user_id": user_id,
        "analysis_id": analysis_id,
        "video_id": video_id,
        "platform": platform,
        "creator": creator,
        "views": int(video_data.get("views", 0)),
        "likes": int(video_data.get("likes", 0)),
        "comments": int(video_data.get("comments", 0)),
        "engagement_rate": float(video_data.get("engagement_rate", 0.0)),
        "upload_date": str(video_data.get("upload_date", "")),
        "source_url": video_data.get("url", ""),
        "tags": ", ".join(video_data.get("tags", [])) if isinstance(video_data.get("tags"), list) else str(video_data.get("tags", "")),
    }

    texts: List[str] = []
    metas: List[dict] = []
    idx = 0

    context_doc = _build_content_document(video_data)
    if context_doc:
        m = dict(base_meta, chunk_index=idx, timestamp="00:00", content_type="overview")
        texts.append(context_doc); metas.append(m); idx += 1

    if not transcript_missing:
        for chunk in text_splitter.split_text(transcript):
            m = dict(base_meta, chunk_index=idx, timestamp=parse_first_timestamp(chunk), content_type="transcript")
            texts.append(chunk); metas.append(m); idx += 1
    else:
        logger.warning("No transcript for Video %s; using overview chunk only.", video_id)

    if not texts:
        m = dict(base_meta, chunk_index=0, timestamp="00:00", content_type="overview")
        texts.append(f"Video {video_id} by {creator} on {platform}. Only engagement metrics are known.")
        metas.append(m)

    vectors = embeddings.embed_documents(texts)
    points = []
    for i, (text, meta, vec) in enumerate(zip(texts, metas, vectors)):
        payload = dict(meta)
        payload["page_content"] = text
        points.append(qmodels.PointStruct(
            id=_point_id(user_id, analysis_id, video_id, meta["chunk_index"]),
            vector=vec,
            payload=payload,
        ))

    qdrant.upsert(collection_name=COLLECTION, points=points)
    logger.info("Upserted %d points for user=%s analysis=%s Video %s.", len(points), user_id, analysis_id, video_id)
    return len(points)


def clear_collection() -> None:
    """Delete the CURRENT user+analysis points (scoped reset)."""
    user_id = current_user_id.get()
    analysis_id = current_analysis_id.get()
    try:
        qdrant.delete(
            collection_name=COLLECTION,
            points_selector=qmodels.FilterSelector(filter=_scope_filter(user_id, analysis_id)),
        )
        logger.info("Cleared Qdrant points for user=%s analysis=%s.", user_id, analysis_id)
    except Exception as exc:
        logger.warning("Error clearing Qdrant points for user=%s: %s", user_id, exc)


def retrieve_relevant_chunks(query: str, video_id_filter: str = None, k: int = 5) -> List[Tuple[Document, float]]:
    """Top-k semantically relevant chunks for the current user+analysis, optionally one video."""
    user_id = current_user_id.get()
    analysis_id = current_analysis_id.get()
    logger.info("Retrieving k=%d for user=%s analysis=%s query='%s' (video=%s)", k, user_id, analysis_id, query, video_id_filter)

    qvec = embeddings.embed_query(query)
    response = qdrant.query_points(
        collection_name=COLLECTION,
        query=qvec,
        query_filter=_scope_filter(user_id, analysis_id, video_id_filter),
        limit=k,
        with_payload=True,
    )
    hits = response.points

    results: List[Tuple[Document, float]] = []
    for h in hits:
        payload = dict(h.payload or {})
        content = payload.pop("page_content", "")
        results.append((Document(page_content=content, metadata=payload), float(h.score)))

    logger.info("Retrieved %d chunks from Qdrant.", len(results))
    return results
