/**
 * AI HEAVEN - Agent Execution State Machine & Human Approval Boundary
 * Orchestrates job transitions:
 * draft -> planned -> approved -> executing -> executed (or failed/cancelled/rejected)
 * Enforces human approval for destructive operations, fingerprint verification,
 * and immutable audit logging.
 */

import crypto from 'crypto';
import { AgentDefinition, AuditEvent, ToolDefinition } from '../../types/foundation';
import {
  ApprovalStatus,
  ExecutionApproval,
  ExecutionJob,
  ExecutionState,
  SandboxExecutionRequest
} from '../../types/execution';
import { SandboxExecutor, sandboxExecutor } from './sandboxExecutor';

export class ExecutionManager {
  private jobs = new Map<string, ExecutionJob>();
  private approvals = new Map<string, ExecutionApproval>();
  private auditLogCallback?: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void;

  constructor(private executor: SandboxExecutor = sandboxExecutor) {}

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
        resource: resource || (workspaceId ? `workspace:${workspaceId}` : undefined),
        result
      });
    }
  }

  /**
   * Generates a cryptographic fingerprint of the planned execution command and target.
   */
  public generateFingerprint(command: string, workspaceId: string, toolId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${command.trim()}|${workspaceId}|${toolId}`)
      .digest('hex');
  }

  /**
   * Submits and plans an execution job.
   */
  public async submitJob(
    request: SandboxExecutionRequest,
    agent: AgentDefinition,
    tool: ToolDefinition
  ): Promise<ExecutionJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 1. Tool authorization validation against agent permissions
    if (!agent.permissions.allowed_tools.includes(tool.id)) {
      const failedJob: ExecutionJob = {
        id: jobId,
        agent_id: agent.id,
        project_id: request.project_id,
        workspace_id: request.workspace_id,
        tool_id: tool.id,
        command: request.command,
        state: 'failed',
        is_destructive: false,
        requires_approval: false,
        stdout: '',
        stderr: `PERMISSION VIOLATION: Tool "${tool.id}" is not in agent "${agent.id}" allowed_tools whitelist.`,
        output_truncated: false,
        error_message: `Tool ${tool.id} not allowed for agent`,
        created_at: now,
        updated_at: now
      };
      this.jobs.set(jobId, failedJob);
      this.logAudit('tool_execution', agent.id, 'tool_authorization_failed', 'failure', { jobId, toolId: tool.id }, request.project_id, request.workspace_id, failedJob.stderr);
      return failedJob;
    }

    if (!tool.is_enabled || tool.availability === 'disabled') {
      const failedJob: ExecutionJob = {
        id: jobId,
        agent_id: agent.id,
        project_id: request.project_id,
        workspace_id: request.workspace_id,
        tool_id: tool.id,
        command: request.command,
        state: 'failed',
        is_destructive: false,
        requires_approval: false,
        stdout: '',
        stderr: `TOOL DISABLED: Tool "${tool.id}" is currently disabled in the platform registry.`,
        output_truncated: false,
        error_message: `Tool ${tool.id} is disabled`,
        created_at: now,
        updated_at: now
      };
      this.jobs.set(jobId, failedJob);
      this.logAudit('tool_execution', agent.id, 'tool_disabled', 'failure', { jobId, toolId: tool.id }, request.project_id, request.workspace_id, failedJob.stderr);
      return failedJob;
    }

    // 2. Destructive command detection
    const isDestructive = this.executor.isDestructive(request.command);
    const requiresApproval =
      (isDestructive && agent.permissions.requires_approval_for_destructive) ||
      tool.execution_policy.requires_confirmation;

    let initialJob: ExecutionJob = {
      id: jobId,
      agent_id: agent.id,
      project_id: request.project_id,
      workspace_id: request.workspace_id,
      tool_id: tool.id,
      command: request.command,
      state: 'planned',
      is_destructive: isDestructive,
      requires_approval: requiresApproval,
      stdout: '',
      stderr: '',
      output_truncated: false,
      created_at: now,
      updated_at: now
    };

    if (requiresApproval) {
      // Create Human Approval Record
      const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fingerprint = this.generateFingerprint(request.command, request.workspace_id, tool.id);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes TTL

      const approval: ExecutionApproval = {
        id: approvalId,
        execution_id: jobId,
        project_id: request.project_id,
        workspace_id: request.workspace_id,
        agent_id: agent.id,
        command: request.command,
        command_fingerprint: fingerprint,
        requested_by_actor: 'agent',
        status: 'pending',
        created_at: now,
        expires_at: expiresAt
      };

      initialJob.approval_id = approvalId;
      this.approvals.set(approvalId, approval);
      this.jobs.set(jobId, initialJob);

      this.logAudit(
        'approval_decision',
        agent.id,
        'request_human_approval',
        'pending',
        { jobId, approvalId, command: request.command, isDestructive },
        request.project_id,
        request.workspace_id
      );

      return initialJob; // Pauses at 'planned'
    }

    // Non-destructive: proceeds directly to executing
    this.jobs.set(jobId, initialJob);
    return await this.runExecution(jobId, request, tool, agent);
  }

  /**
   * Evaluates human decision on an approval request.
   */
  public async decideApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    userId: string,
    rejectionReason?: string,
    agent?: AgentDefinition,
    tool?: ToolDefinition
  ): Promise<{ approval: ExecutionApproval; job: ExecutionJob }> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval record not found: ${approvalId}`);
    }

    const job = this.jobs.get(approval.execution_id);
    if (!job) {
      throw new Error(`Execution job not found for approval: ${approval.execution_id}`);
    }

    // 1. Guard against already decided or consumed approvals
    if (approval.status !== 'pending') {
      throw new Error(`Approval already decided or consumed (status: ${approval.status})`);
    }

    // 2. Guard against expired approvals
    if (new Date(approval.expires_at) < new Date()) {
      approval.status = 'expired';
      job.state = 'rejected';
      job.updated_at = new Date().toISOString();
      job.error_message = 'Approval expired before decision.';
      throw new Error('Approval request has expired (TTL elapsed).');
    }

    // 3. Prevent agent from approving its own action
    if (userId === approval.agent_id) {
      throw new Error('Security Violation: Agent cannot approve its own destructive operation.');
    }

    // 4. Verify command fingerprint has not been altered
    const currentFingerprint = this.generateFingerprint(job.command, job.workspace_id, job.tool_id);
    if (currentFingerprint !== approval.command_fingerprint) {
      approval.status = 'rejected';
      job.state = 'rejected';
      job.error_message = 'Security Violation: Command fingerprint mismatch.';
      throw new Error('Command tampering detected: fingerprint mismatch.');
    }

    const now = new Date().toISOString();
    approval.decided_by_user_id = userId;
    approval.decided_at = now;

    if (decision === 'rejected') {
      approval.status = 'rejected';
      approval.rejection_reason = rejectionReason || 'Rejected by operator';
      job.state = 'rejected';
      job.updated_at = now;
      job.error_message = approval.rejection_reason;

      this.logAudit(
        'approval_decision',
        userId,
        'reject_execution',
        'rejected',
        { jobId: job.id, approvalId, reason: approval.rejection_reason },
        job.project_id,
        job.workspace_id
      );

      return { approval, job };
    }

    // Decision: approved
    approval.status = 'approved';
    job.state = 'approved';
    job.updated_at = now;

    this.logAudit(
      'approval_decision',
      userId,
      'approve_execution',
      'success',
      { jobId: job.id, approvalId, command: job.command },
      job.project_id,
      job.workspace_id
    );

    // If agent & tool provided, proceed immediately to execution
    if (agent && tool) {
      const executedJob = await this.runExecution(
        job.id,
        {
          agent_id: job.agent_id,
          project_id: job.project_id,
          workspace_id: job.workspace_id,
          tool_id: job.tool_id,
          command: job.command
        },
        tool,
        agent
      );
      return { approval, job: executedJob };
    }

    return { approval, job };
  }

  /**
   * Executes a job through the SandboxExecutor.
   */
  public async runExecution(
    jobId: string,
    request: SandboxExecutionRequest,
    tool: ToolDefinition,
    agent: AgentDefinition
  ): Promise<ExecutionJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.state = 'executing';
    job.started_at = new Date().toISOString();
    job.updated_at = job.started_at;

    this.logAudit(
      'tool_execution',
      agent.id,
      'start_sandbox_execution',
      'pending',
      { jobId, toolId: tool.id, command: request.command },
      request.project_id,
      request.workspace_id
    );

    const result = await this.executor.execute(request, tool, agent.permissions, jobId);

    job.completed_at = new Date().toISOString();
    job.updated_at = job.completed_at;
    job.exit_code = result.exit_code;
    job.stdout = result.stdout;
    job.stderr = result.stderr;
    job.output_truncated = result.output_truncated;

    if (result.exit_code === 0) {
      job.state = 'executed';
      this.logAudit(
        'tool_execution',
        agent.id,
        'finish_sandbox_execution',
        'success',
        { jobId, durationMs: result.duration_ms, outputTruncated: result.output_truncated },
        request.project_id,
        request.workspace_id
      );
    } else if (result.exit_code === 124) {
      job.state = 'timed_out';
      job.error_message = result.stderr || 'Execution boundary timeout exceeded.';
      this.logAudit(
        'tool_execution',
        agent.id,
        'timeout_sandbox_execution',
        'failure',
        { jobId, exitCode: 124, stderr: result.stderr },
        request.project_id,
        request.workspace_id,
        job.error_message
      );
    } else {
      job.state = 'failed';
      job.error_message = result.stderr || `Command failed with exit code ${result.exit_code}`;
      this.logAudit(
        'tool_execution',
        agent.id,
        'failed_sandbox_execution',
        'failure',
        { jobId, exitCode: result.exit_code, stderr: result.stderr },
        request.project_id,
        request.workspace_id,
        job.error_message
      );
    }

    return job;
  }

  /**
   * Cancels a pending or planned execution job.
   */
  public cancelJob(jobId: string, actorId: string): ExecutionJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.state === 'executed' || job.state === 'failed' || job.state === 'cancelled') {
      throw new Error(`Cannot cancel job in state: ${job.state}`);
    }

    job.state = 'cancelled';
    job.updated_at = new Date().toISOString();
    job.error_message = 'Execution cancelled by user.';

    if (job.approval_id) {
      const appr = this.approvals.get(job.approval_id);
      if (appr && appr.status === 'pending') {
        appr.status = 'rejected';
        appr.rejection_reason = 'Cancelled by job cancellation';
      }
    }

    this.logAudit(
      'tool_execution',
      actorId,
      'cancel_execution_job',
      'success',
      { jobId },
      job.project_id,
      job.workspace_id
    );

    return job;
  }

  public getJob(jobId: string): ExecutionJob | undefined {
    return this.jobs.get(jobId);
  }

  public listJobs(projectId?: string, workspaceId?: string): ExecutionJob[] {
    let list = Array.from(this.jobs.values());
    if (projectId) list = list.filter(j => j.project_id === projectId);
    if (workspaceId) list = list.filter(j => j.workspace_id === workspaceId);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public getApproval(approvalId: string): ExecutionApproval | undefined {
    return this.approvals.get(approvalId);
  }

  public listApprovals(projectId?: string, status?: ApprovalStatus): ExecutionApproval[] {
    let list = Array.from(this.approvals.values());
    if (projectId) list = list.filter(a => a.project_id === projectId);
    if (status) list = list.filter(a => a.status === status);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export const executionManager = new ExecutionManager();
