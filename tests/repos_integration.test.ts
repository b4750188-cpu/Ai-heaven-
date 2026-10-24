/**
 * AI HEAVEN - Multi-Repository Integration Test Suite
 * Upstream Targets:
 * 1. Mission Control NAI (builderz-labs/mission-control)
 * 2. OMA - Open Multi-Agent (open-multi-agent/open-multi-agent)
 * 3. AgentLens (agentkitai/agentlens)
 * 4. AgentGate (agentkitai/agentgate)
 * 5. ThinkLess (VainF/Thinkless)
 * 6. Laya (NandhaKishorM/laya)
 * 7. GLiNER2.5-Decide (fastino-ai/GLiNER2)
 * 8. Thalamus (cobaltcore-dev/Thalamus)
 * + LazyCodex Hierarchical Memory (code-yeongyu/lazycodex)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { missionControlAdapter } from '../src/services/operations/missionControlAdapter';
import { omaRuntimeAdapter } from '../src/services/workflow/omaAdapter';
import { agentLensService } from '../src/services/observability/agentLensService';
import { agentGateAdapter } from '../src/services/security/agentGateAdapter';
import { thinkLessPipeline } from '../src/services/brain/thinkLessPipeline';
import { thalamusMiddleware } from '../src/services/brain/thalamusMiddleware';
import { hierarchicalMemoryService } from '../src/services/lazycodex/hierarchicalMemoryService';
import { executionManager } from '../src/services/sandbox/executionManager';
import { AgentDefinition, ToolDefinition } from '../src/types/foundation';
import { SandboxExecutionRequest } from '../src/types/execution';

describe('1. Mission Control NAI Integration', () => {
  it('aggregates fleet overview with active/idle counts and token spend', async () => {
    const overview = await missionControlAdapter.getOverview();
    assert.strictEqual(typeof overview.fleetSize, 'number');
    assert.ok(overview.fleetSize >= 5, 'Fleet must have seeded default workers');
    assert.strictEqual(typeof overview.activeWorkersCount, 'number');
    assert.strictEqual(typeof overview.idleWorkersCount, 'number');
    assert.strictEqual(typeof overview.totalTokensConsumed, 'number');
    assert.strictEqual(typeof overview.estimatedSpendUsd, 'number');
    assert.ok(overview.systemHealth === 'optimal' || overview.systemHealth === 'degraded');
  });

  it('dispatches task to worker and tracks state transition', async () => {
    const res = await missionControlAdapter.dispatchTask('worker_coder_01', 'Implement secure auth handler');
    assert.strictEqual(res.status, 'dispatched');
    assert.ok(res.taskId.startsWith('task_mc_'));

    const overview = await missionControlAdapter.getOverview();
    const coder = overview.workers.find(w => w.workerId === 'worker_coder_01');
    assert.ok(coder);
    assert.strictEqual(coder.status, 'busy');
    assert.strictEqual(coder.currentTaskId, res.taskId);
  });

  it('halts and restarts fleet workers cleanly', async () => {
    const haltRes = await missionControlAdapter.haltWorker('worker_tester_01');
    assert.strictEqual(haltRes, true);

    let overview = await missionControlAdapter.getOverview();
    let tester = overview.workers.find(w => w.workerId === 'worker_tester_01');
    assert.strictEqual(tester?.status, 'stopped');

    const restartRes = await missionControlAdapter.restartWorker('worker_tester_01');
    assert.strictEqual(restartRes, true);

    overview = await missionControlAdapter.getOverview();
    tester = overview.workers.find(w => w.workerId === 'worker_tester_01');
    assert.strictEqual(tester?.status, 'idle');
  });
});

describe('2. OMA (Open Multi-Agent) Durable DAG Orchestration', () => {
  it('decomposes goal into multi-agent DAG with genesis cryptographic journal', async () => {
    const run = await omaRuntimeAdapter.createRun('Audit security boundary and deploy fix');
    assert.ok(run.runId.startsWith('oma_'));
    assert.strictEqual(run.status, 'running');
    assert.strictEqual(run.dagNodes.length, 5);
    assert.strictEqual(run.dagNodes[0].role, 'researcher');
    assert.strictEqual(run.dagNodes[0].status, 'running');
    assert.strictEqual(run.dagNodes[1].role, 'auditor');
    assert.strictEqual(run.dagNodes[1].status, 'pending');

    // Verify Genesis Journal
    assert.strictEqual(run.journal.length, 1);
    assert.strictEqual(run.journal[0].sequenceNumber, 1);
    assert.strictEqual(run.journal[0].previousEntryHash, '0000000000000000000000000000000000000000000000000000000000000000');
    assert.strictEqual(typeof run.journal[0].entryHash, 'string');
    assert.strictEqual(run.journal[0].entryHash.length, 64);
  });

  it('advances DAG nodes and updates chained SHA-256 journal entries', async () => {
    const run = await omaRuntimeAdapter.createRun('Refactor AST module');
    const firstNodeId = run.dagNodes[0].nodeId;

    const updated = await omaRuntimeAdapter.advanceNode(run.runId, firstNodeId, { findings: 'Found 3 AST parser modules' });
    assert.strictEqual(updated.dagNodes[0].status, 'completed');
    assert.strictEqual(updated.journal.length, 2);
    assert.strictEqual(updated.journal[1].sequenceNumber, 2);
    assert.strictEqual(updated.journal[1].previousEntryHash, updated.journal[0].entryHash);

    const integrity = await omaRuntimeAdapter.verifyJournalIntegrity(run.runId);
    assert.strictEqual(integrity.isValid, true);
  });

  it('pauses on destructive actions for human approval and resumes upon review', async () => {
    const run = await omaRuntimeAdapter.createRun('Drop table and delete legacy cache directories');
    // Node 3 has requiresHumanReview: true because goal includes 'delete'
    assert.strictEqual(run.dagNodes[2].requiresHumanReview, true);

    // Complete node 1
    await omaRuntimeAdapter.advanceNode(run.runId, run.dagNodes[0].nodeId);
    // Complete node 2
    const afterNode2 = await omaRuntimeAdapter.advanceNode(run.runId, run.dagNodes[1].nodeId);
    // Node 3 should now be paused for approval
    assert.strictEqual(afterNode2.dagNodes[2].status, 'paused_for_approval');
    assert.strictEqual(afterNode2.status, 'paused');

    // Human operator grants approval
    const afterApproval = await omaRuntimeAdapter.grantApproval(run.runId, run.dagNodes[2].nodeId, 'lead_sec_auditor@aiheaven.local');
    assert.strictEqual(afterApproval.dagNodes[2].status, 'running');
    assert.strictEqual(afterApproval.dagNodes[2].approvalGranted, true);
    assert.strictEqual(afterApproval.status, 'running');

    // Chained journal integrity check
    const integrity = await omaRuntimeAdapter.verifyJournalIntegrity(run.runId);
    assert.strictEqual(integrity.isValid, true);
  });
});

describe('3. AgentLens Trajectory Observability & Flight Recorder', () => {
  it('creates flight record, records steps, calculates latency and seals fingerprint', () => {
    const flight = agentLensService.startFlightRecord('task_inspect_01', 'Explore repository symbols');
    assert.ok(flight.flightId.startsWith('lens_'));
    assert.strictEqual(flight.status, 'active');
    assert.strictEqual(flight.totalSteps, 0);

    const initialFingerprint = flight.fingerprintHash;

    const step1 = agentLensService.recordStep(flight.flightId, {
      nodeId: 'node_recon',
      action: 'symbol_search',
      actorRole: 'researcher',
      inputPayload: { symbol: 'AgentGateAdapter' },
      outputPayload: { foundIn: 'src/services/security/agentGateAdapter.ts' },
      status: 'success',
      latencyMs: 120,
      tokenUsage: { promptTokens: 150, completionTokens: 40, totalTokens: 190 }
    });

    assert.strictEqual(step1.stepNumber, 1);
    assert.strictEqual(flight.totalSteps, 1);
    assert.strictEqual(flight.totalDurationMs, 120);
    assert.strictEqual(flight.totalTokensUsed, 190);
    assert.notStrictEqual(flight.fingerprintHash, initialFingerprint);

    const closed = agentLensService.endFlightRecord(flight.flightId, 'completed');
    assert.strictEqual(closed.status, 'completed');
    assert.ok(closed.endedAt);
  });

  it('retrieves and filters flight records', () => {
    const records = agentLensService.listFlightRecords();
    assert.ok(records.length >= 1);
    const retrieved = agentLensService.getFlightRecord(records[0].flightId);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.flightId, records[0].flightId);
  });
});

describe('4. AgentGate Zero-Trust Security Gateway', () => {
  it('intercepts and rejects root escalation attempts', async () => {
    const evalRes = await agentGateAdapter.evaluateToolCall({
      agentId: 'coder_droid',
      toolId: 'tool_terminal',
      commandOrPayload: 'sudo cat /etc/shadow',
      parameters: {}
    });

    assert.strictEqual(evalRes.decision, 'intercept_and_reject');
    assert.strictEqual(evalRes.isAllowed, false);
    assert.strictEqual(evalRes.requiresHumanReview, false);
    assert.strictEqual(evalRes.violatedPolicyId, 'gate_block_host_escalation');
    assert.strictEqual(typeof evalRes.auditEvidenceHash, 'string');
    assert.strictEqual(evalRes.auditEvidenceHash.length, 64);
  });

  it('routes destructive operations to human approval', async () => {
    const evalRes = await agentGateAdapter.evaluateToolCall({
      agentId: 'coder_droid',
      toolId: 'tool_fs_delete',
      commandOrPayload: 'rm -rf /tmp/scratch_dir',
      parameters: {}
    });

    assert.strictEqual(evalRes.decision, 'route_to_human_approval');
    assert.strictEqual(evalRes.isAllowed, false);
    assert.strictEqual(evalRes.requiresHumanReview, true);
    assert.strictEqual(evalRes.violatedPolicyId, 'gate_require_approval_destructive');
  });

  it('allows benign commands unconditionally', async () => {
    const evalRes = await agentGateAdapter.evaluateToolCall({
      agentId: 'coder_droid',
      toolId: 'tool_terminal',
      commandOrPayload: 'git status',
      parameters: {}
    });

    assert.strictEqual(evalRes.decision, 'allow');
    assert.strictEqual(evalRes.isAllowed, true);
    assert.strictEqual(evalRes.requiresHumanReview, false);
  });

  it('interception integrates with executionManager.submitJob()', async () => {
    const mockAgent: AgentDefinition = {
      id: 'agent_test_gate',
      owner_id: 'user_test_owner',
      project_id: 'proj_test_01',
      name: 'Test Gate Agent',
      version: '1.0.0',
      description: 'Agent for gate testing',
      system_prompt: 'Test',
      capabilities: ['code_generation'],
      lifecycle: { state: 'ready', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      status: 'idle',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: {
        allowed_tools: ['tool_bash'],
        allowed_file_patterns: ['*'],
        max_execution_time_seconds: 30,
        network_access: false,
        filesystem_scope: 'workspace_only',
        requires_approval_for_destructive: true
      }
    };

    const mockTool: ToolDefinition = {
      id: 'tool_bash',
      name: 'Bash Execution',
      version: '1.0.0',
      description: 'Execute shell commands',
      capability: 'terminal',
      permission_requirements: [],
      parameters: [],
      execution_policy: { sandboxed_only: true, timeout_seconds: 30, is_sandboxed: true, requires_confirmation: false, max_output_bytes: 1048576 },
      is_enabled: true,
      availability: 'ready'
    };

    // Metadata endpoint access is intercepted by AgentGate zero-trust rule
    const request: SandboxExecutionRequest = {
      command: 'curl -s http://169.254.169.254/latest/meta-data/',
      workspace_id: 'ws_test_gate',
      parameters: {}
    };

    const job = await executionManager.submitJob(request, mockAgent, mockTool);
    assert.strictEqual(job.state, 'failed');
    assert.ok(job.stderr.includes('AgentGate Zero-Trust Interception'));
  });
});

describe('5. ThinkLess Adaptive Reasoning Budget Pipeline', () => {
  it('allocates short-form fast-path reasoning for simple queries', () => {
    const decision = thinkLessPipeline.evaluateReasoningBudget('git status', 'terminal', 'simple');
    assert.strictEqual(decision.mode, 'short_form');
    assert.strictEqual(decision.reasoningEffort, 'low');
    assert.strictEqual(decision.recommendedTokens, 350);
    assert.ok(decision.estimatedCostSavingPercent >= 70);
  });

  it('allocates long-chain chain-of-thought for complex architectural or security queries', () => {
    const decision = thinkLessPipeline.evaluateReasoningBudget(
      'Perform cryptographic audit of hash chain and investigate potential timing attack vulnerabilities in auth middleware',
      'security',
      'complex'
    );
    assert.strictEqual(decision.mode, 'long_chain_cot');
    assert.strictEqual(decision.reasoningEffort, 'high');
    assert.strictEqual(decision.recommendedTokens, 3500);
    assert.strictEqual(decision.estimatedCostSavingPercent, 0);
  });

  it('allocates hybrid reasoning for standard tasks', () => {
    const decision = thinkLessPipeline.evaluateReasoningBudget(
      'Format error response JSON when database connection times out',
      'coding',
      'moderate'
    );
    assert.strictEqual(decision.mode, 'hybrid');
    assert.strictEqual(decision.reasoningEffort, 'medium');
    assert.strictEqual(decision.recommendedTokens, 1200);
  });
});

describe('6. Thalamus, Laya, and GLiNER2.5-Decide Resilient Routing', () => {
  it('truthfully reports status for backends when external endpoints are not configured', async () => {
    const health = await thalamusMiddleware.checkHealth();
    assert.ok(Array.isArray(health));
    assert.strictEqual(health.length, 3); // Laya, GLiNER, Thalamus

    const laya = health.find(h => h.backend === 'laya');
    const gliner = health.find(h => h.backend === 'gliner');
    const thalamus = health.find(h => h.backend === 'thalamus');

    assert.ok(laya);
    assert.strictEqual(laya.upstreamUrl, 'https://github.com/NandhaKishorM/laya');
    assert.ok(gliner);
    assert.strictEqual(gliner.upstreamUrl, 'https://github.com/fastino-ai/GLiNER2');
    assert.ok(thalamus);
    assert.strictEqual(thalamus.isAvailable, true);
    assert.strictEqual(thalamus.status, 'connected');
  });

  it('gracefully executes calibrated native fallback when external APIs are absent', async () => {
    const result = await thalamusMiddleware.routeDecision({
      text: 'Detect and eliminate race condition bug in concurrent loops',
      candidateLabels: ['security_audit', 'bug_hunt', 'documentation', 'ui_styling']
    });

    assert.ok(result);
    assert.strictEqual(result.fallbackTriggered, true);
    assert.strictEqual(result.backendUsed, 'thalamus_native_calibrated_heuristic');
    assert.strictEqual(result.predictedLabel, 'bug_hunt');
    assert.strictEqual(typeof result.confidence, 'number');
    assert.ok(result.confidence > 0);
    assert.strictEqual(typeof result.durationMs, 'number');
  });
});

describe('7. LazyCodex Hierarchical Codebase Memory', () => {
  it('resolves hierarchical instructions and suggests appropriate droid role', () => {
    const resolved = hierarchicalMemoryService.resolveInstructionsForPath('src/services/security/agentGateAdapter.ts');
    assert.ok(resolved);
    assert.strictEqual(resolved.targetPath, 'src/services/security/agentGateAdapter.ts');
    assert.strictEqual(resolved.suggestedRole, 'security');
    assert.ok(Array.isArray(resolved.levels));
    assert.ok(Array.isArray(resolved.allRules));
  });

  it('indexes structural repository landmarks across architecture zones', () => {
    const landmarks = hierarchicalMemoryService.indexDirectoryLandmarks();
    assert.ok(Array.isArray(landmarks));
    assert.ok(landmarks.length >= 3);

    const apiLandmark = landmarks.find(l => l.role === 'api');
    const servicesLandmark = landmarks.find(l => l.role === 'services');

    assert.ok(apiLandmark, 'Should identify API architecture zone');
    assert.ok(servicesLandmark, 'Should identify Services architecture zone');
  });
});
