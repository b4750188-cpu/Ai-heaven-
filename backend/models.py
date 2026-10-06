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
