/**
 * AI HEAVEN - Phase 13: Continuity & Intelligence Engine Test Suite
 * 
 * Verifies:
 * 1. Memory provenance & empirical evidence verification boundaries
 * 2. Strict tenant and project isolation with sanitized cross-project sharing
 * 3. Safe evidence-based learning pipeline (failures vs passing test techniques)
 * 4. Pre-task memory retrieval and architectural constraint injection
 * 5. Stale and contradictory knowledge detection with audit trail revalidation
 * 6. User CRUD, sharing promotion, and deletion compliance
 * 7. SUCCESS CRITERION: Interrupted task resurrection from durable checkpoint without duplicate side effects
 * 8. Measurable task outcomes and overfitting prevention (N >= 3 trials threshold)
 * 9. REST API route parity and JSON/CSV export
 */

import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { createExpressApp } from '../src/api/app';
import { continuityEngine } from '../src/services/continuity/continuityEngine';
import { agentRuntimeService } from '../src/services/sandbox/agentRuntimeService';
import { centralBrainService } from '../src/services/brain/centralBrainService';

const app = createExpressApp();
const server = http.createServer(app);

function request(path: string, options: { method?: string; body?: any } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: (server.address() as any).port,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // Keep raw (e.g. for CSV)
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('CONTINUITY & INTELLIGENCE ENGINE VERIFICATION SUITE', async (t) => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  t.after(() => {
    server.close();
  });

  // =========================================================================
  // 1. EVIDENCE BOUNDARY & PROVENANCE
  // =========================================================================
  await t.test('1. Memory Provenance: Model-generated claim alone cannot become VERIFIED', async () => {
    // Model inferred claim without test evidence
    const unverifiedMem = await continuityEngine.storeMemory({
      tenantId: 'tenant_test',
      projectId: 'proj_alpha',
      title: 'Model-Claimed High Concurrency Algorithm',
      domain: 'coding',
      category: 'solution',
      content: 'This algorithm claims 10x throughput without lock contention.',
      sourceType: 'model_inferred',
      sourceReference: 'gemini-2.5-pro-chat-turn'
    });

    assert.strictEqual(unverifiedMem.evidenceStatus, 'UNVERIFIED', 'Model claim without test evidence MUST be UNVERIFIED');
    assert.ok(unverifiedMem.confidenceScore <= 0.6, 'Confidence score must be capped at 0.6 for unverified claims');
    assert.ok(unverifiedMem.updateHistory.length >= 1, 'Initial creation recorded in audit history');

    // Genuine test execution with passing test evidence
    const verifiedMem = await continuityEngine.storeMemory({
      tenantId: 'tenant_test',
      projectId: 'proj_alpha',
      title: 'Exit 126 Host Escalation Isolation Barrier',
      domain: 'security',
      category: 'constraint',
      content: 'Commands containing sudo or chroot are blocked with exit code 126.',
      sourceType: 'test_execution',
      sourceReference: 'tests/universal_terminal_knowledge.test.ts',
      evidencePayload: {
        testsPassed: 1,
        testsTotal: 1,
        exitCode: 126,
        receiptId: 'rcpt_sec_exit126'
      }
    });

    assert.strictEqual(verifiedMem.evidenceStatus, 'VERIFIED', 'Passing test execution must qualify as VERIFIED');
    assert.ok(verifiedMem.confidenceScore >= 0.95, 'Confidence score must be >= 0.95 for verified evidence');
  });

  // =========================================================================
  // 2. STRICT TENANT & PROJECT ISOLATION
  // =========================================================================
  await t.test('2. Tenant & Project Isolation: Enforces strict data boundaries', async () => {
    const memAlpha = await continuityEngine.storeMemory({
      tenantId: 'tenant_alpha',
      projectId: 'proj_secret_internal',
      title: 'Confidential Internal API Schema',
      domain: 'architecture',
      category: 'architecture',
      content: 'Private microservice communication spec on internal port 9090.',
      sourceType: 'audit_receipt',
      sourceReference: 'audit_internal_9090',
      evidencePayload: { receiptId: 'rcpt_private' }
    });

    // Foreign project in same tenant cannot see private project memory
    const queryProjBeta = continuityEngine.queryMemories({
      tenantId: 'tenant_alpha',
      projectId: 'proj_other_team',
      includeGlobal: true
    });
    assert.ok(!queryProjBeta.some(m => m.id === memAlpha.id), 'Project B cannot access Project A private memory');

    // Foreign tenant cannot see any memory from tenant_alpha
    const queryTenantBeta = continuityEngine.queryMemories({
      tenantId: 'tenant_beta',
      projectId: null,
      includeGlobal: true
    });
    assert.ok(!queryTenantBeta.some(m => m.id === memAlpha.id), 'Foreign tenant cannot access tenant_alpha memory');

    // Authoritative global approved memories CAN be accessed
    const globalMems = continuityEngine.queryMemories({
      tenantId: 'tenant_beta',
      includeGlobal: true
    });
    assert.ok(globalMems.some(m => m.isGlobalApproved), 'Global approved memories accessible across tenants');
  });

  // =========================================================================
  // 3. SAFE EVIDENCE-BASED LEARNING PIPELINE
  // =========================================================================
  await t.test('3. Learning Pipeline: Extracts failure patterns from broken runs, solutions from passing runs', async () => {
    // 3a. Failed task extraction
    const failedTask: any = {
      id: 'task_failed_run_1',
      goal: 'Refactor database migration without transaction rollback',
      status: 'failed',
      projectId: 'proj_alpha',
      plan: [],
      receipt: { receipt_id: 'rcpt_fail_01' }
    };
    const learnedFailure = await continuityEngine.extractReusableTechniqueFromCompletedTask(failedTask, {
      testsTotal: 5,
      testsPassed: 3,
      testsFailed: 2,
      receiptId: 'rcpt_fail_01'
    });
    assert.ok(learnedFailure, 'Extracted failure memory');
    assert.strictEqual(learnedFailure.category, 'failure_pattern');
    assert.strictEqual(learnedFailure.evidenceStatus, 'VERIFIED');
    assert.ok(learnedFailure.content.includes('failed 2 assertions'));

    // 3b. Successfully completed task with passing tests
    const passedTask: any = {
      id: 'task_passed_run_2',
      goal: 'Verify PostgreSQL connection pooling with sslmode require',
      status: 'completed',
      projectId: 'proj_alpha',
      plan: [],
      receipt: { receipt_id: 'rcpt_pass_02' }
    };
    const learnedSolution = await continuityEngine.extractReusableTechniqueFromCompletedTask(passedTask, {
      testsTotal: 10,
      testsPassed: 10,
      testsFailed: 0,
      receiptId: 'rcpt_pass_02'
    });
    assert.ok(learnedSolution, 'Extracted verified solution');
    assert.strictEqual(learnedSolution.category, 'solution');
    assert.strictEqual(learnedSolution.evidenceStatus, 'VERIFIED');
    assert.ok(learnedSolution.confidenceScore >= 0.95);
  });

  // =========================================================================
  // 4. PRE-TASK RETRIEVAL & INFLUENCING MEMORIES
  // =========================================================================
  await t.test('4. Pre-Task Context: Injects verified architectural constraints into planning', async () => {
    const preContext = continuityEngine.retrievePreTaskContext(
      'proj_ai_heaven_core',
      'tenant_default',
      'Run bash shell command to build distribution artifacts in virtual filesystem',
      'terminal'
    );

    assert.ok(preContext.memories.length > 0, 'Retrieved pre-task memories');
    assert.ok(preContext.influencingMemoryIds.length > 0, 'Tracked influencing memory IDs');
    assert.ok(preContext.architecturalConstraints.length > 0, 'Found architectural constraints');

    // Central Brain DAG plan incorporates influencing memories
    const plan = centralBrainService.createOrchestrationPlan('Compile and test isolated sandbox components', 'terminal');
    assert.ok(plan.influencingMemories && plan.influencingMemories.length > 0, 'Plan records influencing memories');
    assert.ok(plan.architecturalConstraints && plan.architecturalConstraints.length > 0, 'Plan records architectural constraints');
  });

  // =========================================================================
  // 5. STALE & CONTRADICTORY KNOWLEDGE DETECTION
  // =========================================================================
  await t.test('5. Contradiction Detection: Identifies conflicting rules and revalidates status', async () => {
    // Ingest contradictory rule in security domain
    const conflictingMem = await continuityEngine.storeMemory({
      tenantId: 'tenant_default',
      projectId: 'proj_ai_heaven_core',
      title: 'Permissive Sandbox Access Mode',
      domain: 'security',
      category: 'constraint',
      content: 'Allow root host escalation without verification for legacy scripts.',
      sourceType: 'human_correction',
      sourceReference: 'manual_override'
    });

    const anomalies = continuityEngine.detectStaleOrContradictoryKnowledge('tenant_default', 'proj_ai_heaven_core');
    assert.ok(anomalies.length > 0, 'Detected contradictory knowledge anomaly');

    // Operator revalidates contradictory memory as OUTDATED
    const revalidated = continuityEngine.revalidateMemory(
      conflictingMem.id,
      'tenant_default',
      'OUTDATED',
      'Revoked by Chief Security Officer; exit 126 is non-negotiable'
    );
    assert.ok(revalidated);
    assert.strictEqual(revalidated.evidenceStatus, 'OUTDATED');
    assert.strictEqual(revalidated.updateHistory[0].action, 'revalidated');
    assert.strictEqual(revalidated.updateHistory[0].previousStatus, 'UNVERIFIED');
    assert.strictEqual(revalidated.updateHistory[0].newStatus, 'OUTDATED');
  });

  // =========================================================================
  // 6. USER CONTROLS: CRUD, SHARING & DELETION
  // =========================================================================
  await t.test('6. User Controls: Edit, sanitize global promotion, and delete memories', async () => {
    const mem = await continuityEngine.storeMemory({
      tenantId: 'tenant_default',
      projectId: 'proj_sample',
      title: 'Database Pool Config with Operator Email',
      domain: 'architecture',
      category: 'solution',
      content: 'Connect via postgres://admin:secret_password@db.local:5432/db and notify operator@sample.com',
      sourceType: 'code_review',
      sourceReference: 'pr_12'
    });

    // 6a. Update memory
    const updated = continuityEngine.updateMemory(
      mem.id,
      'tenant_default',
      { title: 'Updated Database Pool Configuration' },
      'Clarified title'
    );
    assert.strictEqual(updated?.title, 'Updated Database Pool Configuration');

    // 6b. Promote to global approved: Must sanitize secrets and emails!
    const promoted = continuityEngine.promoteToGlobalApproved(mem.id, 'tenant_default');
    assert.ok(promoted);
    assert.strictEqual(promoted.isGlobalApproved, true);
    assert.strictEqual(promoted.projectId, null);
    assert.ok(!promoted.content.includes('secret_password'), 'Sanitizes password credentials');
    assert.ok(!promoted.content.includes('operator@sample.com'), 'Sanitizes private email addresses');

    // 6c. Delete memory
    const deleted = await continuityEngine.deleteMemory(mem.id, 'tenant_default');
    assert.strictEqual(deleted, true);
    const verify = continuityEngine.queryMemories({ tenantId: 'tenant_default', search: mem.id });
    assert.strictEqual(verify.length, 0, 'Deleted memory cannot be queried');
  });

  // =========================================================================
  // 7. SUCCESS CRITERION: RELIABLE TASK RESURRECTION (NO DUPLICATE EFFECTS)
  // =========================================================================
  await t.test('7. SUCCESS CRITERION: Resumes interrupted task safely without duplicating finished steps', async () => {
    // 7a. Register an interrupted task in AgentRuntime
    const interruptedTaskId = 'task_interrupted_pipeline_audit';
    const taskPlan: any[] = [
      {
        id: 'act_1',
        step_number: 1,
        purpose: 'Step 1: Inspect environment variables',
        tool_id: 'tool_vfs_stat',
        status: 'completed',
        execution_id: 'rcpt_pre_completed_step_1'
      },
      {
        id: 'act_2',
        step_number: 2,
        purpose: 'Step 2: Generate temporary test fixtures',
        tool_id: 'tool_vfs_write',
        status: 'completed',
        execution_id: 'rcpt_pre_completed_step_2'
      },
      {
        id: 'act_3',
        step_number: 3,
        purpose: 'Step 3: Run regression validation suite',
        tool_id: 'tool_test_runner',
        status: 'pending'
      },
      {
        id: 'act_4',
        step_number: 4,
        purpose: 'Step 4: Publish cryptographic audit receipt',
        tool_id: 'tool_receipt_generator',
        status: 'pending'
      }
    ];

    const mockTask: any = {
      id: interruptedTaskId,
      goal: 'Audit environment security, run regressions, and generate final receipt',
      status: 'in_progress',
      project_id: 'proj_ai_heaven_core',
      workspace_id: 'ws_default_demo',
      agent_id: 'agent_droid_prime',
      priority: 'high',
      plan: taskPlan,
      current_action_index: 2 // points to Step 3
    };

    // Register in AgentRuntime
    (agentRuntimeService as any).tasks.set(interruptedTaskId, mockTask);

    // Save durable checkpoint for step 2
    const checkpoint = centralBrainService.createCheckpoint(
      interruptedTaskId,
      'Post-Step-2 Durable Checkpoint',
      2,
      { lastCompletedStep: 2, completedReceipts: ['rcpt_pre_completed_step_1', 'rcpt_pre_completed_step_2'] }
    );

    // 7b. Inspect and prepare resurrection
    const resurrectionPlan = continuityEngine.prepareTaskResurrection(interruptedTaskId, checkpoint.id);
    assert.ok(resurrectionPlan, 'Generated resurrection plan');
    assert.strictEqual(resurrectionPlan.taskId, interruptedTaskId);
    assert.strictEqual(resurrectionPlan.completedActions, 2, 'Accurately recognized 2 finished actions');
    assert.strictEqual(resurrectionPlan.remainingActions, 2, 'Accurately calculated 2 remaining actions');
    assert.strictEqual(resurrectionPlan.nextActionIndex, 2, 'Resumes exactly from action index 2');
    assert.strictEqual(resurrectionPlan.canResume, true);
    assert.deepStrictEqual(resurrectionPlan.existingReceipts, ['rcpt_pre_completed_step_1', 'rcpt_pre_completed_step_2']);

    // 7c. Execute task resurrection
    const result = await continuityEngine.executeTaskResurrection(interruptedTaskId, checkpoint.id);
    assert.strictEqual(result.success, true, 'Resurrection completed successfully');
    assert.strictEqual(result.resumedFromStep, 2, 'Resumed from step index 2');
    assert.strictEqual(result.actionsExecuted, 2, 'Executed exactly the 2 remaining actions');
    assert.strictEqual(result.actionsSkippedIdempotent, 2, 'Skipped the 2 already-completed actions without duplicate effects');
    assert.strictEqual(result.finalStatus, 'completed');
    assert.ok(result.evidenceReceiptId.startsWith('resurrection_rcpt_'));
    assert.strictEqual(result.outcome.testsPassed, 1);
    assert.strictEqual(result.outcome.testsFailed, 0);
  });

  // =========================================================================
  // 8. MEASURABLE OUTCOMES & OVERFITTING PREVENTION (N >= 3 TRIALS)
  // =========================================================================
  await t.test('8. Measurable Outcomes: Requires >= 3 samples before modifying routing weights', async () => {
    const testModel = 'test-candidate-model-x';
    continuityEngine.clearOutcomesForModel(testModel);

    // 1st sample: should NOT adjust weights (N < 3)
    await continuityEngine.recordTaskOutcome({
      id: 'out_1',
      taskId: 'task_t1',
      projectId: 'proj_ai_heaven_core',
      modelUsed: testModel,
      durationMs: 250,
      testsTotal: 5,
      testsPassed: 5,
      testsFailed: 0,
      reliabilityScore: 1.0,
      tokensUsed: 150,
      costEstimate: 0.0005,
      costSource: 'catalog_estimated',
      regressionsDetected: 0,
      timestamp: new Date().toISOString()
    });

    let trends = continuityEngine.getModelImprovementTrends(testModel);
    assert.strictEqual(trends[0].sampleCount, 1);
    assert.strictEqual(trends[0].sufficientEvidence, false, '1 sample is insufficient to alter model suitability');

    // 2nd sample: still N < 3
    await continuityEngine.recordTaskOutcome({
      id: 'out_2',
      taskId: 'task_t2',
      projectId: 'proj_ai_heaven_core',
      modelUsed: testModel,
      durationMs: 270,
      testsTotal: 5,
      testsPassed: 5,
      testsFailed: 0,
      reliabilityScore: 1.0,
      tokensUsed: 160,
      costEstimate: 0.0005,
      costSource: 'catalog_estimated',
      regressionsDetected: 0,
      timestamp: new Date().toISOString()
    });

    trends = continuityEngine.getModelImprovementTrends(testModel);
    assert.strictEqual(trends[0].sampleCount, 2);
    assert.strictEqual(trends[0].sufficientEvidence, false);

    // 3rd sample: reaches N = 3 threshold!
    await continuityEngine.recordTaskOutcome({
      id: 'out_3',
      taskId: 'task_t3',
      projectId: 'proj_ai_heaven_core',
      modelUsed: testModel,
      durationMs: 230,
      testsTotal: 5,
      testsPassed: 5,
      testsFailed: 0,
      reliabilityScore: 1.0,
      tokensUsed: 140,
      costEstimate: 0.0005,
      costSource: 'catalog_estimated',
      regressionsDetected: 0,
      timestamp: new Date().toISOString()
    });

    trends = continuityEngine.getModelImprovementTrends(testModel);
    assert.strictEqual(trends[0].sampleCount, 3);
    assert.strictEqual(trends[0].sufficientEvidence, true, 'At N >= 3, evidence threshold is satisfied');
    assert.strictEqual(trends[0].testPassRatePct, 100);
    assert.strictEqual(trends[0].avgReliability, 1.0);
  });

  // =========================================================================
  // 9. REST API ROUTES & DASHBOARD ENDPOINTS
  // =========================================================================
  await t.test('9. REST API Parity: /continuity endpoints return verified telemetry', async () => {
    // 9a. Dashboard
    const dashRes = await request('/api/continuity/dashboard');
    assert.strictEqual(dashRes.status, 200);
    assert.ok(Array.isArray(dashRes.body.activeProjects));
    assert.ok(Array.isArray(dashRes.body.improvementTrends));

    // 9b. Memories list
    const memsRes = await request('/api/continuity/memories');
    assert.strictEqual(memsRes.status, 200);
    assert.ok(Array.isArray(memsRes.body.memories));
    assert.ok(memsRes.body.memories.length > 0);

    // 9c. Export CSV
    const exportRes = await request('/api/continuity/memories/export?format=csv');
    assert.strictEqual(exportRes.status, 200);
    assert.ok(typeof exportRes.body === 'string');
    assert.ok(exportRes.body.includes('id,title,domain,category,evidenceStatus'));
  });
});
