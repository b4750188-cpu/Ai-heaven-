"""
Alembic Migration: 002_phase1b_execution_sandbox
Revises: 001_phase1a_foundation
Create tables: execution_jobs, execution_approvals
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_phase1b_execution_sandbox'
down_revision: Union[str, None] = '001_phase1a_foundation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Execution Approvals
    op.create_table(
        'execution_approvals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('execution_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('command', sa.Text(), nullable=False),
        sa.Column('command_fingerprint', sa.String(64), nullable=False),
        sa.Column('requested_by_actor', sa.String(50), nullable=False, server_default='agent'),
        sa.Column('decided_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_execution_approvals_execution_id', 'execution_approvals', ['execution_id'])
    op.create_index('ix_execution_approvals_project_id', 'execution_approvals', ['project_id'])
    op.create_index('ix_execution_approvals_status', 'execution_approvals', ['status'])
    op.create_index('ix_execution_approvals_fingerprint', 'execution_approvals', ['command_fingerprint'])

    # 2. Execution Jobs
    op.create_table(
        'execution_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tool_id', sa.String(100), sa.ForeignKey('tools.id'), nullable=False),
        sa.Column('command', sa.Text(), nullable=False),
        sa.Column('state', sa.String(50), nullable=False, server_default='planned'),
        sa.Column('is_destructive', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('audit_event_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('exit_code', sa.Integer(), nullable=True),
        sa.Column('stdout', sa.Text(), nullable=False, server_default=''),
        sa.Column('stderr', sa.Text(), nullable=False, server_default=''),
        sa.Column('output_truncated', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_execution_jobs_agent_id', 'execution_jobs', ['agent_id'])
    op.create_index('ix_execution_jobs_project_id', 'execution_jobs', ['project_id'])
    op.create_index('ix_execution_jobs_workspace_id', 'execution_jobs', ['workspace_id'])
    op.create_index('ix_execution_jobs_state', 'execution_jobs', ['state'])


def downgrade() -> None:
    op.drop_table('execution_jobs')
    op.drop_table('execution_approvals')
