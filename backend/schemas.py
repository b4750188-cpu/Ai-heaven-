"""
AI HEAVEN - Pydantic V2 Schemas for FastAPI
Standardized representation for Agent-First discovery and server-controlled verification.
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class ProvenanceSchema(BaseModel):
    source_provider: str
    source_url: str
    source_identifier: str
    source_type: Literal[
        "official_documentation",
        "official_api",
        "verified_git_repository",
        "package_registry",
        "open_standard_manifest"
    ]
    first_seen_at: datetime
    last_seen_at: datetime
    last_verified_at: datetime
    sync_status: Literal["synced", "drift_detected", "pending"]
    is_demo_data: bool = Field(
        default=False,
        description="Explicit flag ensuring demonstration records are never confused with production data."
    )


class AuthenticationSchema(BaseModel):
    type: Literal["api_key", "oauth2", "service_account", "none", "token"]
    required: bool
    header_or_param: str
    description: str


class AgentContractSchema(BaseModel):
    what_is_it: str
    what_does_it_do: str
    who_provides_it: str
    inputs: List[str]
    outputs: List[str]
    authentication: AuthenticationSchema
    permissions: List[str]
    rate_limits: Optional[str] = None
    cost_model: Optional[str] = None
    compatibility: List[str] = Field(default_factory=list)
    alternatives: List[str] = Field(default_factory=list)


class ResourceModelFamilySchema(BaseModel):
    model_id: str
    display_name: str
    version: str
    release_date: str
    context_window_tokens: int
    input_modalities: List[str]
    output_modalities: List[str]
    supports_function_calling: bool = True
    supports_code_execution: bool = False
    supports_structured_output: bool = True
    supports_search_grounding: bool = False
    supports_context_caching: bool = False
    pricing_input_per_million: Optional[str] = None
    pricing_output_per_million: Optional[str] = None
    official_endpoint: Optional[str] = None
    documentation_url: str


class ResourceBaseSchema(BaseModel):
    slug: str
    name: str
    resource_type: str
    provider_id: str
    description: str
    summary: str
    source_url: str
    documentation_url: str
    repository_url: Optional[str] = None
    publisher: str
    author: Optional[str] = None
    version: Optional[str] = None
    license: Optional[str] = None
    capabilities: List[str] = Field(default_factory=list)
    modalities: Optional[Dict[str, List[str]]] = None
    context_limit: Optional[int] = None
    dependencies: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    external_identifiers: Dict[str, Any] = Field(default_factory=dict)
    agent_contract: AgentContractSchema
    models: Optional[List[ResourceModelFamilySchema]] = None
    supported_workflows: Optional[List[str]] = None


class ResourceResponseSchema(ResourceBaseSchema):
    id: str
    verification_status: Literal["verified", "community_verified", "unverified", "pending_review"]
    trust_score: int
    provenance: ProvenanceSchema
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RelationshipResponseSchema(BaseModel):
    id: str
    source_slug: str
    target_slug: str
    relationship_type: str
    evidence_url: str
    confidence: float
    verified: bool
    description: str
    created_at: datetime


class ProviderResponseSchema(BaseModel):
    id: str
    slug: str
    name: str
    legal_name: str
    website_url: str
    documentation_url: str
    headquarters: Optional[str] = None
    description: str
    resource_types_provided: List[str]
    verified: bool
    external_identifiers: Dict[str, Any]
