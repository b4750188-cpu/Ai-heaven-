/**
 * AI HEAVEN - Phase 1A: Core Foundation Types
 * Formal contracts for Users, Projects, Workspaces, Agents, Tools, and Audit Events.
 * Strictly decoupled and ready for future container sandboxes and autonomous droids.
 */

export interface UserIdentity {
  provider: 'local' | 'google' | 'github';
  provider_user_id: string;
  email: string;
  last_authenticated_at: string;
}

export interface UserProfile {
  full_name: string;
  avatar_url?: string;
  organization?: string;
  preferences?: Record<string, unknown>;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'auditor';
  is_active: boolean;
  profile: UserProfile;
  identities: UserIdentity[];
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'active' | 'archived' | 'suspended';

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WorkspaceStatus = 'ready' | 'provisioning' | 'stopped' | 'failed';

export interface Workspace {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  filesystem_ref: string; // Isolated filesystem or mount path reference
  sandbox_ref?: string;   // Prepared reference for future isolated container/sandbox
  status: WorkspaceStatus;
  environment_variables?: Record<string, string>; // Strictly tenant-isolated
  created_at: string;
  updated_at: string;
}

export type AgentStatus = 'idle' | 'assigned' | 'paused' | 'terminated';

export interface AgentPermissions {
  allowed_tools: string[];       // Explicit whitelist of tool IDs
  network_access: boolean;      // Default false for security
  filesystem_scope: 'workspace_only' | 'read_only' | 'none';
  requires_approval_for_destructive: boolean;
}

export interface AgentDefinition {
  id: string;
  owner_id: string;
  project_id: string;
  workspace_id?: string;
  name: string;
  description: string;
  status: AgentStatus;
  permissions: AgentPermissions;
  created_at: string;
  updated_at: string;
}

export type ToolCapability =
  | 'terminal'
  | 'filesystem'
  | 'github'
  | 'browser'
  | 'mcp'
  | 'ai_inference';

export interface ExecutionPolicy {
  sandboxed_only: boolean;
  timeout_seconds: number;
  requires_confirmation: boolean;
  max_output_bytes: number;
}

export interface ToolProvenance {
  source_provider: string;
  author: string;
  verified: boolean;
  registered_at: string;
  spec_url?: string;
}

export interface ToolAuthentication {
  type: 'none' | 'api_key' | 'jwt' | 'bearer' | 'oauth';
  required: boolean;
  header_or_param?: string;
  description?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  provider?: string;
  description: string;
  capability: ToolCapability;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  permissions?: string[];
  risk_level?: 'low' | 'medium' | 'high' | 'destructive';
  authentication_requirements?: ToolAuthentication;
  availability?: 'ready' | 'degraded' | 'disabled';
  provenance?: ToolProvenance;
  permission_requirements: string[];
  execution_policy: ExecutionPolicy;
  is_enabled: boolean;
}

export type AuditEventType =
  | 'user_action'
  | 'project_action'
  | 'workspace_action'
  | 'agent_action'
  | 'tool_execution'
  | 'config_change'
  | 'approval_decision'
  | 'failure';

export type AuditEventStatus = 'success' | 'failure' | 'pending' | 'rejected';

export interface AuditEvent {
  id: string;
  correlation_id?: string;
  event_type: AuditEventType;
  actor_id: string;
  actor_type: 'user' | 'agent' | 'system';
  resource?: string;
  project_id?: string;
  workspace_id?: string;
  action: string;
  status: AuditEventStatus;
  result?: string;
  metadata: Record<string, unknown>;
  error_message?: string;
  timestamp: string;
}

export interface DroidManifest {
  droid_id: string;
  name: string;
  version: string;
  description: string;
  state: string;
  health: string;
  capabilities: {
    allowed_tools: string[];
    allowed_resources: string[];
    filesystem_scope: 'workspace_only' | 'read_only' | 'none';
    network_scope: 'denied' | 'allow_outbound' | 'unrestricted';
    approval_requirements: {
      destructive_operations: boolean;
      network_access: boolean;
      filesystem_mutations: boolean;
    };
    max_execution_time_seconds: number;
    max_memory_mb: number;
  };
  provenance: {
    author: string;
    organization: string;
    specification_version: string;
    runtime_engine: string;
    created_at: string;
    verified: boolean;
  };
  heartbeat_at: string;
  last_activity_at: string;
}

export interface ExecutionReceipt {
  receipt_id: string;
  task_id: string;
  correlation_id: string;
  agent_id: string;
  project_id: string;
  workspace_id: string;
  goal: string;
  plan: Array<{
    step_number: number;
    purpose: string;
    tool_id: string;
    command: string;
    expected_result: string;
    risk_classification: string;
    requires_approval: boolean;
    status: string;
    execution_id?: string;
  }>;
  actions_performed: Array<{
    step_number: number;
    action_id: string;
    tool_id: string;
    command: string;
    status: string;
    duration_ms: number;
    completed_at?: string;
  }>;
  tools_used: string[];
  resources_accessed: string[];
  approvals: Array<{
    approval_id: string;
    action: string;
    decision: 'approved' | 'rejected';
    decided_by: string;
    decided_at: string;
    rejection_reason?: string;
  }>;
  outputs: Record<string, string>;
  failures: string[];
  duration_ms: number;
  final_status: 'completed' | 'failed' | 'cancelled';
  completed_at: string;
  provenance: {
    engine: string;
    sandbox_isolation: string;
    cryptographic_signature?: string;
  };
}
