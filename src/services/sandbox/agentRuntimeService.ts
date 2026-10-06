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
import { AgentDefinition, AuditEvent, ToolDefinition } from '../../types/foundation';
import { ExecutionJob } from '../../types/execution';
import { ExecutionManager, executionManager } from './executionManager';
import { SandboxExecutor, sandboxExecutor } from './sandboxExecutor';

export class AgentRuntimeService {
  private workers = new Map<string, AgentWorker>();
  private tasks = new Map<string, AgentTask>();
  private memories = new Map<string, AgentWorkingMemory>(); // Key: `${projectId}:${workspaceId}:${agentId}:${taskId}`
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
    private executor: SandboxExecutor = sandboxExecutor
  ) {}

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
    errorMessage?: string
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
        error_message: errorMessage
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
    workspaceId?: string
  ): RuntimeEvent {
    const event: RuntimeEvent = {
      id: `evt_rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      event_type: eventType,
      agent_id: agentId,
      task_id: taskId,
      execution_id: executionId,
      project_id: projectId,
      workspace_id: workspaceId,
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
          }
        }
      }
    }

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
   * Creates a persistent task and generates its initial plan.
   */
  public createTask(
    ownerId: string,
    projectId: string,
    workspaceId: string,
    agent: AgentDefinition,
    goal: string,
    priority: TaskPriority = 'medium',
    availableTools: ToolDefinition[]
  ): AgentTask {
    if (this.isKillSwitchActiveFor(projectId, agent.id)) {
      throw new Error('Operation rejected: Emergency Kill Switch is currently active.');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const plan = this.generatePlan(goal, workspaceId, agent, availableTools);

    const task: AgentTask = {
      id: taskId,
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

    this.tasks.set(taskId, task);
    this.initWorkingMemory(task);

    const worker = this.registerWorker(agent);
    worker.current_task_id = taskId;
    worker.state = 'IDLE';

    this.emitEvent('task_created', { taskId, goal, priority, stepsCount: plan.length }, agent.id, taskId, undefined, projectId, workspaceId);
    this.emitEvent('plan_created', { taskId, plan }, agent.id, taskId, undefined, projectId, workspaceId);
    this.logAudit('agent_action', agent.id, 'create_task', 'success', { taskId, goal }, projectId, workspaceId);

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
      this.emitEvent('task_completed', { taskId }, agent.id, taskId, undefined, task.project_id, task.workspace_id);
      this.logAudit('agent_action', agent.id, 'task_completed', 'success', { taskId }, task.project_id, task.workspace_id);
      return task;
    }

    const action = task.plan[task.current_action_index];
    const tool = availableTools.find(t => t.id === action.tool_id);
    if (!tool) {
      action.status = 'failed';
      action.error = `Tool ${action.tool_id} not available in registry.`;
      task.status = 'failed';
      task.failure_reason = action.error;
      worker.state = 'FAILED';
      this.emitEvent('task_failed', { taskId, error: action.error }, agent.id, taskId, undefined, task.project_id, task.workspace_id);
      return task;
    }

    action.status = 'executing';
    task.status = 'in_progress';
    if (!task.started_at) task.started_at = new Date().toISOString();
    worker.state = 'EXECUTING';

    this.emitEvent('action_started', { actionId: action.id, command: action.command }, agent.id, taskId, undefined, task.project_id, task.workspace_id);

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
      this.emitEvent('approval_required', { actionId: action.id, approvalId: job.approval_id }, agent.id, taskId, job.id, task.project_id, task.workspace_id);
      return task;
    }

    // Finished or failed
    if (job.state === 'executed') {
      action.status = 'completed';
      action.result = job.stdout;
      action.completed_at = new Date().toISOString();
      task.current_action_index++;

      this.updateMemory(task.project_id, task.workspace_id, agent.id, task.id, action.id, job.stdout, false);
      this.emitEvent('execution_completed', { actionId: action.id, stdout: job.stdout }, agent.id, taskId, job.id, task.project_id, task.workspace_id);

      // Check if all actions complete
      if (task.current_action_index >= task.plan.length) {
        task.status = 'completed';
        task.completed_at = new Date().toISOString();
        worker.state = 'COMPLETED';
        this.emitEvent('task_completed', { taskId }, agent.id, taskId, undefined, task.project_id, task.workspace_id);
      } else {
        worker.state = 'READY';
      }
    } else {
      action.status = 'failed';
      action.error = job.stderr || job.error_message || 'Execution error';
      task.status = 'failed';
      task.failure_reason = action.error;
      worker.state = 'FAILED';

      this.updateMemory(task.project_id, task.workspace_id, agent.id, task.id, action.id, action.error, true);
      this.emitEvent('execution_failed', { actionId: action.id, error: action.error }, agent.id, taskId, job.id, task.project_id, task.workspace_id);
      this.emitEvent('task_failed', { taskId, error: action.error }, agent.id, taskId, undefined, task.project_id, task.workspace_id);
    }

    return task;
  }

  public pauseTask(taskId: string, userId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.status = 'paused';
    const worker = this.workers.get(task.agent_id);
    if (worker) worker.state = 'PAUSED';
    this.emitEvent('agent_paused', { taskId }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id);
    this.logAudit('agent_action', userId, 'pause_task', 'success', { taskId }, task.project_id, task.workspace_id);
    return task;
  }

  public resumeTask(taskId: string, userId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status === 'paused') {
      task.status = 'in_progress';
      const worker = this.workers.get(task.agent_id);
      if (worker) worker.state = 'READY';
      this.logAudit('agent_action', userId, 'resume_task', 'success', { taskId }, task.project_id, task.workspace_id);
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

    this.emitEvent('execution_cancelled', { taskId }, task.agent_id, taskId, undefined, task.project_id, task.workspace_id);
    this.logAudit('agent_action', userId, 'cancel_task', 'success', { taskId }, task.project_id, task.workspace_id);
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
