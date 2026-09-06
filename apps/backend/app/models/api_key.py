from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

def generate_api_key_id() -> str:
    return f"apk_{uuid.uuid4().hex[:12]}"

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(32), primary_key=True, default=generate_api_key_id)
    workspace_id = Column(String(32), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(128), unique=True, nullable=False, index=True)
    key_prefix = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    workspace = relationship("Workspace", backref="api_keys")
