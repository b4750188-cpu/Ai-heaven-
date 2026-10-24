/**
 * AI HEAVEN - Polos Durable Agent Execution Platform Contracts
 * Upstream Reference: polos-dev/polos, polos.dev (Apache-2.0 / MIT)
 * 
 * Provides:
 * 1. Step-level side effect memoization with deterministic idempotency keys.
 * 2. Automatic checkpointing of tool responses and LLM decisions.
 * 3. Crash recovery without duplicate operations or duplicate billable API calls.
 * 4. Seamless integration with AI Heaven's sandbox executor.
 */

export interface PolosStepCheckpoint {
  stepKey: string;
  actionName: string;
  inputHash: string;
  outputPayload: unknown;
  executedAt: string;
  memoized: boolean;
}

export interface PolosExecutionSession {
  sessionId: string;
  agentId: string;
  status: 'active' | 'suspended' | 'recovered' | 'completed' | 'failed';
  checkpoints: Map<string, PolosStepCheckpoint>;
  totalStepsExecuted: number;
  totalStepsMemoized: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface PolosExecutionOptions {
  sessionId?: string;
  agentId: string;
  tenantId?: string;
  maxRetries?: number;
}

export interface IPolosRuntimeAdapter {
  createSession(options: PolosExecutionOptions): PolosExecutionSession;
  executeStep<T>(
    sessionId: string,
    actionName: string,
    inputs: Record<string, unknown>,
    operation: () => Promise<T>
  ): Promise<{ result: T; wasMemoized: boolean }>;
  getSession(sessionId: string): PolosExecutionSession | undefined;
  listSessions(): Array<Omit<PolosExecutionSession, 'checkpoints'> & { checkpointCount: number }>;
}
