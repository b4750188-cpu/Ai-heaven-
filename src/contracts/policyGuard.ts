/**
 * AI HEAVEN - Server-Side Policy Guard & Security Boundary Contracts
 * Part 7/10 Integration: Agent Policy/Guard, Infisical Secret Isolation, Supply-Chain Checks
 */

export interface AgentPolicyRule {
  ruleId: string;
  name: string;
  description: string;
  agentRole: string; // 'researcher' | 'coder' | 'auditor' | 'reviewer' | '*'
  actionType: 'tool_execution' | 'file_write' | 'network_egress' | 'model_call' | 'approval_decision';
  targetResourcePattern: string; // regex or glob e.g. "workspace/*", "target.scope.com"
  policyEffect: 'allow' | 'deny' | 'require_approval';
  requiresHumanReview: boolean;
}

export interface PolicyEvaluationRequest {
  agentId: string;
  agentRole: string;
  actionType: 'tool_execution' | 'file_write' | 'network_egress' | 'model_call' | 'approval_decision';
  targetResource: string;
  parameters?: Record<string, any>;
  tenantId: string;
}

export interface PolicyEvaluationResult {
  decision: 'allowed' | 'denied' | 'approval_required';
  matchedRuleId?: string;
  ruleDescription?: string;
  reason: string;
  isCompliant: boolean;
  evaluatedAt: string;
}

export interface IPolicyGuardService {
  evaluateAction(request: PolicyEvaluationRequest): PolicyEvaluationResult;
  registerRule(rule: AgentPolicyRule): void;
  getAllRules(): AgentPolicyRule[];
}
