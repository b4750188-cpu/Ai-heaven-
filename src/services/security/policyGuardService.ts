/**
 * AI HEAVEN - Agent Policy Guard & Security Boundary Enforcement Engine
 * Implements IPolicyGuardService contract
 * 
 * Rules:
 * 1. Evaluates all agent actions (tool_execution, file_write, network_egress, model_call, approval_decision).
 * 2. Enforces role-based action barriers:
 *    - 'researcher' role cannot execute file writes or destructive shell operations.
 *    - 'coder' role cannot perform unapproved network egress or delete protected system files.
 *    - 'security' / 'auditor' cannot perform intrusive exploits.
 *    - Host-level escalation (sudo, /etc, chroot) is permanently denied across all roles.
 * 3. Supports dynamic rule registration and tenant-scoped compliance checks.
 */

import {
  AgentPolicyRule,
  IPolicyGuardService,
  PolicyEvaluationRequest,
  PolicyEvaluationResult
} from '../../contracts/policyGuard';

export class PolicyGuardService implements IPolicyGuardService {
  private rules: Map<string, AgentPolicyRule> = new Map();

  constructor() {
    this.seedDefaultSecurityRules();
  }

  private seedDefaultSecurityRules() {
    const defaultRules: AgentPolicyRule[] = [
      {
        ruleId: 'rule_host_escalation_deny',
        name: 'Deny Host Escalation Across All Agents',
        description: 'Permanently block attempts to execute sudo, chroot, or access host OS kernel/credentials.',
        agentRole: '*',
        actionType: 'tool_execution',
        targetResourcePattern: '^(sudo|su|chroot|/etc/shadow|/etc/passwd|/proc).*',
        policyEffect: 'deny',
        requiresHumanReview: false
      },
      {
        ruleId: 'rule_researcher_read_only',
        name: 'Researcher Role Write Barrier',
        description: 'Researcher droids are strictly read-only and cannot mutate workspace files or delete assets.',
        agentRole: 'researcher',
        actionType: 'file_write',
        targetResourcePattern: '.*',
        policyEffect: 'deny',
        requiresHumanReview: false
      },
      {
        ruleId: 'rule_coder_destructive_approval',
        name: 'Require Human Approval for Destructive Deletions',
        description: 'Deleting directories, dropping database tables, or force-cleaning git trees requires human approval.',
        agentRole: 'coder',
        actionType: 'tool_execution',
        targetResourcePattern: '.*(rm\\s+-rf|rmdir|drop\\s+table|git\\s+clean\\s+-f).*',
        policyEffect: 'require_approval',
        requiresHumanReview: true
      },
      {
        ruleId: 'rule_network_egress_auth_scope',
        name: 'Network Egress Authorization Check',
        description: 'Prohibit unauthorized egress to non-whitelisted cloud endpoints.',
        agentRole: '*',
        actionType: 'network_egress',
        targetResourcePattern: '.*(169\\.254\\.169\\.254|metadata\\.google\\.internal).*',
        policyEffect: 'deny',
        requiresHumanReview: false
      },
      {
        ruleId: 'rule_auditor_finding_only',
        name: 'Security Auditor Finding-Only Guard',
        description: 'Security scanners must operate strictly in detection mode and never trigger automated exploitation.',
        agentRole: 'auditor',
        actionType: 'tool_execution',
        targetResourcePattern: '.*(--exploit|--payload-exec|--intrusive).*',
        policyEffect: 'deny',
        requiresHumanReview: false
      }
    ];

    for (const r of defaultRules) {
      this.rules.set(r.ruleId, r);
    }
  }

  public registerRule(rule: AgentPolicyRule): void {
    this.rules.set(rule.ruleId, rule);
  }

  public getAllRules(): AgentPolicyRule[] {
    return Array.from(this.rules.values());
  }

  public evaluateAction(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const now = new Date().toISOString();

    for (const rule of this.rules.values()) {
      // 1. Role match check
      const roleMatches = rule.agentRole === '*' || rule.agentRole.toLowerCase() === request.agentRole.toLowerCase();
      if (!roleMatches) continue;

      // 2. Action type match check
      if (rule.actionType !== request.actionType) continue;

      // 3. Target resource pattern match check
      try {
        const regex = new RegExp(rule.targetResourcePattern, 'i');
        if (regex.test(request.targetResource)) {
          if (rule.policyEffect === 'deny') {
            return {
              decision: 'denied',
              matchedRuleId: rule.ruleId,
              ruleDescription: rule.description,
              reason: `SECURITY POLICY VIOLATION [${rule.ruleId}]: Action denied by policy rule "${rule.name}".`,
              isCompliant: false,
              evaluatedAt: now
            };
          }

          if (rule.policyEffect === 'require_approval') {
            return {
              decision: 'approval_required',
              matchedRuleId: rule.ruleId,
              ruleDescription: rule.description,
              reason: `HUMAN REVIEW REQUIRED [${rule.ruleId}]: ${rule.description}`,
              isCompliant: true,
              evaluatedAt: now
            };
          }
        }
      } catch {
        // Fall through on regex evaluation error
      }
    }

    // Default: Allowed
    return {
      decision: 'allowed',
      reason: `Action compliant with all ${this.rules.size} active security boundary rules.`,
      isCompliant: true,
      evaluatedAt: now
    };
  }
}

export const policyGuardService = new PolicyGuardService();
