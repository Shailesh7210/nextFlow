"""Add document embeddings table for RAG vector search

Revision ID: 9d0e1f2a3b4c
Revises: 8c9d0e1f2a3b
Create Date: 2026-09-06 13:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '9d0e1f2a3b4c'
down_revision: Union[str, Sequence[str], None] = '8c9d0e1f2a3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('document_embeddings',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('workspace_id', sa.String(length=32), nullable=False),
        sa.Column('document_name', sa.String(length=255), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_embeddings_workspace_id'), 'document_embeddings', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_document_embeddings_document_name'), 'document_embeddings', ['document_name'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_document_embeddings_document_name'), table_name='document_embeddings')
    op.drop_index(op.f('ix_document_embeddings_workspace_id'), table_name='document_embeddings')
    op.drop_table('document_embeddings')
