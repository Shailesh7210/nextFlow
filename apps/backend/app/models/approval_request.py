from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base

def generate_approval_id() -> str:
    return f"apr_{uuid.uuid4().hex[:12]}"

def generate_approval_token() -> str:
    return f"tok_{uuid.uuid4().hex}"

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(String(32), primary_key=True, default=generate_approval_id)
    execution_id = Column(String(32), ForeignKey("execution_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(64), nullable=False)
    approver_email = Column(String(255), nullable=False, default="admin@company.com")
    message = Column(Text, nullable=True)
    token = Column(String(128), unique=True, nullable=False, default=generate_approval_token, index=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    decided_by = Column(String(255), nullable=True)

    execution = relationship("ExecutionLog", backref="approval_requests")
