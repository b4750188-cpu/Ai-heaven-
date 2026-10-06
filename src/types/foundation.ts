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

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  capability: ToolCapability;
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
  event_type: AuditEventType;
  actor_id: string;
  actor_type: 'user' | 'agent' | 'system';
  project_id?: string;
  workspace_id?: string;
  action: string;
  status: AuditEventStatus;
  metadata: Record<string, unknown>;
  error_message?: string;
  timestamp: string;
}
