/**
 * AI HEAVEN - Mission Control NAI Operations Dashboard Contracts
 * Upstream Reference: builderz-labs/mission-control (MIT)
 * 
 * Provides centralized operations monitoring, active agent fleet telemetry,
 * task queue dispatch, failure analysis, and resource/spend metrics.
 */

export interface WorkerFleetTelemetry {
  workerId: string;
  agentId: string;
  name: string;
  role: string;
  status: 'idle' | 'assigned' | 'busy' | 'waiting_approval' | 'error' | 'stopped';
  currentTaskId?: string;
  totalTasksCompleted: number;
  totalFailures: number;
  uptimeSeconds: number;
  lastHeartbeat: string;
}

export interface MissionControlOverview {
  fleetSize: number;
  activeWorkersCount: number;
  idleWorkersCount: number;
  queuedTasksCount: number;
  runningTasksCount: number;
  completedTasksCount: number;
  failedTasksCount: number;
  pendingApprovalsCount: number;
  totalTokensConsumed: number;
  estimatedSpendUsd: number;
  systemHealth: 'optimal' | 'degraded' | 'critical';
  workers: WorkerFleetTelemetry[];
  lastCheckedAt: string;
}

export interface IMissionControlAdapter {
  getOverview(tenantId?: string): Promise<MissionControlOverview>;
  dispatchTask(agentId: string, goal: string, tenantId: string): Promise<{ taskId: string; status: string }>;
  haltWorker(workerId: string): Promise<boolean>;
  restartWorker(workerId: string): Promise<boolean>;
}
