/**
 * AI HEAVEN - AgentLens Observability & Flight Recorder Contracts
 * Upstream Reference: agentkitai/agentlens (MIT) / Microsoft Code Agent Trajectories
 * 
 * Records trajectory flight paths, tool call inputs/outputs, step latencies,
 * token usage, and diagnostic breadcrumbs across multi-agent workflows.
 */

export interface AgentTrajectoryStep {
  stepId: string;
  stepNumber?: number;
  agentId?: string;
  agentRole?: string;
  actorRole?: string;
  nodeId?: string;
  action?: string;
  actionType?: 'prompt' | 'tool_call' | 'approval_wait' | 'verification' | 'recovery';
  targetResource?: string;
  inputPayload: Record<string, any>;
  outputResult?: Record<string, any>;
  outputPayload?: Record<string, any>;
  rawOutputSnippet?: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'ok' | 'success' | 'error' | 'approval_pending' | 'intercepted';
  errorMessage?: string;
  timestamp: string;
}

export interface AgentTrajectoryFlightRecord {
  flightId: string;
  taskId: string;
  goal: string;
  tenantId: string;
  status: 'active' | 'completed' | 'aborted' | 'failed';
  totalSteps: number;
  totalDurationMs: number;
  totalTokensUsed: number;
  steps: AgentTrajectoryStep[];
  errorCount: number;
  rootCauseAnalysis?: string;
  fingerprintHash: string; // SHA-256 seal of the execution trajectory
  startedAt: string;
  endedAt?: string;
}

export interface IAgentLensService {
  startFlightRecord(taskId: string, goal: string, tenantId: string): AgentTrajectoryFlightRecord;
  recordStep(flightId: string, step: Omit<AgentTrajectoryStep, 'stepId' | 'timestamp'>): AgentTrajectoryStep;
  endFlightRecord(flightId: string, status: AgentTrajectoryFlightRecord['status'], rootCause?: string): AgentTrajectoryFlightRecord;
  getFlightRecord(flightId: string): AgentTrajectoryFlightRecord | null;
  listFlightRecords(tenantId?: string): AgentTrajectoryFlightRecord[];
}
