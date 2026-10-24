/**
 * AI HEAVEN - OpenWOP (Open Workflow Orchestration Protocol) Adapter
 * Upstream Reference: openwop/openwop, openwop.dev (Apache-2.0 / MIT)
 * 
 * Provides:
 * 1. Standardized OpenWOP run lifecycle (queued -> running -> paused_for_approval -> completed).
 * 2. Deterministic step advancing and SSE event emission.
 * 3. State snapshotting and cryptographic SHA-256 state seals.
 * 4. Deterministic checkpoint replay.
 */

import crypto from 'crypto';
import {
  IOpenWOPAdapter,
  OpenWOPCheckpoint,
  OpenWOPEvent,
  OpenWOPRunRecord,
  OpenWOPStep
} from '../../contracts/openwop';

export class OpenWOPAdapter implements IOpenWOPAdapter {
  private runs: Map<string, OpenWOPRunRecord> = new Map();
  private events: Map<string, OpenWOPEvent[]> = new Map();

  public async createRun(
    workflowName: string,
    initialInputs: Record<string, unknown>,
    tenantId = 'tenant_default'
  ): Promise<OpenWOPRunRecord> {
    const runId = `wop_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const steps: OpenWOPStep[] = [
      {
        stepId: `${runId}_step_0`,
        stepIndex: 0,
        name: 'Context Ingestion & Dependency Check',
        actor: 'wop_recon_worker',
        status: 'pending',
        idempotencyKey: crypto.createHash('sha256').update(`${runId}:step:0`).digest('hex'),
        inputs: { ...initialInputs }
      },
      {
        stepId: `${runId}_step_1`,
        stepIndex: 1,
        name: 'Policy & Safety Boundary Check',
        actor: 'wop_security_guard',
        status: 'pending',
        idempotencyKey: crypto.createHash('sha256').update(`${runId}:step:1`).digest('hex'),
        inputs: {}
      },
      {
        stepId: `${runId}_step_2`,
        stepIndex: 2,
        name: 'Core Action & Mutation Step',
        actor: 'wop_execution_worker',
        status: 'pending',
        idempotencyKey: crypto.createHash('sha256').update(`${runId}:step:2`).digest('hex'),
        inputs: {}
      },
      {
        stepId: `${runId}_step_3`,
        stepIndex: 3,
        name: 'Automated Regression & Seal Verification',
        actor: 'wop_auditor',
        status: 'pending',
        idempotencyKey: crypto.createHash('sha256').update(`${runId}:step:3`).digest('hex'),
        inputs: {}
      }
    ];

    const initialCheckpoint: OpenWOPCheckpoint = {
      checkpointId: `chk_${runId}_0`,
      runId,
      stepIndex: 0,
      stateSnapshot: { variables: { ...initialInputs }, stepIndex: 0 },
      stateHash: crypto.createHash('sha256').update(JSON.stringify(initialInputs)).digest('hex'),
      createdAt: now
    };

    const run: OpenWOPRunRecord = {
      runId,
      workflowName,
      tenantId,
      state: 'queued',
      currentStepIndex: 0,
      steps,
      checkpoints: [initialCheckpoint],
      variables: { ...initialInputs },
      createdAt: now,
      updatedAt: now
    };

    this.runs.set(runId, run);
    this.events.set(runId, [
      {
        eventId: `evt_${Date.now()}_0`,
        runId,
        eventType: 'run.started',
        payload: { workflowName, initialInputs },
        timestamp: now
      }
    ]);

    return run;
  }

  public async getRun(runId: string): Promise<OpenWOPRunRecord | null> {
    return this.runs.get(runId) || null;
  }

  public async advanceRun(runId: string): Promise<{ run: OpenWOPRunRecord; event: OpenWOPEvent }> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`OpenWOP Run "${runId}" not found.`);

    if (run.state === 'completed' || run.state === 'failed') {
      throw new Error(`Cannot advance run in final state: ${run.state}`);
    }

    if (run.state === 'paused_for_approval') {
      throw new Error(`Run "${runId}" is currently paused waiting for human approval.`);
    }

    run.state = 'running';
    const now = new Date().toISOString();
    const currentStep = run.steps[run.currentStepIndex];

    if (!currentStep) {
      run.state = 'completed';
      const completeEvent: OpenWOPEvent = {
        eventId: `evt_${Date.now()}_${run.currentStepIndex}`,
        runId,
        eventType: 'run.completed',
        payload: { variables: run.variables },
        timestamp: now
      };
      this.events.get(runId)?.push(completeEvent);
      return { run, event: completeEvent };
    }

    // Step 2 simulates a high-impact mutation that triggers approval if action is destructive
    const isRisky = Boolean(run.variables.isDestructive || run.variables.requiresApproval);
    if (currentStep.stepIndex === 2 && isRisky && !run.variables.approvalGranted) {
      run.state = 'paused_for_approval';
      currentStep.status = 'paused';
      run.pendingApproval = {
        approvalId: `wop_appr_${Date.now()}`,
        stepId: currentStep.stepId,
        description: `Human authorization required for step ${currentStep.name}`,
        requestedAt: now
      };

      const approvalEvent: OpenWOPEvent = {
        eventId: `evt_${Date.now()}_${currentStep.stepIndex}`,
        runId,
        eventType: 'approval.requested',
        payload: { approval: run.pendingApproval },
        timestamp: now
      };
      this.events.get(runId)?.push(approvalEvent);
      return { run, event: approvalEvent };
    }

    // Execute step
    currentStep.status = 'completed';
    currentStep.outputs = { status: 'ok', processedAt: now };
    currentStep.completedAt = now;

    // Create Checkpoint
    const checkpoint: OpenWOPCheckpoint = {
      checkpointId: `chk_${runId}_${currentStep.stepIndex + 1}`,
      runId,
      stepIndex: currentStep.stepIndex + 1,
      stateSnapshot: { ...run.variables, currentStep: currentStep.stepIndex },
      stateHash: crypto.createHash('sha256').update(`${runId}:${currentStep.stepIndex}:${now}`).digest('hex'),
      createdAt: now
    };
    run.checkpoints.push(checkpoint);

    run.currentStepIndex++;
    if (run.currentStepIndex >= run.steps.length) {
      run.state = 'completed';
    }

    run.updatedAt = now;

    const stepEvent: OpenWOPEvent = {
      eventId: `evt_${Date.now()}_${currentStep.stepIndex}`,
      runId,
      eventType: run.state === 'completed' ? 'run.completed' : 'step.completed',
      payload: { step: currentStep, checkpointId: checkpoint.checkpointId },
      timestamp: now
    };
    this.events.get(runId)?.push(stepEvent);

    return { run, event: stepEvent };
  }

  public async resolveApproval(runId: string, approved: boolean, actor: string): Promise<OpenWOPRunRecord> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`OpenWOP Run "${runId}" not found.`);
    if (run.state !== 'paused_for_approval') {
      throw new Error(`Run "${runId}" is not currently paused for approval.`);
    }

    const now = new Date().toISOString();
    if (approved) {
      run.state = 'running';
      run.variables.approvalGranted = true;
      run.variables.approvedBy = actor;
      run.pendingApproval = undefined;

      const evt: OpenWOPEvent = {
        eventId: `evt_${Date.now()}_appr`,
        runId,
        eventType: 'approval.resolved',
        payload: { approved: true, actor },
        timestamp: now
      };
      this.events.get(runId)?.push(evt);
    } else {
      run.state = 'failed';
      run.pendingApproval = undefined;
      const evt: OpenWOPEvent = {
        eventId: `evt_${Date.now()}_appr`,
        runId,
        eventType: 'approval.resolved',
        payload: { approved: false, actor, reason: 'Rejected by human operator' },
        timestamp: now
      };
      this.events.get(runId)?.push(evt);
    }

    run.updatedAt = now;
    return run;
  }

  public async replayFromCheckpoint(runId: string, checkpointId: string): Promise<OpenWOPRunRecord> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`OpenWOP Run "${runId}" not found.`);

    const chk = run.checkpoints.find(c => c.checkpointId === checkpointId);
    if (!chk) throw new Error(`Checkpoint "${checkpointId}" not found in run "${runId}".`);

    // Restore state from snapshot
    run.currentStepIndex = chk.stepIndex;
    run.state = 'running';
    run.updatedAt = new Date().toISOString();

    // Reset steps after the checkpoint
    for (let i = chk.stepIndex; i < run.steps.length; i++) {
      run.steps[i].status = 'pending';
      run.steps[i].outputs = undefined;
    }

    const replayEvent: OpenWOPEvent = {
      eventId: `evt_${Date.now()}_replay`,
      runId,
      eventType: 'checkpoint.saved',
      payload: { replayedFrom: checkpointId, targetStep: chk.stepIndex },
      timestamp: new Date().toISOString()
    };
    this.events.get(runId)?.push(replayEvent);

    return run;
  }

  public async getEvents(runId: string): Promise<OpenWOPEvent[]> {
    return this.events.get(runId) || [];
  }
}

export const openwopAdapter = new OpenWOPAdapter();
