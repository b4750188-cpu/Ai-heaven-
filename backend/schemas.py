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


# ==========================================
# PHASE 1A: FOUNDATION PYDANTIC SCHEMAS
# ==========================================

class UserProfileSchema(BaseModel):
    full_name: str
    avatar_url: Optional[str] = None
    organization: Optional[str] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)


class UserIdentitySchema(BaseModel):
    provider: Literal["local", "google", "github"]
    provider_user_id: str
    email: str
    last_authenticated_at: datetime


class UserResponseSchema(BaseModel):
    id: str
    email: str
    role: Literal["user", "admin", "auditor"]
    is_active: bool
    profile: UserProfileSchema
    identities: List[UserIdentitySchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProjectResponseSchema(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str
    status: Literal["active", "archived", "suspended"]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkspaceCreateSchema(BaseModel):
    project_id: str
    name: str = Field(..., min_length=1, max_length=200)
    filesystem_ref: Optional[str] = None
    environment_variables: Dict[str, str] = Field(default_factory=dict)


class WorkspaceResponseSchema(BaseModel):
    id: str
    project_id: str
    owner_id: str
    name: str
    filesystem_ref: str
    sandbox_ref: Optional[str] = None
    status: Literal["ready", "provisioning", "stopped", "failed"]
    environment_variables: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentPermissionsSchema(BaseModel):
    allowed_tools: List[str] = Field(default_factory=list)
    network_access: bool = False
    filesystem_scope: Literal["workspace_only", "read_only", "none"] = "workspace_only"
    requires_approval_for_destructive: bool = True


class AgentCreateSchema(BaseModel):
    project_id: str
    workspace_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    permissions: AgentPermissionsSchema = Field(default_factory=AgentPermissionsSchema)


class AgentResponseSchema(BaseModel):
    id: str
    owner_id: str
    project_id: str
    workspace_id: Optional[str] = None
    name: str
    description: str
    status: Literal["idle", "assigned", "paused", "terminated"]
    permissions: AgentPermissionsSchema
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExecutionPolicySchema(BaseModel):
    sandboxed_only: bool = True
    timeout_seconds: int = 30
    requires_confirmation: bool = False
    max_output_bytes: int = 1048576


class ToolResponseSchema(BaseModel):
    id: str
    name: str
    description: str
    capability: Literal["terminal", "filesystem", "github", "browser", "mcp", "ai_inference"]
    permission_requirements: List[str]
    execution_policy: ExecutionPolicySchema
    is_enabled: bool


class AuditEventCreateSchema(BaseModel):
    event_type: Literal[
        "user_action",
        "project_action",
        "workspace_action",
        "agent_action",
        "tool_execution",
        "config_change",
        "approval_decision",
        "failure"
    ]
    action: str
    project_id: Optional[str] = None
    workspace_id: Optional[str] = None
    status: Literal["success", "failure", "pending", "rejected"] = "success"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None


class AuditEventResponseSchema(BaseModel):
    id: str
    event_type: str
    actor_id: str
    actor_type: Literal["user", "agent", "system"]
    project_id: Optional[str] = None
    workspace_id: Optional[str] = None
    action: str
    status: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    timestamp: datetime


# ==========================================
# PHASE 1B: SANDBOX & EXECUTION SCHEMAS
# ==========================================

class ExecutionCreateSchema(BaseModel):
    agent_id: str
    project_id: str
    workspace_id: str
    tool_id: str
    command: str = Field(..., min_length=1, max_length=5000)


class ExecutionJobResponseSchema(BaseModel):
    id: str
    agent_id: str
    project_id: str
    workspace_id: str
    tool_id: str
    command: str
    state: Literal["draft", "planned", "approved", "executing", "executed", "failed", "cancelled", "rejected"]
    is_destructive: bool
    requires_approval: bool
    approval_id: Optional[str] = None
    audit_event_id: Optional[str] = None
    exit_code: Optional[int] = None
    stdout: str = ""
    stderr: str = ""
    output_truncated: bool = False
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalDecisionSchema(BaseModel):
    decision: Literal["approved", "rejected"]
    rejection_reason: Optional[str] = None


class ExecutionApprovalResponseSchema(BaseModel):
    id: str
    execution_id: str
    project_id: str
    workspace_id: str
    agent_id: str
    command: str
    command_fingerprint: str
    requested_by_actor: str
    decided_by_user_id: Optional[str] = None
    status: Literal["pending", "approved", "rejected", "expired"]
    rejection_reason: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    decided_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FsFileResponseSchema(BaseModel):
    path: str
    content: str
    size_bytes: int
    updated_at: datetime


class FsNodeMetadataSchema(BaseModel):
    path: str
    name: str
    type: Literal["file", "directory"]
    size_bytes: int
    updated_at: datetime


