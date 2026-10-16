/**
 * AI HEAVEN - Durable Workflows, Checkpointing & Observability Contracts
 * Part 6/10 Integration: Temporal, Langfuse, Phoenix, DeepEval, Sentry
 */

export type DurableWorkflowStatus =
  | 'pending'
  | 'running'
  | 'checkpointed'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowCheckpoint {
  checkpointId: string;
  stepIndex: number;
  stepName: string;
  stateSnapshot: Record<string, any>;
  timestamp: string;
  checksum: string;
}

export interface ObservabilityTraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  type: 'model_call' | 'tool_invocation' | 'agent_step' | 'scanner_execution' | 'retrieval';
  modelId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs: number;
  status: 'ok' | 'error';
  errorMessage?: string;
  startedAt: string;
  endedAt: string;
}

export interface DurableJobRecord {
  jobId: string;
  workflowType: string;
  tenantId: string;
  status: DurableWorkflowStatus;
  currentStepIndex: number;
  totalSteps: number;
  maxRetries: number;
  retryCount: number;
  idempotencyKey: string;
  requiresApproval: boolean;
  approvalGranted?: boolean;
  checkpoints: WorkflowCheckpoint[];
  spans: ObservabilityTraceSpan[];
  inputPayload: Record<string, any>;
  outputResult?: Record<string, any>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDurableWorkflowEngine {
  startJob(type: string, input: Record<string, any>, options?: { idempotencyKey?: string; tenantId?: string; maxRetries?: number }): Promise<DurableJobRecord>;
  getJob(jobId: string): Promise<DurableJobRecord | null>;
  checkpointStep(jobId: string, stepIndex: number, stepName: string, state: Record<string, any>): Promise<WorkflowCheckpoint>;
  resumeJob(jobId: string): Promise<DurableJobRecord>;
  cancelJob(jobId: string, reason?: string): Promise<boolean>;
  recordTraceSpan(jobId: string, span: Omit<ObservabilityTraceSpan, 'spanId'>): Promise<ObservabilityTraceSpan>;
}
