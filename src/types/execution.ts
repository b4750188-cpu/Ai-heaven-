/**
 * AI HEAVEN - Phase 1B: Sandboxed Workspace Runtime & Execution Boundary Types
 * Defines the state machine, virtual filesystem interfaces, human approval boundaries,
 * and sandbox execution protocols.
 */

export type ExecutionState =
  | 'draft'
  | 'planned'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'failed'
  | 'cancelled'
  | 'rejected';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ExecutionApproval {
  id: string;
  execution_id: string;
  project_id: string;
  workspace_id: string;
  agent_id: string;
  command: string;
  command_fingerprint: string;
  requested_by_actor: 'agent' | 'user';
  decided_by_user_id?: string;
  status: ApprovalStatus;
  rejection_reason?: string;
  created_at: string;
  expires_at: string;
  decided_at?: string;
}

export interface ExecutionJob {
  id: string;
  agent_id: string;
  project_id: string;
  workspace_id: string;
  tool_id: string;
  command: string;
  state: ExecutionState;
  is_destructive: boolean;
  requires_approval: boolean;
  approval_id?: string;
  audit_event_id?: string;
  exit_code?: number;
  stdout: string;
  stderr: string;
  output_truncated: boolean;
  error_message?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface FsNodeMetadata {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size_bytes: number;
  updated_at: string;
}

export interface FsFileContent {
  path: string;
  content: string;
  size_bytes: number;
  updated_at: string;
}

export interface IWorkspaceFilesystemProvider {
  createFile(workspaceId: string, filePath: string, content: string, agentScope?: string): Promise<FsFileContent>;
  readFile(workspaceId: string, filePath: string, agentScope?: string): Promise<FsFileContent>;
  writeFile(workspaceId: string, filePath: string, content: string, agentScope?: string): Promise<FsFileContent>;
  listFiles(workspaceId: string, directoryPath?: string, agentScope?: string): Promise<FsNodeMetadata[]>;
  deleteFile(workspaceId: string, filePath: string, agentScope?: string): Promise<boolean>;
  moveFile(workspaceId: string, sourcePath: string, targetPath: string, agentScope?: string): Promise<boolean>;
}

export interface SandboxExecutionRequest {
  agent_id: string;
  project_id: string;
  workspace_id: string;
  tool_id: string;
  command: string;
  environment_overrides?: Record<string, string>;
}

export interface SandboxExecutionResult {
  execution_id: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  output_truncated: boolean;
  duration_ms: number;
}
