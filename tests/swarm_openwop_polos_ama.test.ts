/**
 * AI HEAVEN - Multi-Agent & Orchestration Integration Test Suite
 * Covers 5 GitHub Projects:
 * 1. Agent Swarm (openai/swarm pattern)
 * 2. OpenWOP (openwop/openwop, openwop.dev)
 * 3. OMA - Open Multi-Agent (open-multi-agent/open-multi-agent)
 * 4. AMA-Bench (AMA-Bench/AMA-Hub, ama-bench.github.io)
 * 5. Polos (polos-dev/polos, polos.dev)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { agentSwarmEngine } from '../src/services/swarm/agentSwarmEngine';
import { openwopAdapter } from '../src/services/workflow/openwopAdapter';
import { omaRuntimeAdapter } from '../src/services/workflow/omaAdapter';
import { amaBenchHarness } from '../src/services/memory/amaBenchHarness';
import { polosRuntimeAdapter } from '../src/services/sandbox/polosRuntimeAdapter';

describe('1. Agent Swarm Dynamic Coordination & Handoffs', () => {
  it('lists default seeded swarm agents across roles', () => {
    const agents = agentSwarmEngine.listAgents();
    assert.ok(agents.length >= 5);
    const triage = agentSwarmEngine.getAgent('swarm_triage');
    const coder = agentSwarmEngine.getAgent('swarm_coder');
    const sec = agentSwarmEngine.getAgent('swarm_security');

    assert.ok(triage);
    assert.strictEqual(triage.role, 'triage');
    assert.ok(coder);
    assert.ok(sec);
  });

  it('executes swarm run delegating from triage to coder to tester to coordinator', async () => {
    const res = await agentSwarmEngine.executeSwarmRun({
      initialAgentId: 'swarm_triage',
      prompt: 'Refactor database connection pool with automatic retry'
    });

    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.activeAgentId, 'swarm_coordinator');
    assert.ok(res.totalSteps >= 4);
    assert.ok(res.totalHandoffs >= 3);
    assert.strictEqual(res.contextVariables['triage_classification'], 'swarm_coder');
    assert.strictEqual(res.contextVariables['implementation_completed'], true);
    assert.strictEqual(res.contextVariables['verification_passed'], true);
    assert.ok(res.finalMessage.includes('Swarm coordination complete'));
  });

  it('routes security-focused prompts to security sentinel', async () => {
    const res = await agentSwarmEngine.executeSwarmRun({
      initialAgentId: 'swarm_triage',
      prompt: 'Audit CVE vulnerability and investigate credential leak'
    });

    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.contextVariables['triage_classification'], 'swarm_security');
    assert.strictEqual(res.contextVariables['security_cleared'], true);
  });
});

describe('2. OpenWOP Standard Workflow Orchestration Protocol', () => {
  it('creates run with initial checkpoints and event stream', async () => {
    const run = await openwopAdapter.createRun('DeployProductionWorkflow', { environment: 'production' });
    assert.ok(run.runId.startsWith('wop_'));
    assert.strictEqual(run.state, 'queued');
    assert.strictEqual(run.steps.length, 4);
    assert.strictEqual(run.checkpoints.length, 1);
    assert.strictEqual(typeof run.checkpoints[0].stateHash, 'string');
    assert.strictEqual(run.checkpoints[0].stateHash.length, 64);

    const events = await openwopAdapter.getEvents(run.runId);
    assert.ok(events.length >= 1);
    assert.strictEqual(events[0].eventType, 'run.started');
  });

  it('advances steps sequentially and records state checkpoints', async () => {
    const run = await openwopAdapter.createRun('DataSyncWorkflow', { target: 'analytics' });

    // Step 0
    const step0Res = await openwopAdapter.advanceRun(run.runId);
    assert.strictEqual(step0Res.run.currentStepIndex, 1);
    assert.strictEqual(step0Res.run.steps[0].status, 'completed');
    assert.strictEqual(step0Res.event.eventType, 'step.completed');

    // Step 1
    const step1Res = await openwopAdapter.advanceRun(run.runId);
    assert.strictEqual(step1Res.run.currentStepIndex, 2);
    assert.strictEqual(step1Res.run.checkpoints.length, 3); // initial + step 0 + step 1
  });

  it('pauses on destructive actions for human approval and resumes upon authorization', async () => {
    const run = await openwopAdapter.createRun('DatabaseMigrationWorkflow', { isDestructive: true });

    // Step 0 & 1
    await openwopAdapter.advanceRun(run.runId);
    await openwopAdapter.advanceRun(run.runId);

    // Step 2 has isDestructive: true, so it must pause for human review
    const pausedRes = await openwopAdapter.advanceRun(run.runId);
    assert.strictEqual(pausedRes.run.state, 'paused_for_approval');
    assert.ok(pausedRes.run.pendingApproval);
    assert.strictEqual(pausedRes.event.eventType, 'approval.requested');

    // Human operator grants approval
    const approvedRun = await openwopAdapter.resolveApproval(run.runId, true, 'lead_devops@aiheaven.local');
    assert.strictEqual(approvedRun.state, 'running');
    assert.strictEqual(approvedRun.variables.approvalGranted, true);

    // Now advance proceeds through Step 2
    const step2Res = await openwopAdapter.advanceRun(run.runId);
    assert.strictEqual(step2Res.run.steps[2].status, 'completed');
  });

  it('replays run deterministically from a prior checkpoint', async () => {
    const run = await openwopAdapter.createRun('AuditReplayWorkflow', { test: true });
    await openwopAdapter.advanceRun(run.runId);
    await openwopAdapter.advanceRun(run.runId);

    assert.strictEqual(run.currentStepIndex, 2);
    const targetCheckpoint = run.checkpoints[1].checkpointId; // Checkpoint after Step 0

    const replayed = await openwopAdapter.replayFromCheckpoint(run.runId, targetCheckpoint);
    assert.strictEqual(replayed.currentStepIndex, 1);
    assert.strictEqual(replayed.steps[1].status, 'pending');
  });
});

describe('3. OMA (Open Multi-Agent) Deepened Integration', () => {
  it('creates OMA runs, advances nodes, lists runs and validates cryptographic journals', async () => {
    const run = await omaRuntimeAdapter.createRun('Multi-Agent Refactor Run');
    assert.ok(run.runId.startsWith('oma_'));

    const list = await omaRuntimeAdapter.listRuns();
    assert.ok(list.some(r => r.runId === run.runId));

    await omaRuntimeAdapter.advanceNode(run.runId, run.dagNodes[0].nodeId, { memo: 'Recon done' });
    const integrity = await omaRuntimeAdapter.verifyJournalIntegrity(run.runId);
    assert.strictEqual(integrity.isValid, true);
  });
});

describe('4. AMA-Bench Long-Horizon Agent Memory Evaluation', () => {
  it('loads standard benchmark test cases across domains', () => {
    const swe = amaBenchHarness.getStandardTestCases('software_engineering');
    assert.ok(swe.trajectory.length >= 2);
    assert.ok(swe.queries.length >= 2);

    const arch = amaBenchHarness.getStandardTestCases('system_architecture');
    assert.ok(arch.trajectory.length >= 2);
    assert.ok(arch.queries.length >= 1);
  });

  it('evaluates real agent trajectory memory and computes verifiable scores', async () => {
    const { trajectory, queries } = amaBenchHarness.getStandardTestCases('software_engineering');
    const result = await amaBenchHarness.runEvaluation('software_engineering', trajectory, queries);

    assert.ok(result.evaluationId.startsWith('ama_'));
    assert.strictEqual(result.domain, 'software_engineering');
    assert.strictEqual(result.trajectoryLength, 3);
    assert.strictEqual(typeof result.retrievalPrecision, 'number');
    assert.ok(result.retrievalPrecision >= 0 && result.retrievalPrecision <= 1);
    assert.strictEqual(typeof result.stateUpdatingAccuracy, 'number');
    assert.ok(result.stateUpdatingAccuracy >= 0 && result.stateUpdatingAccuracy <= 1);
    assert.strictEqual(typeof result.causalInferenceScore, 'number');
    assert.ok(result.causalInferenceScore >= 0 && result.causalInferenceScore <= 1);
    assert.strictEqual(typeof result.overallScore, 'number');
    assert.ok(result.overallScore > 0);
    assert.strictEqual(typeof result.evidenceReceipt, 'string');
    assert.strictEqual(result.evidenceReceipt.length, 64);
  });
});

describe('5. Polos Durable Execution Runtime & Memoization', () => {
  it('executes steps and idempotently memoizes subsequent calls with matching inputs', async () => {
    const session = polosRuntimeAdapter.createSession({ agentId: 'agent_polos_test' });
    assert.ok(session.sessionId.startsWith('polos_'));

    let executeCallCount = 0;
    const testAction = async () => {
      executeCallCount++;
      return { answer: 42, timestamp: Date.now() };
    };

    // First execution: must run operation
    const firstCall = await polosRuntimeAdapter.executeStep(
      session.sessionId,
      'calculate_hash',
      { key: 'test_seed' },
      testAction
    );
    assert.strictEqual(executeCallCount, 1);
    assert.strictEqual(firstCall.wasMemoized, false);
    assert.strictEqual(firstCall.result.answer, 42);

    // Second execution with identical action & inputs: must memoize and not invoke testAction
    const secondCall = await polosRuntimeAdapter.executeStep(
      session.sessionId,
      'calculate_hash',
      { key: 'test_seed' },
      testAction
    );
    assert.strictEqual(executeCallCount, 1, 'Operation must not be called again');
    assert.strictEqual(secondCall.wasMemoized, true);
    assert.strictEqual(secondCall.result.answer, 42);

    // Different inputs: must execute
    const thirdCall = await polosRuntimeAdapter.executeStep(
      session.sessionId,
      'calculate_hash',
      { key: 'different_seed' },
      testAction
    );
    assert.strictEqual(executeCallCount, 2);
    assert.strictEqual(thirdCall.wasMemoized, false);
  });

  it('lists active Polos sessions with checkpoint metrics', () => {
    const sessions = polosRuntimeAdapter.listSessions();
    assert.ok(sessions.length >= 1);
    assert.strictEqual(typeof sessions[0].checkpointCount, 'number');
    assert.ok(sessions[0].checkpointCount >= 1);
  });
});
