import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Flame,
  HardDrive,
  HelpCircle,
  Layers,
  ListTodo,
  Lock,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import {
  AgentTask,
  AgentWorker,
  AgentWorkingMemory,
  KillSwitchScope,
  KillSwitchStatus,
  PlannedAction,
  RuntimeEvent,
  TaskPriority
} from '../../types/agentRuntime';
import {
  AgentDefinition,
  DroidManifest,
  ExecutionReceipt,
  Project,
  ToolDefinition,
  Workspace
} from '../../types/foundation';
import { ExecutionApproval, ExecutionJob } from '../../types/execution';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type AgentSubTab = 'fleet' | 'workspace' | 'approvals' | 'memory' | 'logs';

interface AgentRuntimeConsoleProps {
  initialTab?: AgentSubTab;
  onNavigateDetail?: (slug: string) => void;
  onNavigateKnowledgeGraph?: () => void;
  onApprovalsCountChange?: (count: number) => void;
}

export const AgentRuntimeConsole: React.FC<AgentRuntimeConsoleProps> = ({
  initialTab,
  onNavigateDetail,
  onNavigateKnowledgeGraph,
  onApprovalsCountChange
}) => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<AgentSubTab>(initialTab || 'workspace');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Core Entity State
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [workers, setWorkers] = useState<AgentWorker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [approvals, setApprovals] = useState<ExecutionApproval[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<AgentWorkingMemory | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ExecutionReceipt | null>(null);
  const [selectedManifest, setSelectedManifest] = useState<DroidManifest | null>(null);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState<boolean>(false);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [killSwitch, setKillSwitch] = useState<KillSwitchStatus>({
    is_active: false,
    triggered_by: '',
    triggered_at: '',
    reason: ''
  });

  // Loading & Processing States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExecutingStep, setIsExecutingStep] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState<boolean>(false);
  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState<boolean>(false);
  const [rejectingApprovalId, setRejectingApprovalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Form States for New Task
  const [newTaskGoal, setNewTaskGoal] = useState<string>('');
  const [newTaskAgentId, setNewTaskAgentId] = useState<string>('');
  const [newTaskWorkspaceId, setNewTaskWorkspaceId] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');

  // Form States for New Agent
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentDesc, setNewAgentDesc] = useState<string>('');
  const [newAgentProjectId, setNewAgentProjectId] = useState<string>('');
  const [newAgentWorkspaceId, setNewAgentWorkspaceId] = useState<string>('');
  const [newAgentTools, setNewAgentTools] = useState<string[]>([
    'tool_terminal_sandbox',
    'tool_fs_scoped',
    'tool_mcp_client'
  ]);
  const [newAgentNetwork, setNewAgentNetwork] = useState<boolean>(true);
  const [newAgentRequiresApproval, setNewAgentRequiresApproval] = useState<boolean>(true);

  // Kill Switch Form
  const [killScope, setKillScope] = useState<KillSwitchScope>('global');
  const [killReason, setKillReason] = useState<string>('Operator manual emergency halt triggered from UI');

  // Load all initial runtime data
  const refreshAll = useCallback(async () => {
    try {
      const [
        agentsData,
        workersData,
        projectsData,
        workspacesData,
        toolsData,
        tasksData,
        approvalsData,
        killData,
        eventsData
      ] = await Promise.all([
        apiClient.getAgents(),
        apiClient.getWorkers(),
        apiClient.getProjects(),
        apiClient.getWorkspaces(),
        apiClient.getTools(),
        apiClient.getTasks(),
        apiClient.getApprovals(),
        apiClient.getKillSwitch(),
        apiClient.getEvents({ limit: 50 })
      ]);

      setAgents(agentsData);
      setWorkers(workersData);
      setProjects(projectsData);
      setWorkspaces(workspacesData);
      setTools(toolsData);
      setTasks(tasksData);
      setApprovals(approvalsData);
      setKillSwitch(killData);
      setEvents(eventsData);

      if (onApprovalsCountChange) {
        const pending = approvalsData.filter(a => a.status === 'pending').length;
        onApprovalsCountChange(pending);
      }

      // If a task was selected, refresh it
      if (selectedTask) {
        const fresh = tasksData.find(t => t.id === selectedTask.id);
        if (fresh) {
          setSelectedTask(fresh);
          const mem = await apiClient.getTaskMemory(fresh.id);
          setSelectedMemory(mem);
        }
      } else if (tasksData.length > 0) {
        setSelectedTask(tasksData[0]);
        const mem = await apiClient.getTaskMemory(tasksData[0].id);
        setSelectedMemory(mem);
      }

      // Defaults
      if (!newTaskAgentId && agentsData.length > 0) {
        setNewTaskAgentId(agentsData[0].id);
      }
      if (!newTaskWorkspaceId && workspacesData.length > 0) {
        setNewTaskWorkspaceId(workspacesData[0].id);
      }
      if (!newAgentProjectId && projectsData.length > 0) {
        setNewAgentProjectId(projectsData[0].id);
      }
      if (!newAgentWorkspaceId && workspacesData.length > 0) {
        setNewAgentWorkspaceId(workspacesData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to refresh agent runtime:', err);
      setActionError(err.message || 'Failed to sync runtime state');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTask, onApprovalsCountChange, newTaskAgentId, newTaskWorkspaceId, newAgentProjectId, newAgentWorkspaceId]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 3000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleSelectTask = async (task: AgentTask) => {
    setSelectedTask(task);
    setActionError(null);
    try {
      const [mem, receipt] = await Promise.all([
        apiClient.getTaskMemory(task.id),
        apiClient.getTaskReceipt(task.id)
      ]);
      setSelectedMemory(mem);
      setSelectedReceipt(receipt);
    } catch {
      setSelectedMemory(null);
      setSelectedReceipt(null);
    }
  };

  const handleInspectManifest = async (agentId: string) => {
    try {
      const manifest = await apiClient.getDroidManifest(agentId);
      if (manifest) {
        setSelectedManifest(manifest);
        setIsManifestModalOpen(true);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch droid manifest');
    }
  };

  const handleExecuteNextAction = async () => {
    if (!selectedTask) return;
    setIsExecutingStep(true);
    setActionError(null);
    try {
      const updated = await apiClient.executeNextAction(selectedTask.id);
      if (updated) {
        setSelectedTask(updated);
        const [mem, apprs, receipt] = await Promise.all([
          apiClient.getTaskMemory(updated.id),
          apiClient.getApprovals(),
          apiClient.getTaskReceipt(updated.id)
        ]);
        setSelectedMemory(mem);
        setApprovals(apprs);
        setSelectedReceipt(receipt);
      }
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message || 'Failed to advance task step');
    } finally {
      setIsExecutingStep(false);
    }
  };

  const handlePauseTask = async (taskId: string) => {
    try {
      await apiClient.pauseTask(taskId);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      await apiClient.resumeTask(taskId);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await apiClient.cancelTask(taskId);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handlePingHeartbeat = async (agentId: string) => {
    try {
      await apiClient.sendWorkerHeartbeat(agentId);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleDecideApproval = async (approvalId: string, decision: 'approved' | 'rejected', reason?: string) => {
    try {
      await apiClient.decideApproval(approvalId, decision, reason);
      setRejectingApprovalId(null);
      setRejectionReason('');
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleTriggerKillSwitch = async () => {
    try {
      await apiClient.triggerKillSwitch(killScope, undefined, killReason);
      setIsKillSwitchModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleResetKillSwitch = async () => {
    try {
      await apiClient.resetKillSwitch();
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskGoal.trim() || !newTaskAgentId || !newTaskWorkspaceId) {
      setActionError('Goal, Agent, and Workspace are required');
      return;
    }
    const agent = agents.find(a => a.id === newTaskAgentId);
    if (!agent) {
      setActionError('Selected agent not found');
      return;
    }

    try {
      const task = await apiClient.createTask({
        agent_id: newTaskAgentId,
        project_id: agent.project_id,
        workspace_id: newTaskWorkspaceId,
        goal: newTaskGoal.trim(),
        priority: newTaskPriority
      });
      if (task) {
        setIsNewTaskModalOpen(false);
        setNewTaskGoal('');
        setSelectedTask(task);
        setActiveTab('workspace');
        await refreshAll();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to initialize task plan');
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentProjectId) {
      setActionError('Agent name and project are required');
      return;
    }

    try {
      const newAgent = await apiClient.createAgent({
        name: newAgentName.trim(),
        description: newAgentDesc.trim(),
        project_id: newAgentProjectId,
        workspace_id: newAgentWorkspaceId || undefined,
        permissions: {
          allowed_tools: newAgentTools,
          network_access: newAgentNetwork,
          filesystem_scope: 'workspace_only',
          requires_approval_for_destructive: newAgentRequiresApproval
        }
      });
      if (newAgent) {
        setIsNewAgentModalOpen(false);
        setNewAgentName('');
        setNewAgentDesc('');
        await refreshAll();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create agent');
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* 1. EMERGENCY KILL SWITCH ACTIVE WARNING BANNER */}
      {killSwitch.is_active && (
        <div className="rounded-lg border border-rose-600 bg-rose-950/70 p-4 text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-rose-600 text-white shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-rose-200">
                EMERGENCY KILL SWITCH ENGAGED ({killSwitch.scope?.toUpperCase()} SCOPE)
              </div>
              <p className="text-[11px] text-rose-300 mt-0.5">
                Reason: {killSwitch.reason || 'Operator manual emergency stop'} • Triggered at:{' '}
                {new Date(killSwitch.triggered_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetKillSwitch}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Disarm & Reset System
          </Button>
        </div>
      )}

      {/* 2. Action Error Banner */}
      {actionError && (
        <div className="p-3 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between font-mono">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
            ×
          </button>
        </div>
      )}

      {/* 3. Header & Controls */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>RUNTIME</span>
              <span className="text-slate-600">/</span>
              <span>AGENT CONSOLE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 font-mono tracking-tight">
              Personal AI Agent Runtime
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Persistent worker lifecycle management, multi-step task planner, short-term memory layer, and emergency halt protocol.
            </p>
          </div>

          {/* Quick Actions & Kill Switch */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsNewTaskModalOpen(true)}
            >
              New Task
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsNewAgentModalOpen(true)}
            >
              Register Droid
            </Button>

            <Button
              variant="destructive"
              size="sm"
              icon={<AlertOctagon className="h-3.5 w-3.5" />}
              onClick={() => setIsKillSwitchModalOpen(true)}
            >
              Kill Switch
            </Button>
          </div>
        </div>

        {/* 4. Sub-Tab Navigation Bar */}
        <div className="flex border-b border-slate-800 mt-6 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'workspace'
                ? 'border-blue-500 text-slate-100 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>Task Execution</span>
            {tasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                {tasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'fleet'
                ? 'border-blue-500 text-slate-100 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Agent Fleet</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
              {workers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'approvals'
                ? 'border-blue-500 text-slate-100 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Approval Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'memory'
                ? 'border-blue-500 text-slate-100 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>Working Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-slate-100 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Runtime Logs</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB: AGENT WORKSPACE & TASK EXECUTION                                  */}
      {/* ===================================================================== */}
      {activeTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Task Selector (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Active Tasks ({tasks.length})
              </span>
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>New</span>
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/30 text-center text-xs font-mono text-slate-500">
                No tasks queued.
                <div className="mt-2">
                  <Button variant="secondary" size="xs" onClick={() => setIsNewTaskModalOpen(true)}>
                    Create First Goal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {tasks.map(task => {
                  const isSelected = selectedTask?.id === task.id;
                  const assignedAgent = agents.find(a => a.id === task.agent_id);
                  const completedSteps = task.plan.filter(p => p.status === 'completed').length;
                  const totalSteps = task.plan.length;

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500/50 bg-blue-950/20 text-slate-100'
                          : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span className="truncate max-w-[140px] text-slate-300 font-medium">
                          {assignedAgent?.name || task.agent_id}
                        </span>
                        <Badge
                          variant={
                            task.status === 'completed'
                              ? 'success'
                              : task.status === 'in_progress'
                              ? 'info'
                              : task.status === 'paused'
                              ? 'warning'
                              : task.status === 'cancelled'
                              ? 'danger'
                              : 'neutral'
                          }
                          size="xs"
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2">
                        {task.goal}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/40">
                        <span>
                          Step {completedSteps} / {totalSteps}
                        </span>
                        <span>{new Date(task.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Execution Console (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedTask ? (
              <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5 space-y-5">
                {/* Task Header & Execution Controls */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {selectedTask.id}
                      </span>
                      <Badge
                        variant={
                          selectedTask.status === 'completed'
                            ? 'success'
                            : selectedTask.status === 'in_progress'
                            ? 'info'
                            : selectedTask.status === 'paused'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="xs"
                        dot
                      >
                        {selectedTask.status}
                      </Badge>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {selectedTask.priority} priority
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-slate-100 font-mono">
                      {selectedTask.goal}
                    </h2>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-4">
                      <span>Agent: {agents.find(a => a.id === selectedTask.agent_id)?.name || selectedTask.agent_id}</span>
                      <span>Workspace: {selectedTask.workspace_id}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isExecutingStep}
                        disabled={selectedTask.status === 'paused'}
                        onClick={handleExecuteNextAction}
                        icon={<Play className="h-3 w-3 fill-current" />}
                      >
                        Execute Step
                      </Button>
                    )}

                    {selectedTask.status === 'in_progress' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePauseTask(selectedTask.id)}
                        icon={<Pause className="h-3 w-3" />}
                      >
                        Pause
                      </Button>
                    )}

                    {selectedTask.status === 'paused' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResumeTask(selectedTask.id)}
                        icon={<Play className="h-3 w-3" />}
                      >
                        Resume
                      </Button>
                    )}

                    {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelTask(selectedTask.id)}
                        icon={<Trash2 className="h-3 w-3" />}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Strip */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                    <span>
                      Progression: {selectedTask.current_action_index} of {selectedTask.plan.length} actions complete
                    </span>
                    <span className="tabular-nums">
                      {Math.round((selectedTask.current_action_index / Math.max(selectedTask.plan.length, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${(selectedTask.current_action_index / Math.max(selectedTask.plan.length, 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Plan Steps Table */}
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                    Plan Execution Sequence ({selectedTask.plan.length} Steps)
                  </div>

                  <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-500">
                            <th className="py-2.5 px-3 font-medium">#</th>
                            <th className="py-2.5 px-3 font-medium">Action Purpose</th>
                            <th className="py-2.5 px-3 font-medium">Command</th>
                            <th className="py-2.5 px-3 font-medium">Risk Level</th>
                            <th className="py-2.5 px-3 font-medium">Authorization</th>
                            <th className="py-2.5 px-3 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedTask.plan.map((action, idx) => {
                            const isCurrent = idx === selectedTask.current_action_index && selectedTask.status !== 'completed';
                            return (
                              <tr
                                key={action.id}
                                className={`transition-colors ${
                                  isCurrent ? 'bg-blue-950/20' : 'hover:bg-slate-900/40'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-bold text-slate-400">
                                  {action.step_number}
                                </td>
                                <td className="py-2.5 px-3 font-sans text-slate-200">
                                  {action.purpose}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 text-blue-400/90 font-mono text-[11px]">
                                    <Terminal className="h-3 w-3 text-slate-500 shrink-0" />
                                    <span>{action.command}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    variant={
                                      action.risk_classification === 'destructive'
                                        ? 'danger'
                                        : action.risk_classification === 'high'
                                        ? 'warning'
                                        : 'neutral'
                                    }
                                    size="xs"
                                  >
                                    {action.risk_classification}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  {action.requires_approval ? (
                                    <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                                      <Lock className="h-3 w-3" /> Requires Approval
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                      <ShieldCheck className="h-3 w-3" /> Auto-Authorized
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Badge
                                    variant={
                                      action.status === 'completed'
                                        ? 'success'
                                        : action.status === 'executing'
                                        ? 'info'
                                        : action.status === 'failed'
                                        ? 'danger'
                                        : 'neutral'
                                    }
                                    size="xs"
                                    dot={action.status === 'executing'}
                                  >
                                    {action.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Output Inspection Box (if results exist) */}
                {selectedTask.plan.some(p => p.result || p.error) && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                      Step Outputs & Logs
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 max-h-48 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap space-y-2">
                      {selectedTask.plan.map(p => {
                        if (!p.result && !p.error) return null;
                        return (
                          <div key={p.id} className="border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                            <div className="text-slate-500 text-[10px] mb-0.5">
                              Step {p.step_number}: {p.command}
                            </div>
                            {p.result && <div className="text-emerald-300/90">{p.result}</div>}
                            {p.error && <div className="text-rose-400">{p.error}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Structured Execution Receipt (Phase 1D) */}
                {selectedReceipt && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-800/40">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <FileText className="h-4 w-4" />
                        <span>STRUCTURED EXECUTION RECEIPT</span>
                      </div>
                      <Badge variant={selectedReceipt.final_status === 'completed' ? 'success' : 'danger'} size="xs">
                        {selectedReceipt.final_status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Receipt ID</span>
                        <span className="text-slate-200 font-semibold">{selectedReceipt.receipt_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Duration</span>
                        <span className="text-slate-200">{selectedReceipt.duration_ms} ms</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Correlation ID</span>
                        <span className="text-slate-200 truncate block">{selectedReceipt.correlation_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Sandbox Engine</span>
                        <span className="text-slate-200">{selectedReceipt.provenance.engine}</span>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1 pt-1">
                      <span className="text-slate-500 block">Tools Authorized & Used:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedReceipt.tools_used.map(t => (
                          <code key={t} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                            {t}
                          </code>
                        ))}
                      </div>
                    </div>

                    {selectedReceipt.failures.length > 0 && (
                      <div className="text-[11px] space-y-1 text-red-300 pt-1">
                        <span className="text-red-400 font-semibold block">Failures Logged:</span>
                        {selectedReceipt.failures.map((f, i) => (
                          <div key={i} className="bg-red-950/30 p-1.5 rounded border border-red-800/40">
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-12 text-center text-slate-500 font-mono text-xs">
                Select a task on the left or create a new goal.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: AGENT FLEET (TABLE-FIRST)                                        */}
      {/* ===================================================================== */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold uppercase tracking-wider text-slate-400">
              Agent Fleet Directory ({workers.length} Droids)
            </span>
            <Button
              variant="primary"
              size="xs"
              icon={<Plus className="h-3 w-3" />}
              onClick={() => setIsNewAgentModalOpen(true)}
            >
              Register Droid
            </Button>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500">
                    <th className="py-2.5 px-4 font-medium">Agent / Role</th>
                    <th className="py-2.5 px-4 font-medium">State</th>
                    <th className="py-2.5 px-4 font-medium">Health</th>
                    <th className="py-2.5 px-4 font-medium">Active Task</th>
                    <th className="py-2.5 px-4 font-medium">Heartbeat</th>
                    <th className="py-2.5 px-4 font-medium">Allowed Tools</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {agents.map(agent => {
                    const worker = workers.find(w => w.agent_id === agent.id);
                    return (
                      <tr key={agent.id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200 font-sans">{agent.name}</div>
                          <div className="text-[11px] text-slate-500">{agent.id}</div>
                          <div className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-1">
                            {agent.description}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              worker?.state === 'READY'
                                ? 'success'
                                : worker?.state === 'EXECUTING'
                                ? 'info'
                                : worker?.state === 'WAITING_APPROVAL'
                                ? 'warning'
                                : worker?.state === 'TERMINATED'
                                ? 'danger'
                                : 'neutral'
                            }
                            size="xs"
                            dot
                          >
                            {worker?.state || 'OFFLINE'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {worker?.health || 'healthy'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {worker?.current_task_id ? (
                            <span className="text-blue-400">{worker.current_task_id}</span>
                          ) : (
                            <span className="text-slate-600">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {worker?.heartbeat_at
                            ? new Date(worker.heartbeat_at).toLocaleTimeString()
                            : 'Recent'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {agent.permissions.allowed_tools.map(t => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300"
                              >
                                {t.replace('tool_', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={<FileText className="h-3 w-3" />}
                              onClick={() => handleInspectManifest(agent.id)}
                            >
                              Manifest
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={<RefreshCw className="h-3 w-3" />}
                              onClick={() => handlePingHeartbeat(agent.id)}
                            >
                              Ping
                            </Button>
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => {
                                setNewTaskAgentId(agent.id);
                                setIsNewTaskModalOpen(true);
                              }}
                            >
                              Assign
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: APPROVAL QUEUE                                                   */}
      {/* ===================================================================== */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Human Authorization Queue ({pendingApprovals.length} Pending)
              </span>
              <p className="text-slate-500 mt-0.5 text-[11px]">
                High-risk operations are quarantined at the sandbox boundary pending explicit operator sign-off.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-12 text-center text-xs font-mono text-slate-500">
              <ShieldCheck className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
              <div className="text-slate-300 font-semibold">Queue is Clear</div>
              <p className="mt-1">All agent operations comply with auto-authorization policies.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(approval => {
                const isRejecting = rejectingApprovalId === approval.id;
                return (
                  <div
                    key={approval.id}
                    className="rounded-lg border border-amber-600/50 bg-amber-950/20 p-4 space-y-3 font-mono text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="danger" size="xs">
                            DESTRUCTIVE
                          </Badge>
                          <span className="text-slate-400 font-medium">Approval: {approval.id}</span>
                        </div>
                        <div className="text-slate-200 mt-1 font-semibold">
                          Target Execution: {approval.execution_id}
                        </div>
                        <div className="text-amber-400/90 text-[11px] mt-0.5">
                          Command: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-rose-300">{approval.command}</code>
                        </div>
                        <div className="text-slate-500 text-[10px] mt-1">
                          Workspace: {approval.workspace_id} • Created: {new Date(approval.created_at).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="success"
                          size="sm"
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          onClick={() => handleDecideApproval(approval.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          icon={<XCircle className="h-3.5 w-3.5" />}
                          onClick={() => setRejectingApprovalId(isRejecting ? null : approval.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>

                    {isRejecting && (
                      <div className="p-3 rounded border border-rose-800 bg-rose-950/60 space-y-2 text-xs">
                        <label className="text-rose-200 font-medium block">
                          Reason for rejection (audited in event log):
                        </label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="e.g., Command would purge production workspace assets"
                          className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="xs" onClick={() => setRejectingApprovalId(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDecideApproval(approval.id, 'rejected', rejectionReason)}
                          >
                            Confirm Rejection
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: WORKING MEMORY INSPECTOR                                         */}
      {/* ===================================================================== */}
      {activeTab === 'memory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Short-Term Working Memory
              </span>
              <p className="text-slate-500 mt-0.5 text-[11px]">
                Strict tenant scoping: Owner → Project → Workspace → Agent → Task
              </p>
            </div>
            {selectedTask && (
              <Badge variant="info" size="sm">
                Task: {selectedTask.id}
              </Badge>
            )}
          </div>

          {selectedMemory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 space-y-3 font-mono text-xs">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  Memory Scope & Goal
                </div>
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="text-slate-500">Current Goal:</div>
                  <div className="text-slate-200 font-medium font-sans">{selectedMemory.current_goal}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Agent ID:</span>
                    <span className="text-slate-300">{selectedMemory.agent_id}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Workspace:</span>
                    <span className="text-slate-300">{selectedMemory.workspace_id}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 space-y-3 font-mono text-xs">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  Observations Log ({selectedMemory.observations.length})
                </div>
                {selectedMemory.observations.length === 0 ? (
                  <div className="text-slate-500 py-6 text-center">No observations recorded yet.</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedMemory.observations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-950 border border-slate-800/80 text-emerald-300/90 text-xs flex items-start gap-2"
                      >
                        <span className="text-slate-500">[{idx + 1}]</span>
                        <span>{obs}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-12 text-center text-xs font-mono text-slate-500">
              No memory loaded. Select a task from the Task Execution tab to inspect its working memory layer.
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: RUNTIME LOGS / EVENT STREAM                                      */}
      {/* ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold uppercase tracking-wider text-slate-400">
              Runtime Telemetry Stream ({events.length} Events)
            </span>
            <Button variant="secondary" size="xs" icon={<RefreshCw className="h-3 w-3" />} onClick={refreshAll}>
              Refresh
            </Button>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 space-y-2 max-h-[550px] overflow-y-auto font-mono text-xs">
            {events.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No events logged yet.</div>
            ) : (
              events.map(ev => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-slate-300 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="info" size="xs">
                      {ev.event_type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-slate-400 truncate max-w-xs">{ev.id}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] shrink-0">
                    {ev.agent_id ? `Agent: ${ev.agent_id}` : 'System'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NEW TASK DEFINITION                                            */}
      {/* ===================================================================== */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0B0F19] p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-blue-400" />
                <span>Define Task Goal</span>
              </h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Assign Droid Worker:</label>
                <select
                  value={newTaskAgentId}
                  onChange={e => setNewTaskAgentId(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Target Workspace:</label>
                <select
                  value={newTaskWorkspaceId}
                  onChange={e => setNewTaskWorkspaceId(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Priority:</label>
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as any)}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Goal Description:</label>
                <textarea
                  value={newTaskGoal}
                  onChange={e => setNewTaskGoal(e.target.value)}
                  rows={3}
                  placeholder="e.g., Audit workspace filesystem dependencies and run compiler verification"
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="secondary" size="xs" onClick={() => setIsNewTaskModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="xs" type="submit">
                  Generate Plan & Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REGISTER NEW AGENT DROID                                       */}
      {/* ===================================================================== */}
      {isNewAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0B0F19] p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                <span>Register Droid Worker</span>
              </h3>
              <button onClick={() => setIsNewAgentModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Droid Name:</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  placeholder="e.g., AI Heaven Droid Beta"
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description:</label>
                <input
                  type="text"
                  value={newAgentDesc}
                  onChange={e => setNewAgentDesc(e.target.value)}
                  placeholder="Autonomous testing and sandbox compiler worker"
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Assign Project:</label>
                <select
                  value={newAgentProjectId}
                  onChange={e => setNewAgentProjectId(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-slate-300 font-medium block">Tool Permissions:</label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {tools.map(tool => {
                    const isChecked = newAgentTools.includes(tool.id);
                    return (
                      <label
                        key={tool.id}
                        className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewAgentTools(prev => [...prev, tool.id]);
                            } else {
                              setNewAgentTools(prev => prev.filter(t => t !== tool.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className="text-slate-300">{tool.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="secondary" size="xs" onClick={() => setIsNewAgentModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="xs" type="submit">
                  Register Droid
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EMERGENCY KILL SWITCH TRIGGER                                  */}
      {/* ===================================================================== */}
      {isKillSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-rose-600 bg-[#0B0F19] p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-900/60">
              <div className="p-2 rounded bg-rose-600 text-white shrink-0">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-100 uppercase tracking-wide">
                  Emergency Halt Kill Switch
                </h3>
                <p className="text-[11px] text-rose-300">
                  Forcefully terminates running workers and aborts queued jobs.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-rose-200 font-medium block mb-1">Halt Scope:</label>
                <select
                  value={killScope}
                  onChange={e => setKillScope(e.target.value as any)}
                  className="w-full rounded bg-slate-950 border border-rose-800 p-2 text-xs text-rose-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="global">Global (All Platform Agents & Workspaces)</option>
                  <option value="project">Project Scope</option>
                  <option value="agent">Single Agent Scope</option>
                </select>
              </div>

              <div>
                <label className="text-rose-200 font-medium block mb-1">
                  Reason for Halt (Audited):
                </label>
                <input
                  type="text"
                  value={killReason}
                  onChange={e => setKillReason(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-rose-800 p-2 text-xs text-rose-100 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rose-900/60">
                <Button variant="secondary" size="xs" onClick={() => setIsKillSwitchModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="xs" onClick={handleTriggerKillSwitch}>
                  Confirm Emergency Halt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DROID IDENTITY & CAPABILITY MANIFEST (Phase 1D)                */}
      {/* ===================================================================== */}
      {isManifestModalOpen && selectedManifest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0B0F19] p-6 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-blue-950 text-blue-400 border border-blue-800/40">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    {selectedManifest.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Machine-Readable Capability Manifest (v{selectedManifest.version})
                  </p>
                </div>
              </div>
              <Badge variant="info" size="xs">
                {selectedManifest.state}
              </Badge>
            </div>

            <div className="space-y-3 text-[11px]">
              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Description</span>
                <p className="text-slate-200 mt-0.5">{selectedManifest.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Droid ID:</span>
                  <span className="text-slate-200">{selectedManifest.droid_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Health:</span>
                  <span className="text-emerald-400 capitalize">{selectedManifest.health}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Filesystem Scope:</span>
                  <span className="text-slate-200 uppercase">{selectedManifest.capabilities.filesystem_scope}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Network Scope:</span>
                  <span className="text-slate-200 uppercase">{selectedManifest.capabilities.network_scope}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Max Execution Time:</span>
                  <span className="text-slate-200">{selectedManifest.capabilities.max_execution_time_seconds}s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Max Memory:</span>
                  <span className="text-slate-200">{selectedManifest.capabilities.max_memory_mb} MB</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px] mb-1">
                  Authorized Tool Whitelist ({selectedManifest.capabilities.allowed_tools.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedManifest.capabilities.allowed_tools.map(tool => (
                    <span key={tool} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-300">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 uppercase tracking-wider block text-[10px] mb-1">
                  Approval Gates Policy
                </span>
                <div className="space-y-1 bg-slate-900/40 p-2.5 rounded border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Destructive Shell Operations:</span>
                    <span className={selectedManifest.capabilities.approval_requirements.destructive_operations ? 'text-amber-400' : 'text-slate-400'}>
                      {selectedManifest.capabilities.approval_requirements.destructive_operations ? 'Requires Human Approval' : 'Auto-Permitted'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Direct Network Access:</span>
                    <span className={selectedManifest.capabilities.approval_requirements.network_access ? 'text-amber-400' : 'text-slate-400'}>
                      {selectedManifest.capabilities.approval_requirements.network_access ? 'Requires Approval' : 'Policy Governed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 space-y-0.5">
                <div>Provenance Author: <span className="text-slate-300">{selectedManifest.provenance.author}</span></div>
                <div>Organization: <span className="text-slate-300">{selectedManifest.provenance.organization}</span></div>
                <div>RFC Specification: <span className="text-slate-300">{selectedManifest.provenance.specification_version}</span></div>
                <div>Engine: <span className="text-slate-300">{selectedManifest.provenance.runtime_engine}</span></div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsManifestModalOpen(false);
                  setSelectedManifest(null);
                }}
              >
                Close Manifest
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
