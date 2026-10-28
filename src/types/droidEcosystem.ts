/**
 * AI HEAVEN - Interconnected Droid Ecosystem & Memory Contracts
 * Defines formal identities, permissions, persistent memory,
 * inter-droid messaging protocol, and shared findings registry.
 */

export type DroidStatus = 'idle' | 'running' | 'waiting_approval' | 'paused' | 'verifying' | 'error';

export interface DroidPermissions {
  networkAccess: boolean;
  filesystemScope: 'workspace_only' | 'read_only' | 'none';
  requiresApprovalForDestructive: boolean;
  maxExecutionTimeSec: number;
  allowedMessageChannels: string[];
}

export interface DroidCurrentTask {
  taskId: string;
  title: string;
  progress: number; // 0 to 100
  startedAt: string;
  dependsOnDroidId?: string;
  status: 'in_progress' | 'completed' | 'waiting_ack' | 'blocked';
}

export interface DroidMetrics {
  messagesSent: number;
  messagesReceived: number;
  tasksCompleted: number;
  findingsContributed: number;
}

export interface DroidIdentity {
  droidId: string;
  name: string;
  codename: string;
  version: string;
  role: string;
  description: string;
  status: DroidStatus;
  capabilities: string[];
  allowedTools: string[];
  permissions: DroidPermissions;
  currentTask?: DroidCurrentTask;
  lastActiveAt: string;
  metrics: DroidMetrics;
}

export type DroidMessageType =
  | 'task_coordination'
  | 'finding_share'
  | 'dependency_signal'
  | 'status_sync'
  | 'approval_request'
  | 'ack';

export interface DroidMessage {
  id: string;
  fromDroidId: string;
  toDroidId: string | 'broadcast';
  channel: string;
  messageType: DroidMessageType;
  subject: string;
  payload: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiresAck: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  correlationId: string;
  timestamp: string;
  signature: string;
}

export interface DroidMemoryEntry {
  key: string;
  value: unknown;
  droidId: string;
  tenantId: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  tags: string[];
  updatedAt: string;
  version: number;
}

export interface SharedFinding {
  findingId: string;
  discoveredByDroidId: string;
  verifiedByDroidId?: string;
  target: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvssScore: number;
  evidenceHash: string;
  status: 'unverified' | 'verifying' | 'verified' | 'remediated';
  createdAt: string;
  reproducedTrace?: string;
}

export interface DroidEcosystemSnapshot {
  droids: DroidIdentity[];
  activeTasksCount: number;
  recentMessages: DroidMessage[];
  sharedFindings: SharedFinding[];
  totalMemoriesCount: number;
  lastSyncAt: string;
}
