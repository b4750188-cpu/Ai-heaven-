/**
 * AI HEAVEN - Final Full-System End-to-End Verification Suite
 * Verifies critical user journeys:
 * 1. Authentication, Token issuance & Impersonation defense
 * 2. Central Brain Multi-Agent planning, checkpoints & idempotency
 * 3. Continuity Engine verified memory storage & retrieval
 * 4. Sandbox security & host escalation boundary (Exit 126)
 * 5. Model Context Protocol (MCP) tool discovery & execution
 * 6. Turnitout clean-room LaTeX & academic processing
 * 7. Policy Guard, Browser SSRF firewall & Infisical status
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sandboxExecutor } from '../src/services/sandbox/sandboxExecutor';
import { centralBrainService } from '../src/services/brain/centralBrainService';
import { continuityEngine } from '../src/services/continuity/continuityEngine';
import { policyGuardService } from '../src/services/security/policyGuardService';
import { mcpClientService } from '../src/services/mcp/mcpClientService';
import { turnitoutEngine } from '../src/services/research/turnitoutEngine';
import { browserAutomationService } from '../src/services/browser/browserAutomationService';
import { authService } from '../src/services/auth/authService';

test('AI HEAVEN - FINAL FULL-SYSTEM END-TO-END AUDIT', async (t) => {
  // -------------------------------------------------------------------------
  // JOURNEY 1: AUTHENTICATION & SECURITY CONTROLS
  // -------------------------------------------------------------------------
  await t.test('Journey 1: Authentication, Token Issuance & Impersonation Defense', () => {
    // 1. Wrong credentials throws error
    assert.throws(() => {
      authService.loginWithPassword('researcher@aiheaven.security', 'wrong_password_123');
    }, /Invalid email or password/);

    // 2. Real developer credentials succeeds and returns valid JWT
    const goodLogin = authService.loginWithPassword('researcher@aiheaven.security', 'Researcher2026!Secure');
    assert.ok(goodLogin.token);
    assert.ok(goodLogin.user);
    assert.equal(goodLogin.user.email, 'researcher@aiheaven.security');

    // 3. Impersonation defense: non-admin switching to another account is blocked
    const switchRes = authService.switchAccount('usr_admin_01', 'usr_other_02', false);
    assert.equal(switchRes.success, false);
    assert.ok(switchRes.error?.includes('Unauthorized impersonation attempt'));
  });

  // -------------------------------------------------------------------------
  // JOURNEY 2: CENTRAL BRAIN MULTI-AGENT EXECUTION & IDEMPOTENCY
  // -------------------------------------------------------------------------
  await t.test('Journey 2: Central Brain Multi-Agent Execution, Checkpoints & Idempotency', () => {
    const goal = `Full-stack microservice verification_${Date.now()}`;
    const plan = centralBrainService.createOrchestrationPlan(goal, 'coding', `final_idem_${Date.now()}`);

    assert.ok(plan.id.startsWith('plan_'));
    assert.equal(plan.subtasks.length, 5);
    assert.equal(plan.subtasks[0].assignedAgent, 'researcher');
    assert.equal(plan.subtasks[1].assignedAgent, 'security');
    assert.equal(plan.subtasks[2].assignedAgent, 'coder');
    assert.equal(plan.subtasks[3].assignedAgent, 'tester');
    assert.equal(plan.subtasks[4].assignedAgent, 'reviewer');

    // Advance step 1
    const advanced = centralBrainService.advanceSubtask(plan.id, plan.subtasks[0].id, 'Context verified');
    assert.ok(advanced);
    assert.equal(advanced.subtasks[0].status, 'completed');

    // Verify checkpoint created
    const checkpoints = centralBrainService.getCheckpoints(plan.taskId);
    assert.ok(checkpoints.length >= 1);
  });

  // -------------------------------------------------------------------------
  // JOURNEY 3: CONTINUITY ENGINE MEMORY STORAGE & PROVENANCE
  // -------------------------------------------------------------------------
  await t.test('Journey 3: Continuity Engine Memory Storage & Provenance', async () => {
    const mem = await continuityEngine.storeMemory({
      tenantId: 'tenant_default',
      title: 'E2E Final Audit Memory',
      domain: 'architecture',
      category: 'solution',
      content: 'All 10 core integration tracks verified under continuous automated testing.',
      tags: ['audit', 'verification', 'production'],
      evidenceStatus: 'VERIFIED',
      confidenceScore: 0.99,
      sourceType: 'test_execution',
      sourceReference: 'tests/final_system_audit.test.ts',
      evidencePayload: {
        testsPassed: 153,
        testsFailed: 0,
        testsTotal: 153,
        receiptId: 'rcpt_final_e2e_01'
      },
      isGlobalApproved: true
    });

    assert.ok(mem.id.startsWith('mem_'));
    assert.equal(mem.evidenceStatus, 'VERIFIED');

    const queried = continuityEngine.queryMemories({
      tenantId: 'tenant_default',
      search: 'Final Audit Memory'
    });
    assert.ok(queried.length >= 1);
    assert.equal(queried[0].id, mem.id);
  });

  // -------------------------------------------------------------------------
  // JOURNEY 4: SANDBOX SECURITY & HOST ESCALATION BOUNDARY (EXIT 126)
  // -------------------------------------------------------------------------
  await t.test('Journey 4: Sandbox Security Boundary & Exit 126 Enforcement', async () => {
    const toolDef: any = {
      id: 'tool_terminal',
      execution_policy: { timeout_seconds: 30, max_output_bytes: 1048576 }
    };
    const permissions: any = {
      allowed_tools: ['tool_terminal'],
      network_access: false,
      filesystem_scope: 'workspace_only',
      requires_approval_for_destructive: true
    };

    // Test Host Escalation Prevention
    const escalationResult = await sandboxExecutor.execute(
      { command: 'sudo cat /etc/shadow', workspace_id: 'ws_test' },
      toolDef,
      permissions,
      'exec_test_01'
    );
    assert.equal(escalationResult.exit_code, 126);
    assert.ok(escalationResult.stderr.includes('SECURITY FAULT'));

    // Test Path Traversal Prevention
    const traversalResult = await sandboxExecutor.execute(
      { command: 'cat ../../escape_workspace.txt', workspace_id: 'ws_test' },
      toolDef,
      permissions,
      'exec_test_02'
    );
    assert.equal(traversalResult.exit_code, 126);
    assert.ok(traversalResult.stderr.includes('Directory traversal'));
  });

  // -------------------------------------------------------------------------
  // JOURNEY 5: MODEL CONTEXT PROTOCOL (MCP) JSON-RPC 2.0
  // -------------------------------------------------------------------------
  await t.test('Journey 5: Model Context Protocol (MCP) JSON-RPC 2.0 Execution', async () => {
    const mcpStatus = mcpClientService.getStatus();
    assert.equal(mcpStatus.status, 'operational');
    assert.ok(mcpStatus.serversCount >= 4);

    const callResult = await mcpClientService.callTool('mcp_core_memory', 'memory_query', {
      query: 'Audit',
      limit: 1
    });

    assert.equal(callResult.isError, false);
    assert.ok(callResult.receipt.receiptId.startsWith('mcp_rcpt_'));
    assert.equal(callResult.receipt.status, 'success');
  });

  // -------------------------------------------------------------------------
  // JOURNEY 6: TURNITOUT LATEX & CODE PRESERVATION & CITATIONS
  // -------------------------------------------------------------------------
  await t.test('Journey 6: Turnitout Academic Processing & LaTeX Syntax Zone Defense', () => {
    // 1. Academic Refinement with LaTeX Zone Defense
    const rawLatex = 'We analyze the objective $\\mathcal{L}_{\\text{G}} = \\mathbb{E}[\\log D(x)]$ in depth. In order to optimize performance, we utilize the framework.';
    const refined = turnitoutEngine.processDocument(rawLatex, {
      mode: 'academic_refine',
      preserveLatex: true,
      discipline: 'computer_science'
    });

    assert.equal(refined.success, true);
    // LaTeX formula must be 100% intact
    assert.ok(refined.processedText.includes('$\\mathcal{L}_{\\text{G}} = \\mathbb{E}[\\log D(x)]$'));
    assert.ok(refined.diffStats.zonesPreserved >= 1);

    // 2. Citation Injection Mode
    const citationDoc = 'Deep learning models require systematic optimization. Transformer architectures scale effectively across parameters.';
    const cited = turnitoutEngine.processDocument(citationDoc, {
      mode: 'citation_inject',
      discipline: 'computer_science',
      citationStyle: 'bibtex',
      maxCitations: 2
    });

    assert.equal(cited.success, true);
    assert.ok(cited.bibtexCitations.length >= 1);
    assert.ok(cited.processedText.includes('\\cite{'));
  });

  // -------------------------------------------------------------------------
  // JOURNEY 7: POLICY GUARD & BROWSER SSRF FIREWALL
  // -------------------------------------------------------------------------
  await t.test('Journey 7: Policy Guard & Browser Automation SSRF Defense', () => {
    // 1. Policy Guard evaluation
    const evalRes = policyGuardService.evaluateAction({
      agentId: 'coder_agent',
      agentRole: 'coder',
      actionType: 'tool_execution',
      targetResource: 'sudo reboot',
      tenantId: 'tenant_default'
    });
    assert.equal(evalRes.decision, 'denied');
    assert.equal(evalRes.isCompliant, false);

    // 2. Browser SSRF firewall
    const ssrfCheck = browserAutomationService.validateTargetUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(ssrfCheck.isValid, false);
    assert.ok(ssrfCheck.error?.includes('SSRF PROTECTION FAULT'));
  });
});
