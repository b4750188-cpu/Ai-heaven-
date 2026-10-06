"""
AI HEAVEN - Authoritative SQLAlchemy 2.0 ORM Models
PostgreSQL with Alembic migrations, timezone-aware timestamps, and JSONB schemas.
"""

from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any

from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship
)


class Base(DeclarativeBase):
    pass


class ProviderModel(Base):
    __tablename__ = "providers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    website_url: Mapped[str] = mapped_column(String(500), nullable=False)
    documentation_url: Mapped[str] = mapped_column(String(500), nullable=False)
    headquarters: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resource_types_provided: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    external_identifiers: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    resources: Mapped[List["ResourceModel"]] = relationship("ResourceModel", back_populates="provider")


class ResourceModel(Base):
    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False, index=True
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(String(300), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    documentation_url: Mapped[str] = mapped_column(String(500), nullable=False)
    repository_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    publisher: Mapped[str] = mapped_column(String(150), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    license: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    capabilities: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    modalities: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    context_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dependencies: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    categories: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    # Server-controlled ONLY:
    verification_status: Mapped[str] = mapped_column(
        String(50), default="unverified", nullable=False, index=True
    )
    trust_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Provenance tracking
    provenance: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    external_identifiers: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Agent-first structural profile
    agent_contract: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Optional model ecosystem list if resource is a platform
    models: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    supported_workflows: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    provider: Mapped["ProviderModel"] = relationship("ProviderModel", back_populates="resources")

    __table_args__ = (
        Index("ix_resources_fts", "name", "slug", "description", postgresql_using="gin"),
    )


class RelationshipModel(Base):
    __tablename__ = "resource_relationships"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    target_slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    evidence_url: Mapped[str] = mapped_column(String(500), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="user", nullable=False)  # 'user', 'admin', 'auditor'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    profile: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    identities: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    projects: Mapped[List["ProjectModel"]] = relationship("ProjectModel", back_populates="owner")
    agents: Mapped[List["AgentModel"]] = relationship("AgentModel", back_populates="owner")


class ProjectModel(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False, index=True)  # 'active', 'archived', 'suspended'
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    owner: Mapped["UserModel"] = relationship("UserModel", back_populates="projects")
    workspaces: Mapped[List["WorkspaceModel"]] = relationship("WorkspaceModel", back_populates="project", cascade="all, delete-orphan")
    agents: Mapped[List["AgentModel"]] = relationship("AgentModel", back_populates="project")


class WorkspaceModel(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    filesystem_ref: Mapped[str] = mapped_column(String(500), nullable=False)
    sandbox_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ready", nullable=False, index=True)  # 'ready', 'provisioning', 'stopped', 'failed'
    environment_variables: Mapped[Dict[str, str]] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    project: Mapped["ProjectModel"] = relationship("ProjectModel", back_populates="workspaces")


class AgentModel(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), default="idle", nullable=False, index=True)  # 'idle', 'assigned', 'paused', 'terminated'
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    owner: Mapped["UserModel"] = relationship("UserModel", back_populates="agents")
    project: Mapped["ProjectModel"] = relationship("ProjectModel", back_populates="agents")


class ToolModel(Base):
    __tablename__ = "tools"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    capability: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # 'terminal', 'filesystem', 'github', 'browser', 'mcp', 'ai_inference'
    permission_requirements: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    execution_policy: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'user', 'agent', 'system'
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # 'success', 'failure', 'pending', 'rejected'
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )


class ExecutionApprovalModel(Base):
    __tablename__ = "execution_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    execution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    command: Mapped[str] = mapped_column(Text, nullable=False)
    command_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    requested_by_actor: Mapped[str] = mapped_column(String(50), default="agent", nullable=False)
    decided_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)  # 'pending', 'approved', 'rejected', 'expired'
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ExecutionJobModel(Base):
    __tablename__ = "execution_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tool_id: Mapped[str] = mapped_column(String(100), ForeignKey("tools.id"), nullable=False, index=True)
    command: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(50), default="planned", nullable=False, index=True)  # 'draft', 'planned', 'approved', 'executing', 'executed', 'failed', 'cancelled', 'rejected'
    is_destructive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    audit_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stdout: Mapped[str] = mapped_column(Text, default="", nullable=False)
    stderr: Mapped[str] = mapped_column(Text, default="", nullable=False)
    output_truncated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)



