import math
import hashlib
import logging
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document_embedding import DocumentEmbedding

logger = logging.getLogger("nexflow.rag")

EMBEDDING_DIM = 128  # Fixed dimension vector representation for compatibility

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Splits document text into overlapping semantic chunks.
    """
    if not text:
        return []
    
    text = text.strip()
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Attempt to break at paragraph or sentence boundary
        break_pos = text.rfind("\n", start + chunk_size // 2, end)
        if break_pos == -1:
            break_pos = text.rfind(". ", start + chunk_size // 2, end)
        
        if break_pos != -1 and break_pos > start:
            end = break_pos + (1 if text[break_pos] == "." else 0)

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = max(start + 1, end - overlap)

    return chunks


def compute_deterministic_vector(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    Generates a deterministic 128-dimensional normalized embedding vector from text.
    Used for offline development, local testing, and offline fallbacks.
    """
    vec = [0.0] * dim
    words = text.lower().split()
    if not words:
        return vec

    for word in words:
        # Create deterministic hash distribution across dimensions
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        val = ((h >> 8) % 1000) / 500.0 - 1.0  # value between -1.0 and 1.0
        vec[idx] += val

    # L2 normalize vector
    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude > 1e-9:
        vec = [v / magnitude for v in vec]

    return vec


async def compute_embedding(text: str, openai_api_key: Optional[str] = None) -> List[float]:
    """
    Computes vector embedding using OpenAI API if key provided, otherwise fallback to local vector engine.
    """
    if openai_api_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "text-embedding-3-small",
                        "input": text,
                        "dimensions": EMBEDDING_DIM
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["data"][0]["embedding"]
                else:
                    logger.warning(f"OpenAI embedding API returned status {resp.status_code}. Using local vector fallback.")
        except Exception as e:
            logger.warning(f"OpenAI embedding call failed: {e}. Using local vector fallback.")

    return compute_deterministic_vector(text)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Calculates cosine similarity between two float vectors.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0

    return dot / (norm_a * norm_b)


async def index_document_chunks(
    db: AsyncSession,
    workspace_id: str,
    document_name: str,
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
    api_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Chunks document text, computes vector embeddings, and saves records to PostgreSQL document_embeddings table.
    """
    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
    indexed_records = []

    for idx, chunk_content in enumerate(chunks):
        vector = await compute_embedding(chunk_content, openai_api_key=api_key)
        emb_record = DocumentEmbedding(
            workspace_id=workspace_id,
            document_name=document_name,
            chunk_index=idx,
            content=chunk_content,
            embedding=vector
        )
        db.add(emb_record)
        indexed_records.append({
            "chunk_index": idx,
            "content": chunk_content,
            "vector_len": len(vector)
        })

    await db.commit()
    return indexed_records


async def search_vector_store(
    db: AsyncSession,
    workspace_id: str,
    query_text: str,
    top_k: int = 3,
    min_similarity: float = -1.0,
    api_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Performs multi-tenant vector similarity search scoped strictly to workspace_id.
    """
    if not query_text or not query_text.strip():
        return []

    # 1. Compute query vector
    query_vec = await compute_embedding(query_text.strip(), openai_api_key=api_key)

    # 2. Retrieve all document embeddings for active workspace (Multi-Tenant Isolation)
    stmt = select(DocumentEmbedding).filter(DocumentEmbedding.workspace_id == workspace_id)
    res = await db.execute(stmt)
    embeddings = res.scalars().all()

    # 3. Calculate similarity scores
    scored_results = []
    for record in embeddings:
        sim = cosine_similarity(query_vec, record.embedding)
        if sim >= min_similarity:
            scored_results.append({
                "id": record.id,
                "document_name": record.document_name,
                "chunk_index": record.chunk_index,
                "content": record.content,
                "similarity": round(sim, 4)
            })

    # 4. Sort by highest similarity first
    scored_results.sort(key=lambda x: x["similarity"], reverse=True)
    return scored_results[:top_k]
