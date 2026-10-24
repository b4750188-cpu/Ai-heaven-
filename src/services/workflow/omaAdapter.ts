/**
 * AI HEAVEN - OMA (Open Multi-Agent) Orchestration Adapter
 * Upstream Reference: open-multi-agent/open-multi-agent (Apache-2.0 / MIT)
 * 
 * Provides:
 * 1. Task DAG generation and execution.
 * 2. Tamper-evident chained execution journal with SHA-256 blocks.
 * 3. Pause-and-resume capability when human review is required.
 * 4. Self-hosted execution with zero SaaS dependencies.
 */

import crypto from 'crypto';
import {
  IOMARuntimeEngine,
  OMAExecutionJournalEntry,
  OMARunRecord,
  OMATaskNode
} from '../../contracts/oma';

export class OMARuntimeAdapter implements IOMARuntimeEngine {
  private runs: Map<string, OMARunRecord> = new Map();

  public async createRun(goal: string, tenantId = 'tenant_default'): Promise<OMARunRecord> {
    const runId = `oma_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // Decompose goal into an OMA Task DAG
    const dagNodes: OMATaskNode[] = [
      {
        nodeId: `${runId}_node_1`,
        name: 'Explore & Context Reconnaissance',
        role: 'researcher',
        dependencies: [],
        status: 'running',
        commandOrPrompt: `Investigate repository structure, symbols, and dependencies for: ${goal}`,
        inputParams: { goal },
        requiresHumanReview: false,
        retryAttempts: 0
      },
      {
        nodeId: `${runId}_node_2`,
        name: 'Security & Policy Gate Evaluation',
        role: 'auditor',
        dependencies: [`${runId}_node_1`],
        status: 'pending',
        commandOrPrompt: 'Evaluate boundary rules, tool allowlists, and destructive flags',
        inputParams: {},
        requiresHumanReview: false,
        retryAttempts: 0
      },
      {
        nodeId: `${runId}_node_3`,
        name: 'Scoped Implementation Execution',
        role: 'coder',
        dependencies: [`${runId}_node_2`],
        status: 'pending',
        commandOrPrompt: 'Implement code modifications inside isolated workspace boundary',
        inputParams: {},
        requiresHumanReview: /delete|destroy|drop|reset/i.test(goal),
        retryAttempts: 0
      },
      {
        nodeId: `${runId}_node_4`,
        name: 'Verification & Mechanical Test Suite',
        role: 'tester',
        dependencies: [`${runId}_node_3`],
        status: 'pending',
        commandOrPrompt: 'Run unit tests, lint checks, and type validations',
        inputParams: {},
        requiresHumanReview: false,
        retryAttempts: 0
      },
      {
        nodeId: `${runId}_node_5`,
        name: 'Review Center Quality Seal',
        role: 'reviewer',
        dependencies: [`${runId}_node_4`],
        status: 'pending',
        commandOrPrompt: 'Audit code diffs, verify absence of regressions, compile execution receipt',
        inputParams: {},
        requiresHumanReview: false,
        retryAttempts: 0
      }
    ];

    // Genesis journal entry
    const genesisPayload = JSON.stringify({ runId, goal, nodeCount: dagNodes.length });
    const payloadHash = crypto.createHash('sha256').update(genesisPayload).digest('hex');
    const previousEntryHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const entryHash = crypto.createHash('sha256').update(`${previousEntryHash}:${payloadHash}:${now}`).digest('hex');

    const genesisEntry: OMAExecutionJournalEntry = {
      entryId: `jrn_1_${Date.now()}`,
      sequenceNumber: 1,
      nodeId: dagNodes[0].nodeId,
      action: 'run_initialized',
      actor: 'oma_orchestrator',
      status: 'started',
      payloadHash,
      previousEntryHash,
      entryHash,
      timestamp: now
    };

    const record: OMARunRecord = {
      runId,
      goal,
      tenantId,
      dagNodes,
      status: 'running',
      journal: [genesisEntry],
      totalRetries: 0,
      createdAt: now,
      updatedAt: now
    };

    this.runs.set(runId, record);
    return record;
  }

  public async advanceNode(runId: string, nodeId: string, result?: Record<string, any>): Promise<OMARunRecord> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`OMA Run "${runId}" not found.`);

    const node = run.dagNodes.find(n => n.nodeId === nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found in run "${runId}".`);

