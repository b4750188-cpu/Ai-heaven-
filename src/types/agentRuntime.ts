/**
 * AI HEAVEN - Phase 1C: Personal AI Agent Runtime & Task Planner Types
 * Strictly decoupled architecture for persistent worker runtimes,
 * task state machine, short-term working memory, emergency kill switch, and event streaming.
 */

import { ExecutionReceipt } from './foundation';

export type AgentWorkerState =
  | 'IDLE'
  | 'STARTING'
  | 'READY'
  | 'PLANNING'
  | 'WAITING_APPROVAL'
  | 'EXECUTING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOPPING'
  | 'TERMINATED';

export type AgentWorkerHealth = 'healthy' | 'degraded' | 'unresponsive' | 'stopped';

export interface AgentWorker {
  agent_id: string;
  project_id: string;
  workspace_id?: string;
  state: AgentWorkerState;
  health: AgentWorkerHealth;
  heartbeat_at: string;
  last_activity_at: string;
  current_task_id?: string;
  current_execution_id?: string;
  is_cancelled: boolean;
}

export type TaskStatus =
  | 'created'
  | 'planning'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type ActionRiskClassification = 'low' | 'medium' | 'high' | 'destructive';

export type ActionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';

export interface PlannedAction {
  id: string;
  step_number: number;
  purpose: string;
  tool_id: string;
  command: string;
  workspace_id: string;
  expected_result: string;
  risk_classification: ActionRiskClassification;
  requires_approval: boolean;
  status: ActionStatus;
  execution_id?: string;
  result?: string;
  error?: string;
  completed_at?: string;
}

export interface AgentTask {
  id: string;
  idempotency_key?: string;
  correlation_id?: string;
  owner_id: string;
  project_id: string;
  workspace_id: string;
  agent_id: string;
  goal: string;
  status: TaskStatus;
  priority: TaskPriority;
  plan: PlannedAction[];
  current_action_index: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failure_reason?: string;
  cancellation_reason?: string;
  receipt?: ExecutionReceipt;
}

export interface AgentWorkingMemory {
  task_id: string;
  agent_id: string;
  project_id: string;
  workspace_id: string;
  owner_id: string;
  current_goal: string;
  completed_actions: string[];
  execution_results: Record<string, string>;
  errors: string[];
  observations: string[];
  context_variables: Record<string, string>;
  updated_at: string;
}

export type KillSwitchScope = 'agent' | 'project' | 'global';

export interface KillSwitchStatus {
  is_active: boolean;
  scope?: KillSwitchScope;
  target_id?: string;
  triggered_by: string;
  triggered_at: string;
  reason: string;
}

export type RuntimeEventType =
  | 'task_created'
  | 'plan_created'
  | 'command_created'
  | 'planned'
  | 'action_started'
  | 'approval_required'
  | 'approval_granted'
  | 'approval_rejected'
  | 'tool_called'
  | 'execution_started'
  | 'execution_output'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_cancelled'
  | 'result'
  | 'state_changed'
  | 'task_completed'
  | 'task_failed'
  | 'agent_paused'
  | 'agent_terminated'
  | 'kill_switch_triggered'
  | 'state_recovered';

export interface RuntimeEvent {
  id: string;
  correlation_id?: string;
  event_type: RuntimeEventType;
  agent_id?: string;
  task_id?: string;
  execution_id?: string;
  project_id?: string;
  workspace_id?: string;
  resource?: string;
  action?: string;
  result?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
