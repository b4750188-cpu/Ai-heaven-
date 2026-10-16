/**
 * AI HEAVEN - Four Beasts Shared Execution Contracts
 * Unified typed task, event, engine metadata, and execution result definitions.
 * Provides a common contract across:
 * 1. OpenHands Software Agent SDK
 * 2. jcode (Rust/TypeScript native engine)
 * 3. OpenCode (TypeScript autonomous engineer)
 * 4. AI Heaven Native Brain
 */

export type BeastEngineId = 'native_brain' | 'openhands' | 'jcode' | 'opencode';

export interface BeastEngineMetadata {
  id: BeastEngineId;
  name: string;
  version: string;
  upstreamUrl: string;
  upstreamLicense: string;
  integrationType: 'source_incorporated' | 'native_package' | 'hybrid_adapter' | 'native_core';
  runtime: 'Node.js/TypeScript' | 'Rust/Wasm' | 'Python/Node Bridge' | 'TypeScript/Node';
  status: 'operational' | 'degraded' | 'offline';
  description: string;
  specializations: string[];
  capabilities: {
    terminalExecution: boolean;
    fileEditing: boolean;
    multiStepPlanning: boolean;
    codebaseIndexing: boolean;
    securityAuditing: boolean;
    sessionCheckpointing: boolean;
    diffGeneration: boolean;
    fastPathPatches: boolean;
  };
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    avgLatencyMs: number;
    lastActiveAt: string | null;
  };
}

export interface EngineTaskRequest {
  id: string;
  goal: string;
  conversationId?: string;
  tenantId?: string;
  preferredEngine?: BeastEngineId;
  workspacePath?: string;
  context?: {
    files?: Record<string, string>;
    recentHistory?: Array<{ role: string; content: string }>;
    constraints?: string[];
  };
  dryRun?: boolean;
  timeoutMs?: number;
}

export type EngineEventLevel = 'info' | 'warn' | 'error' | 'success' | 'action' | 'observation';

export interface EngineEvent {
  id: string;
  taskId: string;
  engineId: BeastEngineId;
  timestamp: string;
  level: EngineEventLevel;
  type: string;
  message: string;
  data?: Record<string, any>;
}

export interface EngineTaskResult {
  id: string;
  taskId: string;
  engineId: BeastEngineId;
  status: 'completed' | 'failed' | 'cancelled' | 'rejected';
  goal: string;
  summary: string;
  output: string;
  filesChanged: Array<{
    path: string;
    action: 'created' | 'modified' | 'deleted';
    diff?: string;
  }>;
  events: EngineEvent[];
  durationMs: number;
  tokensUsed?: number;
  verificationStatus: 'verified' | 'unverified' | 'failed';
  verificationDetails?: string;
  cryptographicSignature?: string;
  executedAt: string;
}

export interface IUnifiedBeastEngine {
  readonly metadata: BeastEngineMetadata;
  initialize(): Promise<void>;
  checkHealth(): Promise<{ status: 'operational' | 'degraded' | 'offline'; latencyMs: number; message: string }>;
  executeTask(
    request: EngineTaskRequest,
    onEvent?: (event: EngineEvent) => void
  ): Promise<EngineTaskResult>;
  cancelTask(taskId: string): Promise<boolean>;
}