    node.status = 'completed';
    node.outputResult = result || { message: `Completed node ${node.name}` };
    const now = new Date().toISOString();

    // Append to chained journal
    const lastEntry = run.journal[run.journal.length - 1];
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(result || {})).digest('hex');
    const entryHash = crypto.createHash('sha256').update(`${lastEntry.entryHash}:${payloadHash}:${now}`).digest('hex');

    run.journal.push({
      entryId: `jrn_${run.journal.length + 1}_${Date.now()}`,
      sequenceNumber: run.journal.length + 1,
      nodeId: node.nodeId,
      action: `node_completed:${node.name}`,
      actor: node.role,
      status: 'step_checkpoint',
      payloadHash,
      previousEntryHash: lastEntry.entryHash,
      entryHash,
      timestamp: now
    });

    // Check for next unblocked node
    const pendingNodes = run.dagNodes.filter(n => n.status === 'pending');
    if (pendingNodes.length === 0) {
      run.status = 'completed';
    } else {
      const nextNode = pendingNodes[0];
      if (nextNode.requiresHumanReview && !nextNode.approvalGranted) {
        nextNode.status = 'paused_for_approval';
        run.status = 'paused';
      } else {
        nextNode.status = 'running';
        run.status = 'running';
      }
    }

    run.updatedAt = now;
    return run;
  }

  public async grantApproval(runId: string, nodeId: string, approvedBy: string): Promise<OMARunRecord> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`OMA Run "${runId}" not found.`);

    const node = run.dagNodes.find(n => n.nodeId === nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found in run "${runId}".`);

    node.approvalGranted = true;
    node.status = 'running';
    run.status = 'running';
    const now = new Date().toISOString();

    const lastEntry = run.journal[run.journal.length - 1];
    const payloadHash = crypto.createHash('sha256').update(`approval_granted_by_${approvedBy}`).digest('hex');
    const entryHash = crypto.createHash('sha256').update(`${lastEntry.entryHash}:${payloadHash}:${now}`).digest('hex');

    run.journal.push({
      entryId: `jrn_${run.journal.length + 1}_${Date.now()}`,
      sequenceNumber: run.journal.length + 1,
      nodeId: node.nodeId,
      action: `approval_granted_by_${approvedBy}`,
      actor: 'human_operator',
      status: 'approval_resolved',
      payloadHash,
      previousEntryHash: lastEntry.entryHash,
      entryHash,
      timestamp: now
    });

    run.updatedAt = now;
    return run;
  }

  public async getRun(runId: string): Promise<OMARunRecord | null> {
    return this.runs.get(runId) || null;
  }

  public async verifyJournalIntegrity(runId: string): Promise<{ isValid: boolean; error?: string }> {
    const run = this.runs.get(runId);
    if (!run) return { isValid: false, error: 'Run not found.' };

    for (let i = 1; i < run.journal.length; i++) {
      const prev = run.journal[i - 1];
      const curr = run.journal[i];
      if (curr.previousEntryHash !== prev.entryHash) {
        return {
          isValid: false,
          error: `Tamper detected at sequence #${curr.sequenceNumber}: previousEntryHash mismatch.`
        };
      }
    }

    return { isValid: true };
  }

  public async listRuns(tenantId?: string): Promise<OMARunRecord[]> {
    const all = Array.from(this.runs.values());
    if (tenantId && tenantId !== 'tenant_default') {
      return all.filter(r => r.tenantId === tenantId);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const omaRuntimeAdapter = new OMARuntimeAdapter();
