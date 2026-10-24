/**
 * AI HEAVEN - AgentLens Trajectory Observability & Flight Recorder
 * Upstream Reference: agentkitai/agentlens (MIT) / Microsoft Code Agent Trajectories
 * 
 * Captures flight recorder black-box logs:
 * - Step-by-step action records with input/output payloads
 * - Token usage (prompt/completion/total) and step latency
 * - Cryptographic SHA-256 fingerprint seal of the entire trajectory flight
 */

import crypto from 'crypto';
import {
  AgentTrajectoryFlightRecord,
  AgentTrajectoryStep,
  IAgentLensService
} from '../../contracts/agentLens';

export class AgentLensService implements IAgentLensService {
  private flightRecords: Map<string, AgentTrajectoryFlightRecord> = new Map();

  public startFlightRecord(taskId: string, goal: string, tenantId = 'tenant_default'): AgentTrajectoryFlightRecord {
    const flightId = `lens_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const record: AgentTrajectoryFlightRecord = {
      flightId,
      taskId,
      goal,
      tenantId,
      status: 'active',
      totalSteps: 0,
      totalDurationMs: 0,
      totalTokensUsed: 0,
      steps: [],
      errorCount: 0,
      fingerprintHash: crypto.createHash('sha256').update(`${flightId}:${goal}:${now}`).digest('hex'),
      startedAt: now
    };

    this.flightRecords.set(flightId, record);
    return record;
  }

  public recordStep(flightId: string, stepInput: Omit<AgentTrajectoryStep, 'stepId' | 'timestamp'>): AgentTrajectoryStep {
    const record = this.flightRecords.get(flightId);
    if (!record) {
      throw new Error(`AgentLens flight record "${flightId}" not found.`);
    }

    const stepId = `step_${record.steps.length + 1}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const step: AgentTrajectoryStep = {
      ...stepInput,
      stepId,
      stepNumber: record.steps.length + 1,
      timestamp
    };

    record.steps.push(step);
    record.totalSteps = record.steps.length;
    record.totalDurationMs += step.latencyMs || 0;
    record.totalTokensUsed += step.tokenUsage?.totalTokens || 0;

    if (step.status === 'error' || step.status === 'intercepted') {
      record.errorCount++;
    }

    // Update chained fingerprint seal
    record.fingerprintHash = crypto
      .createHash('sha256')
      .update(`${record.fingerprintHash}:${step.stepId}:${step.status}:${step.latencyMs}`)
      .digest('hex');

    return step;
  }

  public endFlightRecord(flightId: string, status: AgentTrajectoryFlightRecord['status'], rootCause?: string): AgentTrajectoryFlightRecord {
    const record = this.flightRecords.get(flightId);
    if (!record) {
      throw new Error(`AgentLens flight record "${flightId}" not found.`);
    }

    record.status = status;
    record.endedAt = new Date().toISOString();
    if (rootCause) {
      record.rootCauseAnalysis = rootCause;
    }

    return record;
  }

  public getFlightRecord(flightId: string): AgentTrajectoryFlightRecord | null {
    return this.flightRecords.get(flightId) || null;
  }

  public listFlightRecords(tenantId?: string): AgentTrajectoryFlightRecord[] {
    const all = Array.from(this.flightRecords.values());
    if (tenantId && tenantId !== 'tenant_default') {
      return all.filter(r => r.tenantId === tenantId);
    }
    return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
}

export const agentLensService = new AgentLensService();
