/**
 * AI HEAVEN - OMA (Open Multi-Agent) Orchestration Contracts
 * Upstream Reference: open-multi-agent/open-multi-agent (Apache-2.0 / MIT)
 * 
 * Provides:
 * 1. Dynamic Task DAG decomposition across parallel specialist agents.
 * 2. Durable execution journal with tamper-evident cryptographic receipts.
 * 3. Consequential tool calls with durable pause/resume on approvals.
 * 4. Self-hosted execution with zero mandatory external SaaS dependency.
 */

export interface OMATaskNode {
  nodeId: string;
  name: string;
  role: 'planner' | 'researcher' | 'coder' | 'auditor' | 'tester' | 'reviewer';
  dependencies: string[]; // List of parent nodeIds
  status: 'pending' | 'running' | 'paused_for_approval' | 'completed' | 'failed';
  commandOrPrompt: string;
  inputParams: Record<string, any>;
  outputResult?: Record<string, any>;
  requiresHumanReview: boolean;
  approvalGranted?: boolean;
  retryAttempts: number;
  durationMs?: number;
}

export interface OMAExecutionJournalEntry {
  entryId: string;
  sequenceNumber: number;
  nodeId: string;
  action: string;
  actor: string;
  status: 'started' | 'step_checkpoint' | 'awaiting_approval' | 'approval_resolved' | 'completed' | 'failed';
  payloadHash: string;
  previousEntryHash: string;
  entryHash: string; // SHA-256 chained tamper-evident block
  timestamp: string;
}

export interface OMARunRecord {
  runId: string;
  goal: string;
  tenantId: string;
  dagNodes: OMATaskNode[];
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  journal: OMAExecutionJournalEntry[];
  totalRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface IOMARuntimeEngine {
  createRun(goal: string, tenantId: string): Promise<OMARunRecord>;
  advanceNode(runId: string, nodeId: string, result?: Record<string, any>): Promise<OMARunRecord>;
  grantApproval(runId: string, nodeId: string, approvedBy: string): Promise<OMARunRecord>;
  getRun(runId: string): Promise<OMARunRecord | null>;
  verifyJournalIntegrity(runId: string): Promise<{ isValid: boolean; error?: string }>;
}
