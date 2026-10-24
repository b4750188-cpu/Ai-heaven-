/**
 * AI HEAVEN - AgentGate Zero-Trust Security Gateway Contracts
 * Upstream Reference: agentkitai/agentgate (Apache-2.0)
 * 
 * Intercepts tool calls, evaluates payload-level safety, enforces CEL-like policies,
 * and routes dangerous actions to human approval queues.
 */

export type AgentGateDecision = 'allow' | 'intercept_and_reject' | 'route_to_human_approval';

export interface AgentGatePolicy {
  policyId: string;
  name: string;
  description: string;
  resourcePattern: string;
  ruleExpression: string; // e.g. "tool.id == 'terminal' && !agent.permissions.network_access"
  action: AgentGateDecision;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentGateEvaluationRequest {
  toolId: string;
  agentId: string;
  agentRole?: string;
  commandOrPayload: string;
  parameters?: Record<string, any>;
  tenantId?: string;
  projectId?: string;
}

export interface AgentGateEvaluationResponse {
  decision: AgentGateDecision;
  isAllowed: boolean;
  requiresHumanReview: boolean;
  violatedPolicyId?: string;
  reason: string;
  auditEvidenceHash: string;
  timestamp: string;
}

export interface IAgentGateGateway {
  evaluateToolCall(request: AgentGateEvaluationRequest): Promise<AgentGateEvaluationResponse>;
  registerPolicy(policy: AgentGatePolicy): void;
  getPolicies(): AgentGatePolicy[];
}
