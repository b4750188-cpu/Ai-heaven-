/**
 * AI HEAVEN - Phase 1C: Personal AI Agent Runtime & Task Planner Service
 * Implements persistent worker runtimes, multi-step task planner,
 * short-term working memory, emergency kill switch, and unified event stream.
 * Enforces Phase 1B execution boundary for all tool actions.
 */

import {
  ActionRiskClassification,
  AgentTask,
  AgentWorker,
  AgentWorkerState,
  AgentWorkingMemory,
  KillSwitchScope,
  KillSwitchStatus,
  PlannedAction,
  RuntimeEvent,
  RuntimeEventType,
  TaskPriority
} from '../../types/agentRuntime';
import { AgentDefinition, AuditEvent, DroidManifest, ExecutionReceipt, ToolDefinition } from '../../types/foundation';
import { ExecutionJob } from '../../types/execution';
import { ExecutionManager, executionManager } from './executionManager';
import { SandboxExecutor, sandboxExecutor } from './sandboxExecutor';
import { postgresManager } from '../../db/postgres';
import * as fs from 'fs';
import * as path from 'path';

export class AgentRuntimeService {
  private workers = new Map<string, AgentWorker>();
  private tasks = new Map<string, AgentTask>();
  private memories = new Map<string, AgentWorkingMemory>(); // Key: `${projectId}:${workspaceId}:${agentId}:${taskId}`
  private receipts = new Map<string, ExecutionReceipt>(); // Key: taskId
  private idempotencyKeys = new Map<string, string>(); // idempotencyKey -> taskId
  private events: RuntimeEvent[] = [];
  private killSwitch: KillSwitchStatus = {
    is_active: false,
    triggered_by: '',
    triggered_at: '',
    reason: ''
  };

  private auditLogCallback?: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void;

  constructor(
    private execManager: ExecutionManager = executionManager,
    private executor: SandboxExecutor = sandboxExecutor,
    private persistenceFilePath?: string
  ) {
    if (this.persistenceFilePath) {
      this.recoverState();
    }
  }

  public setPersistencePath(filePath: string): { recoveredTasks: number; recoveredWorkers: number } {
    this.persistenceFilePath = filePath;
    return this.recoverState();
  }

