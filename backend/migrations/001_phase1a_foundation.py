"""
Alembic Migration: 001_phase1a_foundation
Revises: None
Create tables: users, projects, workspaces, agents, tools, audit_events
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_phase1a_foundation'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('profile', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('identities', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. Projects
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('metadata_json', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_projects_owner_id', 'projects', ['owner_id'])
    op.create_index('ix_projects_status', 'projects', ['status'])

    # 3. Workspaces
    op.create_table(
        'workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('filesystem_ref', sa.String(500), nullable=False),
        sa.Column('sandbox_ref', sa.String(500), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='ready'),
        sa.Column('environment_variables', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_workspaces_project_id', 'workspaces', ['project_id'])
    op.create_index('ix_workspaces_owner_id', 'workspaces', ['owner_id'])

    # 4. Agents
    op.create_table(
        'agents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('status', sa.String(50), nullable=False, server_default='idle'),
        sa.Column('permissions', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_agents_owner_id', 'agents', ['owner_id'])
    op.create_index('ix_agents_project_id', 'agents', ['project_id'])

    # 5. Tools
    op.create_table(
        'tools',
        sa.Column('id', sa.String(100), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('capability', sa.String(50), nullable=False),
        sa.Column('permission_requirements', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('execution_policy', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_tools_capability', 'tools', ['capability'])

    # 6. Audit Events
    op.create_table(
        'audit_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('actor_id', sa.String(100), nullable=False),
        sa.Column('actor_type', sa.String(50), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(150), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('metadata_json', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_audit_events_event_type', 'audit_events', ['event_type'])
    op.create_index('ix_audit_events_actor_id', 'audit_events', ['actor_id'])
    op.create_index('ix_audit_events_timestamp', 'audit_events', ['timestamp'])


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('tools')
    op.drop_table('agents')
    op.drop_table('workspaces')
    op.drop_table('projects')
    op.drop_table('users')
