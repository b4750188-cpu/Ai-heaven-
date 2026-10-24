/**
 * AI HEAVEN - OpenWOP (Open Workflow Orchestration Protocol) Contracts
 * Upstream Reference: openwop/openwop, openwop.dev (Apache-2.0 / MIT)
 * 
 * Defines vendor-neutral HTTP/JSON and SSE event contracts for:
 * 1. Workflow run initialization and deterministic stepping.
 * 2. Immutable checkpoint state capture.
 * 3. Human-in-the-loop approval barriers.
 * 4. Safe step replay with idempotency keys.
 */

export type OpenWOPRunState =
  | 'queued'
  | 'running'
  | 'paused_for_approval'
  | 'replaying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OpenWOPStep {
  stepId: string;
  stepIndex: number;
  name: string;
  actor: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  idempotencyKey: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface OpenWOPCheckpoint {
  checkpointId: string;
  runId: string;
  stepIndex: number;
  stateSnapshot: Record<string, unknown>;
  stateHash: string; // SHA-256 state seal
  createdAt: string;
}

export interface OpenWOPRunRecord {
  runId: string;
  workflowName: string;
  tenantId: string;
  state: OpenWOPRunState;
  currentStepIndex: number;
  steps: OpenWOPStep[];
  checkpoints: OpenWOPCheckpoint[];
  variables: Record<string, unknown>;
  pendingApproval?: {
    approvalId: string;
    stepId: string;
    description: string;
    requestedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OpenWOPEvent {
  eventId: string;
  runId: string;
  eventType:
    | 'run.started'
    | 'step.started'
    | 'step.completed'
    | 'checkpoint.saved'
    | 'approval.requested'
    | 'approval.resolved'
    | 'run.completed'
    | 'run.failed';
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface IOpenWOPAdapter {
  createRun(workflowName: string, initialInputs: Record<string, unknown>, tenantId?: string): Promise<OpenWOPRunRecord>;
  getRun(runId: string): Promise<OpenWOPRunRecord | null>;
  advanceRun(runId: string): Promise<{ run: OpenWOPRunRecord; event: OpenWOPEvent }>;
  resolveApproval(runId: string, approved: boolean, actor: string): Promise<OpenWOPRunRecord>;
  replayFromCheckpoint(runId: string, checkpointId: string): Promise<OpenWOPRunRecord>;
  getEvents(runId: string): Promise<OpenWOPEvent[]>;
}
