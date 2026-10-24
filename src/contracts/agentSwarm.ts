/**
 * AI HEAVEN - Agent Swarm Contracts & Coordination Types
 * Upstream Reference: openai/swarm (MIT) / Swarm Orchestration Pattern
 * 
 * Provides:
 * 1. Declarative agent definitions with available tools and handoff targets.
 * 2. Swarm execution loop with dynamic agent handoffs.
 * 3. Shared swarm context variables across agent delegations.
 * 4. Multi-agent swarm consensus and routine execution.
 */

export interface SwarmAgentConfig {
  agentId: string;
  name: string;
  instructions: string;
  role: 'triage' | 'specialist' | 'reviewer' | 'security' | 'coordinator';
  allowedTools: string[];
  handoffTargets: string[]; // List of agentIds this agent can delegate to
}

export interface SwarmHandoffRequest {
  fromAgentId: string;
  targetAgentId: string;
  reason: string;
  contextDelta?: Record<string, unknown>;
}

export interface SwarmStepEvent {
  stepId: string;
  stepNumber: number;
  agentId: string;
  agentName: string;
  action: 'message' | 'tool_call' | 'handoff';
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  handoffTo?: string;
  timestamp: string;
}

export interface SwarmRunRequest {
  swarmId?: string;
  initialAgentId: string;
  prompt: string;
  contextVariables?: Record<string, unknown>;
  maxHandoffs?: number;
  tenantId?: string;
}

export interface SwarmRunResult {
  runId: string;
  status: 'completed' | 'max_handoffs_exceeded' | 'failed' | 'paused_for_approval';
  initialAgentId: string;
  activeAgentId: string;
  finalMessage: string;
  contextVariables: Record<string, unknown>;
  totalSteps: number;
  totalHandoffs: number;
  events: SwarmStepEvent[];
  startedAt: string;
  completedAt: string;
}

export interface IAgentSwarmEngine {
  registerAgent(config: SwarmAgentConfig): void;
  getAgent(agentId: string): SwarmAgentConfig | undefined;
  listAgents(): SwarmAgentConfig[];
  executeSwarmRun(request: SwarmRunRequest): Promise<SwarmRunResult>;
}