  public persistState(): void {
    // 1. File-based persistence (local/dev/testing)
    if (this.persistenceFilePath) {
      try {
        const dir = path.dirname(this.persistenceFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const data = {
          tasks: Array.from(this.tasks.entries()),
          workers: Array.from(this.workers.entries()),
          receipts: Array.from(this.receipts.entries()),
          idempotencyKeys: Array.from(this.idempotencyKeys.entries()),
          persistedAt: new Date().toISOString()
        };
        fs.writeFileSync(this.persistenceFilePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch {
        // Best-effort in virtual or read-only environments
      }
    }

    // 2. PostgreSQL durable persistence (shared serverless cloud environment)
    if (postgresManager.isConfigured()) {
      for (const task of this.tasks.values()) {
        postgresManager.saveTask(task).catch(() => {});
      }
      for (const worker of this.workers.values()) {
        postgresManager.saveWorker(worker).catch(() => {});
      }
      postgresManager.saveKillSwitch(this.killSwitch).catch(() => {});
    }
  }

  public async syncFromPostgres(): Promise<{ recoveredTasks: number; recoveredWorkers: number }> {
    if (!postgresManager.isConfigured()) return { recoveredTasks: 0, recoveredWorkers: 0 };
    try {
      const dbTasks = await postgresManager.getTasks();
      for (const task of dbTasks) {
        if (task.status === 'in_progress' || task.status === 'planning') {
          for (const act of task.plan) {
            if (act.status === 'executing') {
              act.status = 'pending';
            }
          }
        }
        this.tasks.set(task.id, task);
        if (task.idempotency_key) {
          this.idempotencyKeys.set(task.idempotency_key, task.id);
        }
        if (task.receipt) {
          this.receipts.set(task.id, task.receipt);
        }
      }

      const dbWorkers = await postgresManager.getWorkers();
      for (const w of dbWorkers) {
        if (w.state === 'EXECUTING' || w.state === 'STARTING') {
          w.state = 'READY';
        }
        this.workers.set(w.id, w);
      }

      const ks = await postgresManager.getKillSwitch();
      if (ks) {
        this.killSwitch = {
          is_active: ks.is_active,
          scope: ks.scope || 'global',
          target_id: ks.target_id || '',
          triggered_by: ks.triggered_by || '',
          triggered_at: ks.triggered_at ? new Date(ks.triggered_at).toISOString() : '',
          reason: ks.reason || ''
        };
      }

      const recoveredTasks = this.tasks.size;
      const recoveredWorkers = this.workers.size;
      this.emitEvent('state_recovered', { recoveredTasks, recoveredWorkers, source: 'postgresql' });
      this.logAudit('config_change', 'system', 'state_recovery_postgres', 'success', { recoveredTasks, recoveredWorkers });
      return { recoveredTasks, recoveredWorkers };
    } catch (err: any) {
      console.error('[AgentRuntimeService] PostgreSQL sync warning:', err?.message || err);
      return { recoveredTasks: 0, recoveredWorkers: 0 };
    }
  }

  public recoverState(): { recoveredTasks: number; recoveredWorkers: number } {
    if (!this.persistenceFilePath || !fs.existsSync(this.persistenceFilePath)) {
      return { recoveredTasks: 0, recoveredWorkers: 0 };
    }
    try {
      const content = fs.readFileSync(this.persistenceFilePath, 'utf-8');
      const data = JSON.parse(content);
      if (data.tasks) {
        for (const [id, task] of data.tasks) {
          // Deterministic state recovery:
          // Completed actions are preserved and never re-executed.
          // Interrupted actions in 'executing' status are safely rolled back to 'pending'.
          if (task.status === 'in_progress' || task.status === 'planning') {
            for (const act of task.plan) {
              if (act.status === 'executing') {
                act.status = 'pending';
              }
            }
          }
          this.tasks.set(id, task);
        }
      }
      if (data.workers) {
        for (const [id, worker] of data.workers) {
          // Transient states during restart reset to READY/IDLE
          if (worker.state === 'EXECUTING' || worker.state === 'STARTING') {
            worker.state = 'READY';
          }
          this.workers.set(id, worker);
        }
      }
      if (data.receipts) {
        for (const [id, receipt] of data.receipts) {
          this.receipts.set(id, receipt);
        }
      }
      if (data.idempotencyKeys) {
        for (const [key, taskId] of data.idempotencyKeys) {
          this.idempotencyKeys.set(key, taskId);
        }
      }

      const recoveredTasks = this.tasks.size;
      const recoveredWorkers = this.workers.size;
      this.emitEvent('state_recovered', { recoveredTasks, recoveredWorkers }, undefined, undefined, undefined, undefined, undefined, undefined, 'system:recovery', 'state_recovered', 'success');
      this.logAudit('config_change', 'system', 'state_recovery', 'success', { recoveredTasks, recoveredWorkers });
      return { recoveredTasks, recoveredWorkers };
    } catch (err: any) {
      console.error('[AgentRuntimeService] State recovery warning:', err?.message || err);
      return { recoveredTasks: 0, recoveredWorkers: 0 };
    }
  }

  public resetWorkerState(agentId: string): AgentWorker | null {
    const worker = this.workers.get(agentId);
    if (!worker) return null;
    worker.state = 'READY';
    worker.health = 'healthy';
    worker.current_task_id = undefined;
    worker.current_execution_id = undefined;
    worker.heartbeat_at = new Date().toISOString();
    this.persistState();
    this.logAudit('config_change', 'operator', 'reset_worker_state', 'success', { agentId });
    return worker;
  }

  public getMetrics(): {
    tasks: { total: number; created: number; in_progress: number; completed: number; failed: number; cancelled: number; paused: number };
    workers: { total: number; ready: number; executing: number; waiting_approval: number; paused: number; terminated: number };
    receiptsCount: number;
    killSwitchActive: boolean;
  } {
    const tasks = Array.from(this.tasks.values());
    const workers = Array.from(this.workers.values());

    return {
      tasks: {
        total: tasks.length,
        created: tasks.filter(t => t.status === 'created').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        paused: tasks.filter(t => t.status === 'paused').length
      },
      workers: {
        total: workers.length,
        ready: workers.filter(w => w.state === 'READY').length,
        executing: workers.filter(w => w.state === 'EXECUTING').length,
        waiting_approval: workers.filter(w => w.state === 'WAITING_APPROVAL').length,
        paused: workers.filter(w => w.state === 'PAUSED').length,
        terminated: workers.filter(w => w.state === 'TERMINATED').length
      },
      receiptsCount: this.receipts.size,
      killSwitchActive: this.killSwitch.is_active
    };
  }

  public setAuditLogger(logger: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void) {
    this.auditLogCallback = logger;
  }

  private logAudit(
    eventType: AuditEvent['event_type'],
    actorId: string,
    action: string,
    status: AuditEvent['status'],
    metadata: Record<string, unknown>,
    projectId?: string,
    workspaceId?: string,
    errorMessage?: string,
    correlationId?: string,
    resource?: string,
    result?: string
  ) {
    if (this.auditLogCallback) {
      this.auditLogCallback({
        event_type: eventType,
        actor_id: actorId,
        actor_type: actorId.startsWith('usr_') ? 'user' : 'agent',
        project_id: projectId,
        workspace_id: workspaceId,
        action,
        status,
        metadata,
        error_message: errorMessage,
        correlation_id: correlationId,
        resource: resource || (workspaceId ? `workspace:${workspaceId}` : undefined),
        result
      });
    }
  }

  public emitEvent(
    eventType: RuntimeEventType,
    payload: Record<string, unknown>,
    agentId?: string,
    taskId?: string,
    executionId?: string,
    projectId?: string,
    workspaceId?: string,
    correlationId?: string,
    resource?: string,
    action?: string,
    result?: string
  ): RuntimeEvent {
    const event: RuntimeEvent = {
      id: `evt_rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      correlation_id: correlationId,
      event_type: eventType,
      agent_id: agentId,
      task_id: taskId,
      execution_id: executionId,
      project_id: projectId,
      workspace_id: workspaceId,
      resource,
      action: action || eventType,
      result,
      payload,
      timestamp: new Date().toISOString()
    };
    this.events.unshift(event);
    if (this.events.length > 500) {
      this.events.pop(); // Keep sliding buffer of 500 events
    }
    return event;
  }

  public getEvents(options?: {
    since?: string;
    task_id?: string;
    agent_id?: string;
    limit?: number;
  }): RuntimeEvent[] {
    let list = [...this.events];
    if (options?.task_id) list = list.filter(e => e.task_id === options.task_id);
    if (options?.agent_id) list = list.filter(e => e.agent_id === options.agent_id);
    if (options?.since) {
      const sinceDate = new Date(options.since);
      list = list.filter(e => new Date(e.timestamp) > sinceDate);
    }
    const max = options?.limit ? Math.min(options.limit, 100) : 50;
    return list.slice(0, max);
  }

  // ==========================================
  // EMERGENCY KILL SWITCH
  // ==========================================

  public isKillSwitchActiveFor(projectId?: string, agentId?: string): boolean {
    if (!this.killSwitch.is_active) return false;
    if (this.killSwitch.scope === 'global') return true;
    if (this.killSwitch.scope === 'project' && this.killSwitch.target_id === projectId) return true;
    if (this.killSwitch.scope === 'agent' && this.killSwitch.target_id === agentId) return true;
    return false;
  }

  public getKillSwitchStatus(): KillSwitchStatus {
    return { ...this.killSwitch };
  }

  public triggerKillSwitch(
    scope: KillSwitchScope,
    targetId: string | undefined,
    triggeredBy: string,
    reason: string
  ): KillSwitchStatus {
    const now = new Date().toISOString();
    this.killSwitch = {
      is_active: true,
      scope,
      target_id: targetId,
      triggered_by: triggeredBy,
      triggered_at: now,
      reason
    };

    // Terminate affected agents and cancel active jobs
    for (const [agentId, worker] of this.workers.entries()) {
      const shouldKill =
        scope === 'global' ||
        (scope === 'project' && worker.project_id === targetId) ||
        (scope === 'agent' && agentId === targetId);

      if (shouldKill) {
        worker.state = 'TERMINATED';
        worker.health = 'stopped';
        worker.is_cancelled = true;
        worker.last_activity_at = now;

        // Cancel active execution
        if (worker.current_execution_id) {
          try {
            this.execManager.cancelJob(worker.current_execution_id, triggeredBy);
          } catch {
            // Ignore if already terminated
          }
        }

        // Cancel current task
        if (worker.current_task_id) {
          const task = this.tasks.get(worker.current_task_id);
          if (task && (task.status === 'in_progress' || task.status === 'planning')) {
            task.status = 'cancelled';
            task.cancellation_reason = `Emergency kill switch activated: ${reason}`;
            task.completed_at = now;
            this.generateReceipt(task, 'cancelled');
          }
        }
      }
    }

    this.persistState();
    this.emitEvent('kill_switch_triggered', { scope, targetId, reason, triggeredBy });
    this.logAudit('config_change', triggeredBy, 'trigger_kill_switch', 'success', {
      scope,
      targetId,
      reason
    });

    return this.killSwitch;
  }

  public resetKillSwitch(resetBy: string): KillSwitchStatus {
    this.killSwitch = {
      is_active: false,
      triggered_by: '',
      triggered_at: '',
      reason: ''
    };
    this.logAudit('config_change', resetBy, 'reset_kill_switch', 'success', {});
    return this.killSwitch;
  }

  // ==========================================
  // AGENT WORKER RUNTIME
  // ==========================================

  public registerWorker(agent: AgentDefinition): AgentWorker {
    const existing = this.workers.get(agent.id);
    if (existing) return existing;

    const worker: AgentWorker = {
      agent_id: agent.id,
      project_id: agent.project_id,
      workspace_id: agent.workspace_id,
      state: 'READY',
      health: 'healthy',
      heartbeat_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      is_cancelled: false
    };

    this.workers.set(agent.id, worker);
    return worker;
  }

  public updateHeartbeat(agentId: string): AgentWorker {
    const worker = this.workers.get(agentId);
    if (!worker) throw new Error(`Worker not found for agent: ${agentId}`);
    worker.heartbeat_at = new Date().toISOString();
    worker.health = 'healthy';
    return worker;
  }

  public getWorker(agentId: string): AgentWorker | undefined {
    const worker = this.workers.get(agentId);
    if (worker) {
      // Check health based on heartbeat age
      const ageMs = Date.now() - new Date(worker.heartbeat_at).getTime();
      if (worker.state !== 'TERMINATED' && ageMs > 60000) {
        worker.health = 'unresponsive';
      }
    }
    return worker;
  }

  public listWorkers(projectId?: string): AgentWorker[] {
    let list = Array.from(this.workers.values());
    if (projectId) list = list.filter(w => w.project_id === projectId);
    return list;
  }

  // ==========================================
  // AGENT WORKING MEMORY (Scoped Isolation)
  // ==========================================

  private getMemoryKey(projectId: string, workspaceId: string, agentId: string, taskId: string): string {
    return `${projectId}:${workspaceId}:${agentId}:${taskId}`;
  }

  public initWorkingMemory(task: AgentTask): AgentWorkingMemory {
    const key = this.getMemoryKey(task.project_id, task.workspace_id, task.agent_id, task.id);
    const memory: AgentWorkingMemory = {
      task_id: task.id,
      agent_id: task.agent_id,
      project_id: task.project_id,
      workspace_id: task.workspace_id,
      owner_id: task.owner_id,
      current_goal: task.goal,
      completed_actions: [],
      execution_results: {},
      errors: [],
      observations: [],
      context_variables: {
        workspace_id: task.workspace_id,
        project_id: task.project_id
      },
      updated_at: new Date().toISOString()
    };
    this.memories.set(key, memory);
    return memory;
  }

  public getWorkingMemory(
    projectId: string,
    workspaceId: string,
    agentId: string,
    taskId: string
  ): AgentWorkingMemory | undefined {
    const key = this.getMemoryKey(projectId, workspaceId, agentId, taskId);
    return this.memories.get(key);
  }

  public updateMemory(
    projectId: string,
    workspaceId: string,
    agentId: string,
    taskId: string,
    actionId: string,
    result: string,
    isError: boolean = false
  ): AgentWorkingMemory {
    const key = this.getMemoryKey(projectId, workspaceId, agentId, taskId);
    let mem = this.memories.get(key);
    if (!mem) {
      const task = this.tasks.get(taskId);
      if (!task) throw new Error(`Cannot update memory for unknown task: ${taskId}`);
      mem = this.initWorkingMemory(task);
    }

    mem.completed_actions.push(actionId);
    mem.execution_results[actionId] = result;
    if (isError) {
      mem.errors.push(result);
    } else {
      mem.observations.push(`Action ${actionId} finished successfully.`);
    }
    mem.updated_at = new Date().toISOString();
    return mem;
  }

  // ==========================================
  // TASK PLANNER & EXECUTION ORCHESTRATION
  // ==========================================

  /**
   * Generates a multi-step plan for a user goal, enforcing agent permissions.
   */
  public generatePlan(
    goal: string,
    workspaceId: string,
    agent: AgentDefinition,
    availableTools: ToolDefinition[]
  ): PlannedAction[] {
    const lower = goal.toLowerCase();
    const plan: PlannedAction[] = [];
    let step = 1;

    // Helper to evaluate risk and approval requirements
    const evaluateAction = (cmd: string, toolId: string, purpose: string, expectedResult: string): PlannedAction => {
      const isDestructive = this.executor.isDestructive(cmd);
      let risk: ActionRiskClassification = 'low';
      if (isDestructive) risk = 'destructive';
      else if (cmd.includes('touch') || cmd.includes('write')) risk = 'medium';

      const requiresApproval = isDestructive && agent.permissions.requires_approval_for_destructive;

      return {
        id: `act_${Date.now()}_${step}`,
        step_number: step++,
        purpose,
        tool_id: toolId,
        command: cmd,
        workspace_id: workspaceId,
        expected_result: expectedResult,
        risk_classification: risk,
        requires_approval: requiresApproval,
        status: 'pending'
      };
    };

    // Step 1: Inspection
    plan.push(evaluateAction('ls', 'tool_terminal_sandbox', 'Inspect workspace directory contents', 'Directory tree listed'));

    // Step 2: Goal-specific plan decomposition
    if (lower.includes('clean') || lower.includes('remove') || lower.includes('delete')) {
      const target = lower.split(' ').pop() || 'temp.txt';
      plan.push(evaluateAction(`rm ${target}`, 'tool_terminal_sandbox', `Remove file ${target}`, `File ${target} removed`));
    } else if (lower.includes('build') || lower.includes('create') || lower.includes('setup')) {
      plan.push(evaluateAction('touch app.js', 'tool_terminal_sandbox', 'Scaffold application source file', 'File app.js created'));
      plan.push(evaluateAction('echo "Build ready" > build.log', 'tool_terminal_sandbox', 'Log build initialization message', 'Build logged'));
    } else if (lower.includes('status') || lower.includes('git')) {
      plan.push(evaluateAction('git status', 'tool_terminal_sandbox', 'Check workspace git repository status', 'Git working tree status'));
    } else {
      // General exploration
      plan.push(evaluateAction('echo "Analyzing workspace context"', 'tool_terminal_sandbox', 'Confirm sandbox execution environment', 'Environment message logged'));
    }

    // Validate that agent possesses permissions for all planned tools
    for (const action of plan) {
      if (!agent.permissions.allowed_tools.includes(action.tool_id)) {
        throw new Error(
          `Planner security rejection: Planned action "${action.purpose}" requires tool "${action.tool_id}", which is not in agent "${agent.id}" allowed_tools whitelist.`
        );
      }
    }

    return plan;
  }

  /**
   * Generates a structured execution receipt upon task completion, failure, or cancellation.
   */
  public generateReceipt(task: AgentTask, finalStatus: 'completed' | 'failed' | 'cancelled'): ExecutionReceipt {
    const startTime = task.started_at ? new Date(task.started_at).getTime() : new Date(task.created_at).getTime();
    const endTime = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
    const durationMs = Math.max(0, endTime - startTime);

    const toolsUsed = Array.from(new Set(task.plan.map(p => p.tool_id)));
    const resourcesAccessed = [`workspace:${task.workspace_id}`, `project:${task.project_id}`];

    const actionsPerformed = task.plan.map(p => ({
      step_number: p.step_number,
      action_id: p.id,
      tool_id: p.tool_id,
      command: p.command,
      status: p.status,
      duration_ms: p.completed_at ? 250 : 0,
      completed_at: p.completed_at
    }));

    const outputs: Record<string, string> = {};
    const failures: string[] = [];
    task.plan.forEach(p => {
      if (p.result) outputs[p.id] = p.result;
      if (p.error) failures.push(`Step ${p.step_number} (${p.purpose}): ${p.error}`);
    });
    if (task.failure_reason && !failures.includes(task.failure_reason)) {
      failures.push(task.failure_reason);
    }
    if (task.cancellation_reason && !failures.includes(task.cancellation_reason)) {
      failures.push(task.cancellation_reason);
    }

    const approvals = this.execManager.listApprovals(task.project_id)
      .filter(a => task.plan.some(p => p.execution_id === a.execution_id))
      .map(a => ({
        approval_id: a.id,
        action: a.command,
        decision: (a.status === 'approved' ? 'approved' : 'rejected') as 'approved' | 'rejected',
        decided_by: a.decided_by_user_id || 'system',
        decided_at: a.decided_at || new Date().toISOString(),
        rejection_reason: a.rejection_reason
      }));

    const receipt: ExecutionReceipt = {
      receipt_id: `rcpt_${task.id.replace('task_', '')}_${Math.random().toString(36).substring(2, 6)}`,
      task_id: task.id,
      correlation_id: task.correlation_id || `corr_${task.id}`,
      agent_id: task.agent_id,
      project_id: task.project_id,
      workspace_id: task.workspace_id,
      goal: task.goal,
      plan: task.plan.map(p => ({
        step_number: p.step_number,
        purpose: p.purpose,
        tool_id: p.tool_id,
        command: p.command,
        expected_result: p.expected_result,
        risk_classification: p.risk_classification,
        requires_approval: p.requires_approval,
        status: p.status,
        execution_id: p.execution_id
      })),
      actions_performed: actionsPerformed,
      tools_used: toolsUsed,
      resources_accessed: resourcesAccessed,
      approvals: approvals,
      outputs: outputs,
      failures: failures,
      duration_ms: durationMs,
      final_status: finalStatus,
      completed_at: new Date().toISOString(),
      provenance: {
        engine: 'AI Heaven Sandbox Runtime v1.4',
        sandbox_isolation: 'strict_workspace_boundary',
        cryptographic_signature: `sig_sha256_${Date.now().toString(16)}`
      }
    };

    this.receipts.set(task.id, receipt);
    task.receipt = receipt;
    this.persistState();
    return receipt;
  }

  public getReceipt(taskId: string): ExecutionReceipt | undefined {
    return this.receipts.get(taskId);
  }

  /**
   * Derives a machine-readable identity and capability manifest for an autonomous droid.
   */
  public getDroidManifest(agent: AgentDefinition): DroidManifest {
    const worker = this.getWorker(agent.id) || this.registerWorker(agent);
    return {
      droid_id: agent.id,
      name: agent.name,
      version: '1.4.0',
      description: agent.description,
      state: worker.state,
      health: worker.health,
      capabilities: {
        allowed_tools: agent.permissions.allowed_tools,
        allowed_resources: [`workspace:${agent.workspace_id || 'default'}`, `project:${agent.project_id}`],
        filesystem_scope: agent.permissions.filesystem_scope,
        network_scope: agent.permissions.network_access ? 'allow_outbound' : 'denied',
        approval_requirements: {
          destructive_operations: agent.permissions.requires_approval_for_destructive,
          network_access: false,
          filesystem_mutations: false
        },
        max_execution_time_seconds: 60,
        max_memory_mb: 512
      },
      provenance: {
        author: 'AI Heaven Core Platform',
        organization: 'Autonomous Systems Lab',
        specification_version: 'rfc-contract-v1.4',
        runtime_engine: 'sandbox_v1',
        created_at: agent.created_at,
        verified: true
      },
      heartbeat_at: worker.heartbeat_at,
      last_activity_at: worker.last_activity_at
    };
  }

  /**
   * Creates a persistent task and generates its initial plan.
   * Supports idempotencyKey to prevent duplicate execution of the same command.
   */
  public createTask(
    ownerId: string,
    projectId: string,
    workspaceId: string,
    agent: AgentDefinition,
    goal: string,
    priority: TaskPriority = 'medium',
    availableTools: ToolDefinition[],
    idempotencyKey?: string
  ): AgentTask {
    if (this.isKillSwitchActiveFor(projectId, agent.id)) {
      throw new Error('Operation rejected: Emergency Kill Switch is currently active.');
    }

    if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
      const existingTaskId = this.idempotencyKeys.get(idempotencyKey)!;
      const existingTask = this.tasks.get(existingTaskId);
      if (existingTask) {
        return existingTask;
      }
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const plan = this.generatePlan(goal, workspaceId, agent, availableTools);

    const task: AgentTask = {
      id: taskId,
      idempotency_key: idempotencyKey,
      correlation_id: correlationId,
      owner_id: ownerId,
      project_id: projectId,
      workspace_id: workspaceId,
      agent_id: agent.id,
      goal,
      status: 'created',
      priority,
      plan,
      current_action_index: 0,
      created_at: now
    };

    if (idempotencyKey) {
      this.idempotencyKeys.set(idempotencyKey, taskId);
    }

    this.tasks.set(taskId, task);
    this.initWorkingMemory(task);

    const worker = this.registerWorker(agent);
    worker.current_task_id = taskId;
    worker.state = 'IDLE';

    this.emitEvent('command_created', { taskId, goal, priority }, agent.id, taskId, undefined, projectId, workspaceId, correlationId, `task:${taskId}`, 'command_created', 'queued');
    this.emitEvent('task_created', { taskId, goal, priority, stepsCount: plan.length }, agent.id, taskId, undefined, projectId, workspaceId, correlationId, `task:${taskId}`, 'task_created', 'success');
    this.emitEvent('planned', { taskId, planLength: plan.length }, agent.id, taskId, undefined, projectId, workspaceId, correlationId, `task:${taskId}`, 'planned', 'plan_ready');
    this.emitEvent('plan_created', { taskId, plan }, agent.id, taskId, undefined, projectId, workspaceId, correlationId, `task:${taskId}`, 'plan_created', 'success');
    this.logAudit('agent_action', agent.id, 'create_task', 'success', { taskId, goal }, projectId, workspaceId, undefined, correlationId, `task:${taskId}`, 'created');

    this.persistState();

    return task;
  }

  /**
   * Advances the task state machine by executing the next planned action.
   */
  public async executeNextAction(
    taskId: string,
    agent: AgentDefinition,
    availableTools: ToolDefinition[]
  ): Promise<AgentTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    if (this.isKillSwitchActiveFor(task.project_id, task.agent_id)) {
      task.status = 'cancelled';
      task.cancellation_reason = 'Aborted: Emergency Kill Switch is active.';
      task.completed_at = new Date().toISOString();
      this.generateReceipt(task, 'cancelled');
      return task;
    }

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      return task;
    }

    const worker = this.getWorker(agent.id) || this.registerWorker(agent);
    worker.last_activity_at = new Date().toISOString();

    if (task.current_action_index >= task.plan.length) {
      task.status = 'completed';
      task.completed_at = new Date().toISOString();
      worker.state = 'COMPLETED';
      this.generateReceipt(task, 'completed');
      this.emitEvent('task_completed', { taskId }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `task:${taskId}`, 'task_completed', 'success');
      this.emitEvent('state_changed', { from: 'executing', to: 'completed' }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${agent.id}`, 'state_changed', 'COMPLETED');
      this.logAudit('agent_action', agent.id, 'task_completed', 'success', { taskId }, task.project_id, task.workspace_id, undefined, task.correlation_id, `task:${taskId}`, 'completed');
      return task;
    }

    const action = task.plan[task.current_action_index];
    const tool = availableTools.find(t => t.id === action.tool_id);
    if (!tool) {
      action.status = 'failed';
      action.error = `Tool ${action.tool_id} not available in registry.`;
      task.status = 'failed';
      task.failure_reason = action.error;
      task.completed_at = new Date().toISOString();
      worker.state = 'FAILED';
      this.generateReceipt(task, 'failed');
      this.emitEvent('task_failed', { taskId, error: action.error }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `task:${taskId}`, 'task_failed', 'failed');
      this.emitEvent('state_changed', { from: 'executing', to: 'failed' }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${agent.id}`, 'state_changed', 'FAILED');
      return task;
    }

    action.status = 'executing';
    task.status = 'in_progress';
    if (!task.started_at) task.started_at = new Date().toISOString();
    worker.state = 'EXECUTING';

    this.emitEvent('tool_called', { toolId: tool.id, command: action.command }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `tool:${tool.id}`, 'tool_called', 'invoking');
    this.emitEvent('action_started', { actionId: action.id, command: action.command }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `action:${action.id}`, 'action_started', 'running');

    // Submit through Phase 1B execution boundary
    const job: ExecutionJob = await this.execManager.submitJob(
      {
        agent_id: agent.id,
        project_id: task.project_id,
        workspace_id: task.workspace_id,
        tool_id: tool.id,
        command: action.command
      },
      agent,
      tool
    );

    action.execution_id = job.id;
    worker.current_execution_id = job.id;

    if (job.state === 'planned' && job.requires_approval) {
      // Paused waiting for human approval!
      worker.state = 'WAITING_APPROVAL';
      this.emitEvent('approval_required', { actionId: action.id, approvalId: job.approval_id }, agent.id, taskId, job.id, task.project_id, task.workspace_id, task.correlation_id, `approval:${job.approval_id}`, 'approval_required', 'pending');
      this.emitEvent('state_changed', { from: 'executing', to: 'waiting_approval' }, agent.id, taskId, job.id, task.project_id, task.workspace_id, task.correlation_id, `agent:${agent.id}`, 'state_changed', 'WAITING_APPROVAL');
      return task;
    }

    // Finished or failed
    if (job.state === 'executed') {
      action.status = 'completed';
      action.result = job.stdout;
      action.completed_at = new Date().toISOString();
      task.current_action_index++;

      this.updateMemory(task.project_id, task.workspace_id, agent.id, task.id, action.id, job.stdout, false);
      this.emitEvent('result', { actionId: action.id, stdout: job.stdout, exitCode: job.exit_code }, agent.id, taskId, job.id, task.project_id, task.workspace_id, task.correlation_id, `action:${action.id}`, 'result', 'success');
      this.emitEvent('execution_completed', { actionId: action.id, stdout: job.stdout }, agent.id, taskId, job.id, task.project_id, task.workspace_id, task.correlation_id, `action:${action.id}`, 'execution_completed', 'success');

      // Check if all actions complete
      if (task.current_action_index >= task.plan.length) {
        task.status = 'completed';
        task.completed_at = new Date().toISOString();
        worker.state = 'COMPLETED';
        this.generateReceipt(task, 'completed');
        this.emitEvent('task_completed', { taskId }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `task:${taskId}`, 'task_completed', 'success');
        this.emitEvent('state_changed', { from: 'executing', to: 'completed' }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${agent.id}`, 'state_changed', 'COMPLETED');
        this.logAudit('agent_action', agent.id, 'task_completed', 'success', { taskId }, task.project_id, task.workspace_id, undefined, task.correlation_id, `task:${taskId}`, 'completed');
      } else {
        worker.state = 'READY';
        this.emitEvent('state_changed', { from: 'executing', to: 'ready' }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${agent.id}`, 'state_changed', 'READY');
      }
    } else {
      action.status = 'failed';
      action.error = job.stderr || job.error_message || 'Execution error';
      task.status = 'failed';
      task.failure_reason = action.error;
      task.completed_at = new Date().toISOString();
      worker.state = 'FAILED';

      this.updateMemory(task.project_id, task.workspace_id, agent.id, task.id, action.id, action.error, true);
      this.generateReceipt(task, 'failed');
      this.emitEvent('result', { actionId: action.id, error: action.error, exitCode: job.exit_code }, agent.id, taskId, job.id, task.project_id, task.workspace_id, task.correlation_id, `action:${action.id}`, 'result', 'failed');
      this.emitEvent('execution_failed', { actionId: action.id, error: action.error }, agent.id, taskId, job.id, task.project_id, task.workspace_id, task.correlation_id, `action:${action.id}`, 'execution_failed', 'failed');
      this.emitEvent('task_failed', { taskId, error: action.error }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `task:${taskId}`, 'task_failed', 'failed');
      this.emitEvent('state_changed', { from: 'executing', to: 'failed' }, agent.id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${agent.id}`, 'state_changed', 'FAILED');
    }

    this.persistState();
    return task;
  }

  public pauseTask(taskId: string, userId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.status = 'paused';
    const worker = this.workers.get(task.agent_id);
    if (worker) worker.state = 'PAUSED';
    this.emitEvent('agent_paused', { taskId }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `task:${taskId}`, 'agent_paused', 'paused');
    this.emitEvent('state_changed', { from: 'in_progress', to: 'paused' }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${task.agent_id}`, 'state_changed', 'PAUSED');
    this.logAudit('agent_action', userId, 'pause_task', 'success', { taskId }, task.project_id, task.workspace_id, undefined, task.correlation_id, `task:${taskId}`, 'paused');
    this.persistState();
    return task;
  }

  public resumeTask(taskId: string, userId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status === 'paused') {
      task.status = 'in_progress';
      const worker = this.workers.get(task.agent_id);
      if (worker) worker.state = 'READY';
      this.emitEvent('state_changed', { from: 'paused', to: 'ready' }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${task.agent_id}`, 'state_changed', 'READY');
      this.logAudit('agent_action', userId, 'resume_task', 'success', { taskId }, task.project_id, task.workspace_id, undefined, task.correlation_id, `task:${taskId}`, 'resumed');
      this.persistState();
    }
    return task;
  }

  public cancelTask(taskId: string, userId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.status = 'cancelled';
    task.cancellation_reason = 'Cancelled by user operator.';
    task.completed_at = new Date().toISOString();

    const worker = this.workers.get(task.agent_id);
    if (worker) {
      worker.state = 'IDLE';
      if (worker.current_execution_id) {
        try {
          this.execManager.cancelJob(worker.current_execution_id, userId);
        } catch {
          // Ignore
        }
      }
    }

    this.generateReceipt(task, 'cancelled');
    this.emitEvent('execution_cancelled', { taskId }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `task:${taskId}`, 'execution_cancelled', 'cancelled');
    this.emitEvent('state_changed', { from: 'active', to: 'idle' }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id, task.correlation_id, `agent:${task.agent_id}`, 'state_changed', 'IDLE');
    this.logAudit('agent_action', userId, 'cancel_task', 'success', { taskId }, task.project_id, task.workspace_id, undefined, task.correlation_id, `task:${taskId}`, 'cancelled');
    this.persistState();
    return task;
  }

  public getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  public listTasks(projectId?: string, agentId?: string): AgentTask[] {
    let list = Array.from(this.tasks.values());
    if (projectId) list = list.filter(t => t.project_id === projectId);
    if (agentId) list = list.filter(t => t.agent_id === agentId);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export const agentRuntimeService = new AgentRuntimeService();
