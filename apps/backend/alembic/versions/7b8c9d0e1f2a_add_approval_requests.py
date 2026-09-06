"""Add approval requests

Revision ID: 7b8c9d0e1f2a
Revises: 6a7a0c4bdabf
Create Date: 2026-09-06 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b8c9d0e1f2a'
down_revision: Union[str, Sequence[str], None] = '6a7a0c4bdabf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('approval_requests',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('execution_id', sa.String(), nullable=False),
        sa.Column('node_id', sa.String(), nullable=False),
        sa.Column('approver_email', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decided_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['execution_id'], ['execution_logs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_approval_requests_execution_id'), 'approval_requests', ['execution_id'], unique=False)
    op.create_index(op.f('ix_approval_requests_token'), 'approval_requests', ['token'], unique=True)
    op.create_index(op.f('ix_approval_requests_status'), 'approval_requests', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_approval_requests_status'), table_name='approval_requests')
    op.drop_index(op.f('ix_approval_requests_token'), table_name='approval_requests')
    op.drop_index(op.f('ix_approval_requests_execution_id'), table_name='approval_requests')
    op.drop_table('approval_requests')
