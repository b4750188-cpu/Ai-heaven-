/**
 * AI HEAVEN - Phase 1C: Personal AI Agent Runtime & Adaptive GUI
 * Complete control console for persistent agent workers, multi-step task planner,
 * human approval boundary, working memory inspector, real-time activity feed,
 * and emergency kill switch.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
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
import { AgentDefinition, Project, ToolDefinition, Workspace } from '../../types/foundation';
import { ExecutionApproval, ExecutionJob } from '../../types/execution';

type ConsoleTab = 'fleet' | 'planner' | 'approvals' | 'memory' | 'events';

interface AgentRuntimeConsoleProps {
  onNavigateDetail?: (slug: string) => void;
  onNavigateKnowledgeGraph?: () => void;
  onApprovalsCountChange?: (count: number) => void;
}

export const AgentRuntimeConsole: React.FC<AgentRuntimeConsoleProps> = ({
  onNavigateDetail,
  onNavigateKnowledgeGraph,
  onApprovalsCountChange
}) => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ConsoleTab>('planner');

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
    'tool_fs_scoped'
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
          // Also refresh memory
          const mem = await apiClient.getTaskMemory(fresh.id);
          setSelectedMemory(mem);
        }
      } else if (tasksData.length > 0) {
        // Select latest task
        setSelectedTask(tasksData[0]);
        const mem = await apiClient.getTaskMemory(tasksData[0].id);
        setSelectedMemory(mem);
      }

      // Pre-select defaults for forms if empty
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

  // Handle task selection
  const handleSelectTask = async (task: AgentTask) => {
    setSelectedTask(task);
    setActionError(null);
    try {
      const mem = await apiClient.getTaskMemory(task.id);
      setSelectedMemory(mem);
    } catch {
      setSelectedMemory(null);
    }
  };

  // Execute next action in selected task
  const handleExecuteNextAction = async () => {
    if (!selectedTask) return;
    setIsExecutingStep(true);
    setActionError(null);
    try {
      const updated = await apiClient.executeNextAction(selectedTask.id);
      if (updated) {
        setSelectedTask(updated);
        // Refresh memory and approvals
        const [mem, apprs] = await Promise.all([
          apiClient.getTaskMemory(updated.id),
          apiClient.getApprovals()
        ]);
        setSelectedMemory(mem);
        setApprovals(apprs);
      }
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message || 'Failed to advance task step');
    } finally {
      setIsExecutingStep(false);
    }
  };

  // Task lifecycle actions
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

  // Heartbeat ping
  const handlePingHeartbeat = async (agentId: string) => {
    try {
      await apiClient.sendWorkerHeartbeat(agentId);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Approval decision
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

  // Kill Switch
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

  // Create Task
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
        setActiveTab('planner');
        await refreshAll();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to initialize task plan');
    }
  };

  // Create Agent
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

  // Helper template goals
  const goalTemplates = [
    {
      title: 'Audit Repository & Run Diagnostics',
      goal: 'Audit sandbox filesystem files, check dependency tree, and execute diagnostics'
    },
    {
      title: 'Inspect MCP Server Protocol',
      goal: 'Explore Model Context Protocol registered tool endpoints and verify schema validity'
    },
    {
      title: 'Purge Stale Build Artifacts [Destructive]',
      goal: 'Clean temporary workspace cache and delete old build directories requiring human authorization'
    }
  ];

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  return (
    <div className="space-y-6">
      {/* EMERGENCY KILL SWITCH ACTIVE BANNER */}
      {killSwitch.is_active && (
        <div className="rounded-lg border-2 border-rose-600 bg-rose-950/80 p-4 text-rose-100 shadow-lg shadow-rose-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-rose-600 text-white">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-sm uppercase tracking-wider text-rose-200">
                Emergency Kill Switch Active ({killSwitch.scope?.toUpperCase()} SCOPE)
              </div>
              <p className="text-xs text-rose-300 font-mono mt-0.5">
                Reason: {killSwitch.reason || 'Manual operator emergency stop'} • Triggered at:{' '}
                {new Date(killSwitch.triggered_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetKillSwitch}
            className="px-4 py-2 rounded border border-rose-400 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs flex items-center gap-2 transition-colors shrink-0 shadow"
          >
            <RotateCcw className="h-4 w-4" />
            Disarm & Reset System
          </button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between font-mono">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
            ×
          </button>
        </div>
      )}

      {/* Main Console Header Bar */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-neutral-100 flex items-center gap-2">
                  Personal AI Agent Runtime
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    Phase 1C
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Sandboxed execution boundary, multi-step planner, and human authorization control.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Kill Switch Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950/60 text-xs text-neutral-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-neutral-400" />
                <strong className="text-neutral-200">{workers.length}</strong> Workers
              </span>
              <span className="text-neutral-700">|</span>
              <span className="flex items-center gap-1.5">
                <ListTodo className="h-3.5 w-3.5 text-neutral-400" />
                <strong className="text-neutral-200">{tasks.length}</strong> Tasks
              </span>
              <span className="text-neutral-700">|</span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <strong className="text-amber-300">{pendingApprovals.length}</strong> Approvals
              </span>
            </div>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>

            <button
              onClick={() => setIsNewAgentModalOpen(true)}
              className="px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Register Agent
            </button>

            {/* Emergency Kill Switch Button */}
            <button
              onClick={() => setIsKillSwitchModalOpen(true)}
              className="px-3 py-1.5 rounded-md border border-rose-600 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-rose-950/50"
              title="Trigger emergency halt across agent workers"
            >
              <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
              Kill Switch
            </button>
          </div>
        </div>

        {/* Console Tab Navigation */}
        <div className="flex border-b border-neutral-800 mt-6 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('planner')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'planner'
                ? 'border-emerald-500 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>Task Planner & Execution</span>
            {tasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 text-[10px]">
                {tasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'fleet'
                ? 'border-emerald-500 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Agent Fleet</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 text-[10px]">
              {workers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'approvals'
                ? 'border-emerald-500 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Human Approval Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 font-bold text-[10px] animate-pulse">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'memory'
                ? 'border-emerald-500 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>Working Memory Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'events'
                ? 'border-emerald-500 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Real-Time Activity Feed</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TASK PLANNER & EXECUTION CONSOLE                                    */}
      {/* ========================================================================= */}
      {activeTab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Task Selector & Recent Tasks (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Agent Tasks ({tasks.length})
                </h3>
                <button
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 font-mono">
                  No tasks created yet.
                  <div className="mt-2">
                    <button
                      onClick={() => setIsNewTaskModalOpen(true)}
                      className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
                    >
                      Define First Goal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {tasks.map(task => {
                    const isSelected = selectedTask?.id === task.id;
                    const assignedAgent = agents.find(a => a.id === task.agent_id);
                    const completedSteps = task.plan.filter(p => p.status === 'completed').length;
                    const totalSteps = task.plan.length;

                    return (
                      <button
                        key={task.id}
                        onClick={() => handleSelectTask(task)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-emerald-500/50 bg-emerald-950/20 text-neutral-100'
                            : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                          <span className="truncate max-w-[140px] text-neutral-300 font-medium">
                            {assignedAgent?.name || task.agent_id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              task.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : task.status === 'in_progress'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : task.status === 'paused'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : task.status === 'cancelled'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-neutral-200 line-clamp-2">
                          {task.goal}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                          <span>
                            Steps: {completedSteps} / {totalSteps}
                          </span>
                          <span>{new Date(task.created_at).toLocaleTimeString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Goal Launcher Presets */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Quick Goal Presets
              </h4>
              <div className="space-y-2">
                {goalTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setNewTaskGoal(t.goal);
                      setIsNewTaskModalOpen(true);
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-neutral-800/80 bg-neutral-950/60 hover:bg-neutral-800/60 hover:border-neutral-700 transition-colors text-xs text-neutral-300 group"
                  >
                    <div className="font-medium text-neutral-200 group-hover:text-emerald-400">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5 font-mono">
                      {t.goal}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Step Plan & Action Progress (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedTask ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-5">
                {/* Task Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        Task: {selectedTask.id}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                          selectedTask.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : selectedTask.status === 'in_progress'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : selectedTask.status === 'paused'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {selectedTask.status}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        Priority: {selectedTask.priority}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-neutral-100 mt-1">
                      {selectedTask.goal}
                    </h2>
                    <div className="text-xs text-neutral-400 font-mono flex items-center gap-4">
                      <span>Agent: {agents.find(a => a.id === selectedTask.agent_id)?.name || selectedTask.agent_id}</span>
                      <span>Workspace: {selectedTask.workspace_id}</span>
                    </div>
                  </div>

                  {/* Execution Control Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                      <button
                        onClick={handleExecuteNextAction}
                        disabled={isExecutingStep || selectedTask.status === 'paused'}
                        className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        {isExecutingStep ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Execute Next Step
                          </>
                        )}
                      </button>
                    )}

                    {selectedTask.status === 'in_progress' && (
                      <button
                        onClick={() => handlePauseTask(selectedTask.id)}
                        className="p-1.5 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
                        title="Pause Task"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}

                    {selectedTask.status === 'paused' && (
                      <button
                        onClick={() => handleResumeTask(selectedTask.id)}
                        className="p-1.5 rounded-md border border-emerald-700 bg-emerald-950 text-emerald-300 text-xs"
                        title="Resume Task"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}

                    {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelTask(selectedTask.id)}
                        className="p-1.5 rounded-md border border-neutral-800 bg-neutral-900 hover:bg-rose-950 hover:text-rose-300 text-neutral-400 text-xs"
                        title="Cancel Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Step Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1.5">
                    <span>
                      Execution Progress: Step {selectedTask.current_action_index} of {selectedTask.plan.length}
                    </span>
                    <span>
                      {Math.round((selectedTask.current_action_index / Math.max(selectedTask.plan.length, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${(selectedTask.current_action_index / Math.max(selectedTask.plan.length, 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Plan Steps List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Generated Multi-Step Plan ({selectedTask.plan.length} Steps)
                  </h3>

                  {selectedTask.plan.map((action, index) => {
                    const isCurrent = index === selectedTask.current_action_index && selectedTask.status !== 'completed';
                    const isCompleted = action.status === 'completed';
                    const isExecuting = action.status === 'executing';
                    const isFailed = action.status === 'failed';

                    return (
                      <div
                        key={action.id}
                        className={`rounded-lg border p-4 transition-all ${
                          isExecuting
                            ? 'border-cyan-500 bg-cyan-950/20'
                            : isCurrent
                            ? 'border-emerald-500/60 bg-emerald-950/10'
                            : isCompleted
                            ? 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                            : isFailed
                            ? 'border-rose-800/80 bg-rose-950/20'
                            : 'border-neutral-800/60 bg-neutral-950/20 text-neutral-400'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-neutral-800 text-neutral-200 text-xs font-mono flex items-center justify-center font-bold">
                              {action.step_number}
                            </span>
                            <span className="text-xs font-semibold text-neutral-200">
                              {action.purpose}
                            </span>
                          </div>

                          {/* Risk & Approval Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Risk Classification */}
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                                action.risk_classification === 'destructive'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold'
                                  : action.risk_classification === 'high'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : action.risk_classification === 'medium'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              Risk: {action.risk_classification}
                            </span>

                            {/* Human Approval Required Badge */}
                            {action.requires_approval ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/80 flex items-center gap-1 font-semibold">
                                <Lock className="h-3 w-3" />
                                Requires Human Approval
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700/50 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                                Auto-Authorized
                              </span>
                            )}

                            {/* Step Status Badge */}
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                                isCompleted
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : isExecuting
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                                  : isFailed
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {action.status}
                            </span>
                          </div>
                        </div>

                        {/* Command and Tool */}
                        <div className="mt-3 bg-neutral-950 rounded p-2.5 font-mono text-xs text-neutral-300 border border-neutral-800/60 flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-x-auto">
                            <Terminal className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                            <span className="text-emerald-400">$</span>
                            <span className="text-neutral-200">{action.command}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 shrink-0 ml-2">
                            Tool: {action.tool_id}
                          </span>
                        </div>

                        {/* Expected vs Actual Result */}
                        <div className="mt-2 text-xs space-y-1">
                          <div className="text-neutral-400 font-mono text-[11px]">
                            Expected: <span className="text-neutral-300">{action.expected_result}</span>
                          </div>
                          {action.result && (
                            <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                              Output: {action.result}
                            </div>
                          )}
                          {action.error && (
                            <div className="p-2 rounded bg-rose-950/30 border border-rose-900/60 text-[11px] font-mono text-rose-300 whitespace-pre-wrap">
                              Error: {action.error}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-12 text-center text-neutral-400">
                <ListTodo className="h-10 w-10 mx-auto text-neutral-600 mb-3" />
                <h3 className="text-sm font-semibold text-neutral-200">No Task Selected</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                  Choose a task from the list on the left or create a new goal to see the generated planner execution tree.
                </p>
                <button
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="mt-4 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Define New Task Goal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AGENT FLEET OVERVIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">
                Registered Agent Workers ({workers.length})
              </h2>
              <p className="text-xs text-neutral-400">
                Live lifecycle states, heartbeat checks, and permissions bounds.
              </p>
            </div>
            <button
              onClick={() => setIsNewAgentModalOpen(true)}
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Register Droid Agent
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => {
              const worker = workers.find(w => w.agent_id === agent.id);
              const isHealthy = worker?.health === 'healthy';
              const isTerminated = worker?.state === 'TERMINATED';

              return (
                <div
                  key={agent.id}
                  className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    isTerminated
                      ? 'border-rose-900/60 bg-rose-950/20'
                      : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Agent Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-neutral-100">{agent.name}</h3>
                          <span className="text-[10px] font-mono text-neutral-500">{agent.id}</span>
                        </div>
                      </div>

                      {/* Health Indicator */}
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isHealthy
                              ? 'bg-emerald-400 animate-pulse'
                              : worker?.health === 'unresponsive'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-neutral-400">{worker?.health || 'unregistered'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {agent.description || 'Dedicated autonomous workspace worker.'}
                    </p>

                    {/* Worker State & Heartbeat */}
                    <div className="rounded-lg bg-neutral-950 p-2.5 border border-neutral-800/80 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-neutral-400">
                        <span>Lifecycle State:</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                            worker?.state === 'READY'
                              ? 'bg-emerald-950 text-emerald-300'
                              : worker?.state === 'EXECUTING'
                              ? 'bg-cyan-950 text-cyan-300 animate-pulse'
                              : worker?.state === 'WAITING_APPROVAL'
                              ? 'bg-amber-950 text-amber-300'
                              : worker?.state === 'TERMINATED'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {worker?.state || 'OFFLINE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                        <span>Heartbeat:</span>
                        <span className="text-neutral-300">
                          {worker?.heartbeat_at
                            ? new Date(worker.heartbeat_at).toLocaleTimeString()
                            : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Permissions Summary */}
                    <div className="space-y-1 text-xs font-mono">
                      <div className="text-[10px] text-neutral-500 uppercase">Allowed Tools:</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.permissions.allowed_tools.map(t => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300"
                          >
                            {t.replace('tool_', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Worker Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handlePingHeartbeat(agent.id)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1 transition-colors"
                      title="Send ping to keep worker alive"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Ping
                    </button>

                    <button
                      onClick={() => {
                        setNewTaskAgentId(agent.id);
                        setIsNewTaskModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Assign Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HUMAN APPROVAL QUEUE                                               */}
      {/* ========================================================================= */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                Human Authorization Queue
                {pendingApprovals.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-xs">
                    {pendingApprovals.length} Action{pendingApprovals.length > 1 ? 's' : ''} Pending
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Destructive operations are held at the execution boundary until explicitly signed off.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-12 text-center text-neutral-400">
              <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-semibold text-neutral-200">No Pending Approvals</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                All scheduled agent operations comply with auto-authorization rules. Destructive commands will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(approval => {
                const isRejecting = rejectingApprovalId === approval.id;

                return (
                  <div
                    key={approval.id}
                    className="rounded-xl border border-amber-600/50 bg-amber-950/20 p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-mono font-bold uppercase">
                            DESTRUCTIVE OPERATION
                          </span>
                          <span className="text-xs font-mono text-neutral-400">
                            Approval ID: {approval.id}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-100">
                          Hold placed on: Execution {approval.execution_id}
                        </h3>
                        <p className="text-xs text-amber-300/90 font-mono">
                          Requested at: {new Date(approval.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Decision Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDecideApproval(approval.id, 'approved')}
                          className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve Execution
                        </button>
                        <button
                          onClick={() => setRejectingApprovalId(isRejecting ? null : approval.id)}
                          className="px-3.5 py-1.5 rounded-md border border-rose-700 bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Rejection Prompt */}
                    {isRejecting && (
                      <div className="p-3 rounded-lg border border-rose-800 bg-rose-950/60 space-y-2 text-xs">
                        <label className="text-rose-200 font-medium block">
                          Provide Rejection Reason (Operator Audit Record):
                        </label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="e.g. Unintended cache wipe during deployment"
                          className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-rose-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setRejectingApprovalId(null)}
                            className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDecideApproval(approval.id, 'rejected', rejectionReason)}
                            className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-medium"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Past Decisions History */}
          <div className="mt-6 pt-4 border-t border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Approval Audit Trail ({approvals.filter(a => a.status !== 'pending').length} Processed)
            </h3>
            <div className="space-y-2">
              {approvals
                .filter(a => a.status !== 'pending')
                .slice(0, 10)
                .map(a => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/50 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="text-neutral-400">Approval {a.id}</span>
                      <span className="mx-2 text-neutral-700">|</span>
                      <span className="text-neutral-300">Decided by: {a.decided_by_user_id || 'operator'}</span>
                      {a.rejection_reason && (
                        <div className="text-[11px] text-rose-400 mt-0.5">
                          Reason: {a.rejection_reason}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        a.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WORKING MEMORY INSPECTOR                                           */}
      {/* ========================================================================= */}
      {activeTab === 'memory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">
                Agent Short-Term Working Memory
              </h2>
              <p className="text-xs text-neutral-400">
                Scoped strictly to: Owner → Project → Workspace → Agent → Task.
              </p>
            </div>
            {selectedTask && (
              <span className="text-xs font-mono text-emerald-400 bg-neutral-900 px-3 py-1 rounded border border-neutral-800">
                Active Task: {selectedTask.id}
              </span>
            )}
          </div>

          {selectedMemory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Context & Goal */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Memory Scope & Goal
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 space-y-1">
                    <div className="text-neutral-500">Current Goal:</div>
                    <div className="text-neutral-200 font-medium">{selectedMemory.current_goal}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-500 block">Agent ID:</span>
                      <span className="text-neutral-300">{selectedMemory.agent_id}</span>
                    </div>
                    <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-500 block">Workspace:</span>
                      <span className="text-neutral-300">{selectedMemory.workspace_id}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px]">
                    <span className="text-neutral-500 block">Updated:</span>
                    <span className="text-neutral-300">{new Date(selectedMemory.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Observations & Learnings */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Observations Log ({selectedMemory.observations.length})
                </h3>
                {selectedMemory.observations.length === 0 ? (
                  <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                    No observations recorded yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedMemory.observations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-neutral-950 border border-neutral-800 text-xs font-mono text-emerald-300/90 flex items-start gap-2"
                      >
                        <span className="text-neutral-500">[{idx + 1}]</span>
                        <span>{obs}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Actions & Execution Results */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3 md:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Completed Step Results
                </h3>
                {Object.keys(selectedMemory.execution_results).length === 0 ? (
                  <p className="text-xs text-neutral-500 font-mono py-4 text-center">
                    No action results stored yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(selectedMemory.execution_results).map(([actId, res]) => (
                      <div
                        key={actId}
                        className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1 font-mono text-xs"
                      >
                        <div className="text-neutral-400 font-semibold">{actId}</div>
                        <div className="text-neutral-200 bg-neutral-900/80 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {res}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-12 text-center text-neutral-400">
              <Brain className="h-10 w-10 mx-auto text-neutral-600 mb-2" />
              <h3 className="text-sm font-semibold text-neutral-200">No Memory Loaded</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                Select a task in the Task Planner tab to view its isolated working memory layer.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REAL-TIME ACTIVITY FEED                                            */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">
                Runtime Event Stream
              </h2>
              <p className="text-xs text-neutral-400">
                Live audit trace of planner actions, approval decisions, and process exits.
              </p>
            </div>
            <button
              onClick={refreshAll}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Stream
            </button>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 font-mono">
                No runtime events recorded yet.
              </div>
            ) : (
              events.map(ev => {
                const isKill = ev.event_type === 'kill_switch_triggered';
                const isApproval = ev.event_type.startsWith('approval');
                const isFailed = ev.event_type.includes('failed');

                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
                      isKill
                        ? 'border-rose-800 bg-rose-950/40 text-rose-200'
                        : isFailed
                        ? 'border-rose-900/60 bg-rose-950/20 text-rose-300'
                        : isApproval
                        ? 'border-amber-800/80 bg-amber-950/20 text-amber-300'
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold uppercase tracking-wider text-neutral-200">
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-neutral-500">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-400">
                      ID: {ev.id} {ev.agent_id ? `• Agent: ${ev.agent_id}` : ''}{' '}
                      {ev.task_id ? `• Task: ${ev.task_id}` : ''}
                    </div>

                    {/* Payload Details */}
                    {Object.keys(ev.payload || {}).length > 0 && (
                      <div className="mt-1.5 p-2 rounded bg-neutral-900/90 border border-neutral-800 text-[10px] text-neutral-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {JSON.stringify(ev.payload, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW TASK DEFINITION                                                */}
      {/* ========================================================================= */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-emerald-400" />
                Define Task Goal
              </h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Assign Agent Droid:
                </label>
                <select
                  value={newTaskAgentId}
                  onChange={e => setNewTaskAgentId(e.target.value)}
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Target Workspace:
                </label>
                <select
                  value={newTaskWorkspaceId}
                  onChange={e => setNewTaskWorkspaceId(e.target.value)}
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Priority:
                </label>
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as any)}
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Goal Description:
                </label>
                <textarea
                  value={newTaskGoal}
                  onChange={e => setNewTaskGoal(e.target.value)}
                  rows={3}
                  placeholder="e.g. Audit workspace dependencies and run test suites"
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  Synthesize Plan & Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW AGENT DROID                                           */}
      {/* ========================================================================= */}
      {isNewAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                Register New Agent Droid
              </h3>
              <button
                onClick={() => setIsNewAgentModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Droid Name:
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  placeholder="e.g. AI Heaven Droid Beta"
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Description:
                </label>
                <input
                  type="text"
                  value={newAgentDesc}
                  onChange={e => setNewAgentDesc(e.target.value)}
                  placeholder="e.g. Autonomous refactoring & testing worker"
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Assign Project:
                </label>
                <select
                  value={newAgentProjectId}
                  onChange={e => setNewAgentProjectId(e.target.value)}
                  className="w-full rounded bg-neutral-950 border border-neutral-700 p-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tool Permissions Toggles */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <label className="text-neutral-300 font-medium block">
                  Tool Permissions:
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  {tools.map(tool => {
                    const isChecked = newAgentTools.includes(tool.id);
                    return (
                      <label
                        key={tool.id}
                        className="flex items-center gap-2 p-2 rounded bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700"
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
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span className="text-neutral-300">{tool.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Destructive Approval Enforcement */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAgentRequiresApproval}
                    onChange={e => setNewAgentRequiresApproval(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span className="text-neutral-300 font-medium">
                    Require explicit human sign-off for destructive operations (rm, drop, delete)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewAgentModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  Register Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EMERGENCY KILL SWITCH TRIGGER                                      */}
      {/* ========================================================================= */}
      {isKillSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl border-2 border-rose-600 bg-neutral-900 p-6 space-y-4 shadow-2xl shadow-rose-950/80">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-900/60">
              <div className="p-2 rounded bg-rose-600 text-white">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-100 uppercase tracking-wide">
                  Emergency Kill Switch
                </h3>
                <p className="text-xs text-rose-300">
                  Instantaneous halt of all running agent workers and queued tasks.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-rose-200 font-medium block mb-1">
                  Kill Switch Scope:
                </label>
                <select
                  value={killScope}
                  onChange={e => setKillScope(e.target.value as any)}
                  className="w-full rounded bg-neutral-950 border border-rose-800 p-2 text-xs text-rose-100 focus:outline-none focus:border-rose-500"
                >
                  <option value="global">Global (All Platform Agents & Workspaces)</option>
                  <option value="project">Project Scope</option>
                  <option value="agent">Single Agent Scope</option>
                </select>
              </div>

              <div>
                <label className="text-rose-200 font-medium block mb-1">
                  Reason for Emergency Stop (Logged in Audit):
                </label>
                <input
                  type="text"
                  value={killReason}
                  onChange={e => setKillReason(e.target.value)}
                  className="w-full rounded bg-neutral-950 border border-rose-800 p-2 text-xs text-rose-100 focus:outline-none focus:border-rose-500 font-mono"
                  required
                />
              </div>

              <div className="p-3 rounded bg-rose-950/40 border border-rose-800/80 text-[11px] text-rose-300 leading-relaxed font-mono">
                Warning: Triggering this command will forcefully terminate worker processes, cancel active tasks, and require manual operator reset to disarm.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rose-900/60">
                <button
                  type="button"
                  onClick={() => setIsKillSwitchModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerKillSwitch}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-lg shadow-rose-900/50"
                >
                  CONFIRM EMERGENCY HALT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
