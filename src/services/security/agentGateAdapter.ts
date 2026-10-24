/**
 * AI HEAVEN - AgentGate Zero-Trust Security Gateway Adapter
 * Upstream Reference: agentkitai/agentgate (Apache-2.0)
 * 
 * Provides:
 * 1. Payload-level tool interception and policy evaluation.
 * 2. Automated routing of high-risk or destructive actions to Human-in-the-Loop (HITL) review.
 * 3. Cryptographic audit evidence hashing for all evaluated tool calls.
 * 4. Integrates seamlessly with AI Heaven's Policy Guard and Execution Manager.
 */

import crypto from 'crypto';
import {
  AgentGateEvaluationRequest,
  AgentGateEvaluationResponse,
  AgentGatePolicy,
  IAgentGateGateway
} from '../../contracts/agentGate';

export class AgentGateAdapter implements IAgentGateGateway {
  private policies: Map<string, AgentGatePolicy> = new Map();

  constructor() {
    this.seedDefaultGatePolicies();
  }

  private seedDefaultGatePolicies() {
    const defaultPolicies: AgentGatePolicy[] = [
      {
        policyId: 'gate_block_host_escalation',
        name: 'Block Host Escalation Commands',
        description: 'Blocks root/sudo and credential dumping payloads before execution.',
        resourcePattern: '.*(sudo|chroot|/etc/shadow|/etc/passwd).*',
        ruleExpression: 'payload.matches("sudo|chroot|/etc/shadow")',
        action: 'intercept_and_reject',
        severity: 'critical'
      },
      {
        policyId: 'gate_require_approval_destructive',
        name: 'Gate Destructive Workspace Changes',
        description: 'Intercepts directory deletion and git force-clean for human review.',
        resourcePattern: '.*(rm\\s+-rf|rmdir|git\\s+clean\\s+-f|drop\\s+table).*',
        ruleExpression: 'payload.matches("rm -rf|rmdir|git clean|drop table")',
        action: 'route_to_human_approval',
        severity: 'high'
      },
      {
        policyId: 'gate_block_cloud_metadata_egress',
        name: 'Block Cloud Metadata Exfiltration',
        description: 'Blocks SSRF attempts to 169.254.169.254 or internal metadata services.',
        resourcePattern: '.*(169\\.254\\.169\\.254|metadata\\.google\\.internal).*',
        ruleExpression: 'payload.matches("169.254.169.254")',
        action: 'intercept_and_reject',
        severity: 'critical'
      }
    ];

    for (const p of defaultPolicies) {
      this.policies.set(p.policyId, p);
    }
  }

  public registerPolicy(policy: AgentGatePolicy): void {
    this.policies.set(policy.policyId, policy);
  }

  public getPolicies(): AgentGatePolicy[] {
    return Array.from(this.policies.values());
  }

  public async evaluateToolCall(request: AgentGateEvaluationRequest): Promise<AgentGateEvaluationResponse> {
    const now = new Date().toISOString();
    const payload = `${request.commandOrPayload} ${JSON.stringify(request.parameters)}`.trim();
    const auditEvidenceHash = crypto.createHash('sha256').update(`${request.agentId}:${request.toolId}:${payload}:${now}`).digest('hex');

    for (const policy of this.policies.values()) {
      try {
        const regex = new RegExp(policy.resourcePattern, 'i');
        if (regex.test(payload)) {
          if (policy.action === 'intercept_and_reject') {
            return {
              decision: 'intercept_and_reject',
              isAllowed: false,
              requiresHumanReview: false,
              violatedPolicyId: policy.policyId,
              reason: `AgentGate Zero-Trust Interception [${policy.policyId}]: ${policy.description}`,
              auditEvidenceHash,
              timestamp: now
            };
          }

          if (policy.action === 'route_to_human_approval') {
            return {
              decision: 'route_to_human_approval',
              isAllowed: false,
              requiresHumanReview: true,
              violatedPolicyId: policy.policyId,
              reason: `AgentGate Approval Gate [${policy.policyId}]: ${policy.description}`,
              auditEvidenceHash,
              timestamp: now
            };
          }
        }
      } catch {
        // Continue
      }
    }

    // Default: Allowed
    return {
      decision: 'allow',
      isAllowed: true,
      requiresHumanReview: false,
      reason: 'Compliant with all AgentGate security policies.',
      auditEvidenceHash,
      timestamp: now
    };
  }
}

export const agentGateAdapter = new AgentGateAdapter();
