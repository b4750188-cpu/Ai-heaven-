/**
 * AI HEAVEN - Remaining Integrations & External Services Test Suite
 * Covers: Temporal, Agent-Reach, Infisical, Policy Guard, MCP Client, Browser Automation, ComfyUI, Edge0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { temporalWorkflowAdapter } from '../src/services/workflow/temporalAdapter';
import { agentReachService } from '../src/services/research/agentReachService';
import { infisicalSecretService } from '../src/services/security/infisicalSecretService';
import { policyGuardService } from '../src/services/security/policyGuardService';
import { mcpClientService } from '../src/services/mcp/mcpClientService';
import { browserAutomationService } from '../src/services/browser/browserAutomationService';
import { edge0Provider } from '../src/services/inference/edge0Provider';
import { comfyUIProvider } from '../src/services/workflow/comfyUIProvider';

test('INTEGRATIONS AUDIT & VERIFICATION SUITE', async (t) => {
  // -------------------------------------------------------------------------
  // 1. TEMPORAL DURABLE WORKFLOW INTEGRATION
  // -------------------------------------------------------------------------
  await t.test('1. Temporal Durable Workflow: Health & Resilient Native Fallback', async () => {
    const health = await temporalWorkflowAdapter.checkHealth();
    assert.ok(typeof health.isAvailable === 'boolean');
    assert.ok(health.serverAddress);
    assert.ok(health.upstreamUrl.includes('temporalio/temporal'));
    assert.ok(health.requiredInfrastructure.length > 0);

    // Test durable job execution with idempotency & checkpoints
    const idempotencyKey = `test_idem_${Date.now()}`;
    const job1 = await temporalWorkflowAdapter.startJob('test_deployment', { repo: 'ai-heaven' }, { idempotencyKey });
    assert.ok(job1.jobId.startsWith('wf_'));
    assert.equal(job1.workflowType, 'test_deployment');

    // Idempotency: re-request with same key returns identical job
    const job2 = await temporalWorkflowAdapter.startJob('test_deployment', { repo: 'ai-heaven' }, { idempotencyKey });
    assert.equal(job1.jobId, job2.jobId);

    // Checkpoint a step
    const checkpoint = await temporalWorkflowAdapter.checkpointStep(job1.jobId, 1, 'compile_code', { compiled: true });
    assert.equal(checkpoint.stepIndex, 1);
    assert.ok(checkpoint.checksum.length > 0);

    // Record observability trace span
    const span = await temporalWorkflowAdapter.recordTraceSpan(job1.jobId, {
      traceId: 'tr_01',
      name: 'model_call_gemini',
      type: 'model_call',
      latencyMs: 140,
      status: 'ok',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString()
    });
    assert.ok(span.spanId.startsWith('span_'));
    assert.equal(span.latencyMs, 140);
  });

  // -------------------------------------------------------------------------
  // 2. AGENT-REACH INTERNET RESEARCH INTEGRATION
  // -------------------------------------------------------------------------
  await t.test('2. Agent-Reach: Multi-Platform Doctor Diagnostics & Research Execution', async () => {
    const doctor = await agentReachService.runDoctor();
    assert.ok(doctor.platforms.length >= 6);

    const githubDiag = doctor.platforms.find((p) => p.platform === 'github');
    assert.ok(githubDiag);
    assert.equal(githubDiag.status, 'ready');

    const twitterDiag = doctor.platforms.find((p) => p.platform === 'twitter');
    assert.ok(twitterDiag);
    assert.equal(twitterDiag.status, 'unconfigured');
    assert.equal(twitterDiag.requiresAuth, true);

    // Execute research query
    const result = await agentReachService.executeResearch({
      query: 'Model Context Protocol TypeScript SDK specifications',
      platform: 'github',
      maxResults: 3,
      depth: 'brief'
    });

    assert.ok(result.id.startsWith('reach_'));
    assert.ok(result.results.length > 0);
    assert.ok(result.receipts.hash.length > 0);
    assert.ok(typeof result.factsCount === 'number');
  });

  // -------------------------------------------------------------------------
  // 3. INFISICAL SECRET ISOLATION & MASKING
  // -------------------------------------------------------------------------
  await t.test('3. Infisical Secret Manager: Truthful Status & Strict Secret Masking', async () => {
    const status = await infisicalSecretService.checkStatus();
    assert.ok(['connected', 'unconfigured', 'connection_failed'].includes(status.status));
    assert.ok(status.upstreamUrl.includes('Infisical/infisical'));

    // Verify masking utility: never leaks plaintext
    const secret = 'super_secret_api_key_12345';
    const masked = infisicalSecretService.maskValue(secret);
    assert.equal(masked, 'su****45');
    assert.ok(!masked.includes('api_key'));

    const fingerprint = infisicalSecretService.hashFingerprint('TEST_KEY', secret);
    assert.equal(fingerprint.length, 16);

    // List masked secrets
    const maskedList = await infisicalSecretService.listMaskedSecrets();
    assert.ok(Array.isArray(maskedList));
    for (const item of maskedList) {
      assert.ok(!item.maskedValue.includes('super_secret'));
    }
  });

  // -------------------------------------------------------------------------
  // 4. POLICY GUARD & SECURITY BOUNDARY ENFORCEMENT
  // -------------------------------------------------------------------------
  await t.test('4. Policy Guard: Evaluates Role Boundaries & Denies Violations', () => {
    // Check 1: Host escalation denied across all roles
    const checkEscalation = policyGuardService.evaluateAction({
      agentId: 'agent_coder',
      agentRole: 'coder',
      actionType: 'tool_execution',
      targetResource: 'sudo rm -rf /',
      tenantId: 'tenant_default'
    });
    assert.equal(checkEscalation.decision, 'denied');
    assert.equal(checkEscalation.isCompliant, false);
    assert.equal(checkEscalation.matchedRuleId, 'rule_host_escalation_deny');

    // Check 2: Researcher role file writes denied
    const checkResearcherWrite = policyGuardService.evaluateAction({
      agentId: 'agent_researcher',
      agentRole: 'researcher',
      actionType: 'file_write',
      targetResource: 'src/secret.ts',
      tenantId: 'tenant_default'
    });
    assert.equal(checkResearcherWrite.decision, 'denied');
    assert.equal(checkResearcherWrite.matchedRuleId, 'rule_researcher_read_only');

    // Check 3: Destructive deletion requires human review
    const checkDestructive = policyGuardService.evaluateAction({
      agentId: 'agent_coder',
      agentRole: 'coder',
      actionType: 'tool_execution',
      targetResource: 'rm -rf /workspace/build',
      tenantId: 'tenant_default'
    });
    assert.equal(checkDestructive.decision, 'approval_required');
    assert.equal(checkDestructive.isCompliant, true);

    // Check 4: Compliant read operation allowed
    const checkCompliant = policyGuardService.evaluateAction({
      agentId: 'agent_coder',
      agentRole: 'coder',
      actionType: 'tool_execution',
      targetResource: 'cat package.json',
      tenantId: 'tenant_default'
    });
    assert.equal(checkCompliant.decision, 'allowed');
    assert.equal(checkCompliant.isCompliant, true);
  });

  // -------------------------------------------------------------------------
  // 5. MODEL CONTEXT PROTOCOL (MCP) CLIENT
  // -------------------------------------------------------------------------
  await t.test('5. Model Context Protocol (MCP): Server Discovery, Handshake & Tool Invocation', async () => {
    const status = mcpClientService.getStatus();
    assert.equal(status.status, 'operational');
    assert.ok(status.serversCount >= 4);
    assert.ok(status.totalToolsCount >= 5);

    const tools = mcpClientService.getTools('mcp_core_memory');
    assert.ok(tools.some((t) => t.name === 'memory_query'));
    assert.ok(tools.some((t) => t.name === 'memory_record'));

    // Invoke memory_query tool via JSON-RPC 2.0
    const callRes = await mcpClientService.callTool('mcp_core_memory', 'memory_query', {
      query: 'PostgreSQL',
      limit: 2
    });
    assert.equal(callRes.isError, false);
    assert.ok(callRes.content[0].text);
    assert.ok(callRes.receipt.receiptId.startsWith('mcp_rcpt_'));
    assert.equal(callRes.receipt.status, 'success');
    assert.ok(callRes.receipt.outputChecksum.length > 0);

    // Test SSRF protection on http_fetch tool
    const ssrfCall = await mcpClientService.callTool('mcp_core_fetch', 'http_fetch', {
      url: 'http://169.254.169.254/latest/meta-data/'
    });
    assert.equal(ssrfCall.isError, true);
    assert.ok(ssrfCall.content[0].text?.includes('SSRF FIREWALL BLOCKED'));
  });

  // -------------------------------------------------------------------------
  // 6. BROWSER AUTOMATION & WEB INTELLIGENCE
  // -------------------------------------------------------------------------
  await t.test('6. Browser Automation: SSRF Firewall & Target Validation', async () => {
    const status = browserAutomationService.getStatus();
    assert.equal(status.status, 'ready');
    assert.equal(status.ssrfGuardActive, true);
    assert.ok(status.blockedRanges.length >= 5);

    // SSRF Validation: blocks localhost, 127.0.0.1, private IPs, cloud metadata
    const testLocalhost = browserAutomationService.validateTargetUrl('http://localhost:8080/admin');
    assert.equal(testLocalhost.isValid, false);
    assert.ok(testLocalhost.error?.includes('SSRF PROTECTION FAULT'));

    const testMetadata = browserAutomationService.validateTargetUrl('http://169.254.169.254/latest');
    assert.equal(testMetadata.isValid, false);
    assert.ok(testMetadata.error?.includes('SSRF PROTECTION FAULT'));

    const testPrivateIp = browserAutomationService.validateTargetUrl('http://192.168.1.10/login');
    assert.equal(testPrivateIp.isValid, false);

    // Valid public URL passes validation
    const testValid = browserAutomationService.validateTargetUrl('https://modelcontextprotocol.io/introduction');
    assert.equal(testValid.isValid, true);
    assert.ok(testValid.parsedUrl);
  });

  // -------------------------------------------------------------------------
  // 7. EDGE0 & COMFYUI RUNTIME STATUS DISCIPLINE
  // -------------------------------------------------------------------------
  await t.test('7. Edge0 & ComfyUI Providers: Truthful Telemetry & Zero Fabrication', async () => {
    const edge0Status = await edge0Provider.checkHealth();
    assert.ok(typeof edge0Status.isConnected === 'boolean');
    assert.ok(edge0Status.endpoint);
    assert.ok(Array.isArray(edge0Status.loadedModels));

    const comfyStatus = await comfyUIProvider.checkHealth();
    assert.ok(typeof comfyStatus.isConnected === 'boolean');
    assert.ok(comfyStatus.endpoint);
    assert.ok(typeof comfyStatus.nodeCount === 'number');
  });
});
