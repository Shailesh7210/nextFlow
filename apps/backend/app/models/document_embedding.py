from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

def generate_embedding_id() -> str:
    return f"emb_{uuid.uuid4().hex[:12]}"

class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(String(32), primary_key=True, default=generate_embedding_id)
    workspace_id = Column(String(32), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    document_name = Column(String(255), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=False)  # Stores float array [0.012, -0.045, ...]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    workspace = relationship("Workspace", backref="document_embeddings")
