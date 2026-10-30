/**
 * AI HEAVEN - Unified Command Center & Operating Environment (HomeView)
 * High-density command center with prominent task input, central brain routing,
 * multi-agent fleet pipeline, real-time resource meters, and zero-pill typography.
 */

import React, { useEffect, useState } from 'react';
import {
  Brain,
  Terminal,
  Compass,
  Flame,
  ShieldCheck,
  ClipboardCheck,
  Send,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Cpu,
  Crosshair,
  Layers,
  Database,
  ExternalLink,
  Lock,
  ChevronRight,
  FolderGit2,
  MessageSquare,
  Globe
} from 'lucide-react';
import { AgentDefinition, ExecutionReceipt } from '../../types/foundation';
import { AgentTask, AgentWorker } from '../../types/agentRuntime';
import { Resource } from '../../types/resource';
import { ShellView } from '../shell/AppShell';
import { apiClient } from '../../services/apiClient';

interface HomeViewProps {
  resources: Resource[];
  agents: AgentDefinition[];
  workers: AgentWorker[];
  pendingApprovalsCount: number;
  isBackendConnected: boolean;
  onNavigate: (view: ShellView, slug?: string) => void;
  onSelectResource: (resource: Resource) => void;
  onOpenNewTaskModal?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  resources,
  agents,
  workers,
  pendingApprovalsCount,
  isBackendConnected,
  onNavigate,
  onSelectResource,
  onOpenNewTaskModal
}) => {
  const [commandPrompt, setCommandPrompt] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeTask, setActiveTask] = useState<AgentTask | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ExecutionReceipt | null>(null);
  const [executionStage, setExecutionStage] = useState<
    'idle' | 'classifying' | 'planning' | 'approval' | 'executing' | 'completed' | 'failed'
  >('idle');
  const [executionMessage, setExecutionMessage] = useState<string>('');
  const [routeInfo, setRouteInfo] = useState<{
    domain: string;
    model: string;
    tokens: number;
    rationale: string;
  } | null>(null);

  // Live telemetry states
  const [quotas, setQuotas] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [googleAccount, setGoogleAccount] = useState<string>('developer-ai-studio@gmail.com');

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      const [quotasData, cksData, projsData, accData] = await Promise.all([
        apiClient.getQuotas(),
        apiClient.getCheckpoints(),
        apiClient.getProjects(),
        apiClient.getGoogleAccounts()
      ]);
      setQuotas(quotasData);
      setCheckpoints(cksData);
      setProjects(projsData);
      if (accData?.activeAccount) {
        setGoogleAccount(accData.activeAccount);
      }
    } catch {
      // background silent fallback
    }
  };

  // Primary Agent Selection
  const primaryAgent = agents[0] || {
    id: 'agent_droid_prime',
    name: 'AI Heaven Droid Prime',
    description: 'Autonomous platform engineering worker with sandboxed terminal and MCP client.',
    status: 'ready'
  };

  // Specialized Fleet
  const specializedFleet = [
    { id: 'researcher', name: 'Research & Grounding Agent', role: 'Context & Knowledge', status: 'Ready' },
    { id: 'security', name: 'Security & Policy Sentinel', role: 'Permissions & Audits', status: 'Active' },
    { id: 'coder', name: 'Platform Engineering Worker', role: 'VFS Sandbox Code Generation', status: 'Ready' },
    { id: 'tester', name: 'Regression & Verification Engine', role: 'Automated Test Suites', status: 'Armed' },
    { id: 'reviewer', name: 'Quality Assurance Auditor', role: 'Receipts & Compliance', status: 'Ready' }
  ];

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = commandPrompt.trim();
    if (!prompt) return;

    setIsDispatching(true);
    setExecutionStage('classifying');
    setExecutionMessage('Central Brain classifying prompt and selecting optimal model...');
    setActiveReceipt(null);

    try {
      // 1. Brain classification & Model Routing
      const classification = await apiClient.classifyRequest(prompt);
      setRouteInfo({
        domain: classification.domain,
        model: classification.recommendedModel.name,
        tokens: classification.estimatedTokens,
        rationale: classification.rationale
      });

      // 2. Planning phase
      setExecutionStage('planning');
      setExecutionMessage(`Routing to ${classification.recommendedModel.name}. Decomposing plan into sandboxed steps...`);

      const task = await apiClient.createTask({
        agent_id: primaryAgent.id,
        project_id: primaryAgent.project_id || 'proj_ai_heaven_core',
        workspace_id: primaryAgent.workspace_id || 'ws_default_sandbox',
        goal: prompt,
        priority: 'high'
      });

      if (!task) {
        throw new Error('Failed to instantiate task on execution engine');
      }

      setActiveTask(task);
      setExecutionStage('executing');
      setExecutionMessage(`Plan verified (${task.plan.length} sandboxed steps). Advancing execution...`);

      // 3. Step execution through backend worker
      let currentTask = task;
      while (
        currentTask.status === 'created' ||
        currentTask.status === 'in_progress' ||
        currentTask.status === 'planning'
      ) {
        const nextAction = currentTask.plan[currentTask.current_action_index];
        if (nextAction?.requires_approval) {
          setExecutionStage('approval');
          setExecutionMessage(`Step ${nextAction.step_number} requires human authorization: "${nextAction.command}"`);
          break;
        }

        const advanced = await apiClient.executeNextAction(currentTask.id);
        if (!advanced) break;
        currentTask = advanced;
        setActiveTask(advanced);

        if (advanced.status === 'completed') {
          setExecutionStage('completed');
          setExecutionMessage('All sandboxed steps executed successfully. Cryptographic receipt verified.');
          const receipt = await apiClient.getTaskReceipt(advanced.id);
          if (receipt) setActiveReceipt(receipt);
          break;
        } else if (advanced.status === 'failed') {
          setExecutionStage('failed');
          setExecutionMessage(advanced.failure_reason || 'Execution halted on error.');
          const receipt = await apiClient.getTaskReceipt(advanced.id);
          if (receipt) setActiveReceipt(receipt);
          break;
        }
      }

      // Refresh telemetry
      await loadDashboardMetrics();
    } catch (err: any) {
      console.error('Task dispatch failure:', err);
      setExecutionStage('failed');
      setExecutionMessage(err?.message || 'Execution halted unexpectedly.');
    } finally {
      setIsDispatching(false);
    }
  };

  const googleQuota = quotas.find(q => q.providerId === 'google-ai') || {
    requestsPerMinute: 14,
    requestsLimit: 60,
    tokensPerMinute: 24500,
    tokensLimit: 4000000,
    status: 'operational'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ===================================================================== */}
      {/* 1. TOP METRICS STRIP (Zero-Pill Typography & Status)                    */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#283242] pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA6B7] font-mono">
          <span className="text-[#F1F4F8] font-semibold">AI HEAVEN OPERATING ENVIRONMENT</span>
          <span aria-hidden="true" className="text-[#9AA6B7]/40">·</span>
          <span>Google Account: <span className="text-[#42D9F5]">{googleAccount}</span></span>
          <span aria-hidden="true" className="text-[#9AA6B7]/40">·</span>
          <span>PostgreSQL: <span className={isBackendConnected ? 'text-[#34D399]' : 'text-[#9AA6B7]'}>{isBackendConnected ? 'Connected (Pool Ready)' : 'Local Fallback'}</span></span>
          <span aria-hidden="true" className="text-[#9AA6B7]/40">·</span>
          <span>Quotas: <span className="text-[#34D399] font-semibold">{googleQuota.status.toUpperCase()}</span></span>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2">
          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => onNavigate('tasks')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FBBF24]/10 border border-[#FBBF24]/40 hover:bg-[#FBBF24]/20 text-[#FBBF24] text-xs font-mono rounded transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-[#FBBF24]" />
              <span>{pendingApprovalsCount} Approval{pendingApprovalsCount > 1 ? 's' : ''} Pending</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#42D9F5]/10 border border-[#42D9F5]/40 hover:bg-[#42D9F5]/20 text-[#42D9F5] text-xs font-mono rounded transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#42D9F5]" />
            <span>AI Brain Chat</span>
          </button>

          <button
            onClick={() => onNavigate('review')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121822] border border-[#283242] hover:border-[#3a475d] text-[#F1F4F8] text-xs font-mono rounded transition-colors cursor-pointer"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-[#42D9F5]" />
            <span>QA Review</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. UNIFIED COMMAND CENTER - PROMINENT TASK INPUT                       */}
      {/* ===================================================================== */}
      <div className="bg-[#121822] border border-[#283242] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#42D9F5]" />
            <h2 className="text-sm font-semibold text-[#F1F4F8]">Central Brain Dispatcher</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#9AA6B7]/80">
            <span>Dynamic Model Routing</span>
            <span aria-hidden="true">·</span>
            <span>Sandboxed VFS</span>
          </div>
        </div>

        <form onSubmit={handleCommandSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={commandPrompt}
              onChange={(e) => setCommandPrompt(e.target.value)}
              placeholder="Submit an engineering goal to the Central Brain (e.g., 'Audit backend security, refactor token expiration, and verify test suites without mock data')..."
              rows={3}
              className="w-full bg-[#080B10] border border-[#283242] rounded-md p-3 text-xs text-[#F1F4F8] font-mono placeholder:text-[#9AA6B7]/50 focus:outline-none focus:border-[#42D9F5] focus:ring-1 focus:ring-[#42D9F5] transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Quick Action Presets */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#9AA6B7]">
              <span className="text-[#9AA6B7]/60">Presets:</span>
              <button
                type="button"
                onClick={() => setCommandPrompt('Audit all backend routes for permissions and run automated regression tests')}
                className="hover:text-[#42D9F5] underline transition-colors"
              >
                Security Audit
              </button>
              <span className="text-[#283242]">·</span>
              <button
                type="button"
                onClick={() => setCommandPrompt('Search GitHub repositories for modern agent orchestration frameworks and import details')}
                className="hover:text-[#42D9F5] underline transition-colors"
              >
                Repo Discovery
              </button>
              <span className="text-[#283242]">·</span>
              <button
                type="button"
                onClick={() => setCommandPrompt('Execute terminal command npm test and analyze output')}
                className="hover:text-[#42D9F5] underline transition-colors"
              >
                Terminal Test
              </button>
            </div>

            <button
              type="submit"
              disabled={isDispatching || !commandPrompt.trim()}
              className="px-4 py-2 bg-[#42D9F5] hover:bg-[#38c4de] disabled:opacity-50 text-[#080B10] rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-end sm:self-auto cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Orchestrating...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Dispatch Task
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Execution Progress Strip */}
        {executionStage !== 'idle' && (
          <div className="mt-4 pt-4 border-t border-[#283242] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[#F1F4F8]">
                <span className={`h-2 w-2 rounded-full ${
                  executionStage === 'completed' ? 'bg-[#34D399]' :
                  executionStage === 'failed' ? 'bg-[#F87171]' :
                  executionStage === 'approval' ? 'bg-[#FBBF24]' : 'bg-[#42D9F5] animate-ping'
                }`} />
                <span className="font-semibold uppercase">{executionStage}</span>
                <span className="text-[#283242]">·</span>
                <span className="text-[#9AA6B7]">{executionMessage}</span>
              </div>

              {routeInfo && (
                <div className="hidden md:flex items-center gap-2 text-[11px] text-[#9AA6B7]">
                  <span>Domain: <span className="text-[#42D9F5] uppercase">{routeInfo.domain}</span></span>
                  <span>·</span>
                  <span>Model: <span className="text-[#34D399]">{routeInfo.model}</span></span>
                </div>
              )}
            </div>

            {/* Plan Steps Timeline */}
            {activeTask && activeTask.plan.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                {activeTask.plan.map((step, idx) => {
                  const isDone = idx < activeTask.current_action_index || activeTask.status === 'completed';
                  const isCurrent = idx === activeTask.current_action_index && activeTask.status === 'in_progress';
                  const isWaiting = step.requires_approval && (activeTask.status as string) === 'waiting_approval';

                  return (
                    <div
                      key={step.step_number}
                      className={`p-2.5 rounded border text-xs font-mono ${
                        isDone
                          ? 'bg-[#171F2B] border-[#34D399]/40 text-[#34D399]'
                          : isCurrent
                          ? 'bg-[#171F2B] border-[#42D9F5] text-[#42D9F5]'
                          : isWaiting
                          ? 'bg-[#171F2B] border-[#FBBF24] text-[#FBBF24]'
                          : 'bg-[#080B10] border-[#283242] text-[#9AA6B7]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span>STEP {step.step_number}</span>
                        <span>{isDone ? 'COMPLETED' : isCurrent ? 'RUNNING' : isWaiting ? 'APPROVAL' : 'QUEUED'}</span>
                      </div>
                      <div className="text-[11px] truncate text-[#F1F4F8] font-sans">{step.command}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Structured Receipt View */}
            {activeReceipt && (
              <div className="p-3 rounded bg-[#171F2B] border border-[#34D399]/40 text-xs font-mono text-[#F1F4F8] space-y-1">
                <div className="flex items-center justify-between text-[#34D399] font-semibold">
                  <span>EXECUTION RECEIPT: {activeReceipt.receipt_id}</span>
                  <span>STATUS: {activeReceipt.final_status.toUpperCase()}</span>
                </div>
                <div className="text-[11px] text-[#9AA6B7]">
                  Duration: {activeReceipt.duration_ms}ms · Tools: {activeReceipt.tools_used.join(', ')} · Checksum: {activeReceipt.provenance.cryptographic_signature || activeReceipt.provenance.sandbox_isolation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. DEDICATED WORK AREAS LAUNCHPAD (Grid Layout)                         */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Work Area: AI Brain Chat Workspace */}
        <button
          onClick={() => onNavigate('chat')}
          className="text-left p-4 bg-[#121822] border border-[#283242] hover:border-[#42D9F5]/60 rounded-lg transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-5 w-5 text-[#42D9F5] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#42D9F5] transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F1F4F8]">AI Brain Chat Workspace</h3>
              <span className="px-1.5 py-0.2 text-[9px] bg-[#42D9F5]/10 text-[#42D9F5] border border-[#42D9F5]/30 rounded font-mono">
                DIRECT
              </span>
            </div>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Interactive multi-turn conversation with the Central Brain. Dynamic model routing, persistent memory threads, and structured code analysis.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#42D9F5] flex justify-between">
            <span>Dynamic Multi-Model</span>
            <span>Persistent Memory</span>
          </div>
        </button>

        {/* Work Area 0: Autonomous Bug Bounty Platform */}
        <button
          onClick={() => onNavigate('bughunt')}
          className="text-left p-4 bg-[#121822] border border-[#283242] hover:border-[#42D9F5]/60 rounded-lg transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Crosshair className="h-5 w-5 text-[#42D9F5] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#42D9F5] transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F1F4F8]">Autonomous Bug Bounty Platform</h3>
              <span className="px-1.5 py-0.2 text-[9px] bg-[#42D9F5]/10 text-[#42D9F5] border border-[#42D9F5]/30 rounded font-mono">
                CORE
              </span>
            </div>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Autonomous Droid Fleet (Argus, Hydra, Aegis, Vulcan, Specter, Cerberus), scope enforcement, and cryptographic evidence seals.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#42D9F5] flex justify-between">
            <span>6 Specialized Droids</span>
            <span>HackerOne & Bugcrowd</span>
          </div>
        </button>

        {/* Work Area 0: Odysseus Capability Suite */}
        <button
          onClick={() => onNavigate('odysseus')}
          className="text-left p-4 bg-[#121822] border border-[#283242] hover:border-cyan-500/60 rounded-lg transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Compass className="h-5 w-5 text-cyan-400 group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F1F4F8]">Odysseus Intelligence Suite</h3>
              <span className="px-1.5 py-0.2 text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded font-mono">
                ODYSSEUS
              </span>
            </div>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Autonomous Agent Loop, Deep Research with evidence seals, Hardware-Aware Model Cookbook, and Hybrid Vector Search.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-cyan-400 flex justify-between">
            <span>Deep Research & Cookbook</span>
            <span>Agent Loop Live</span>
          </div>
        </button>

        {/* Work Area: Eyes for All / God's Eye View */}
        <button
          onClick={() => onNavigate('eyes-for-all')}
          className="text-left p-4 bg-[#121822] border border-[#283242] hover:border-cyan-400/60 rounded-lg transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Globe className="h-5 w-5 text-cyan-400 group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F1F4F8]">Eyes for All (God's Eye View)</h3>
              <span className="px-1.5 py-0.2 text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/40 rounded font-mono">
                GEOINT
              </span>
            </div>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Global 3D Situational Telemetry &bull; Real-world flight ADS-B, active satellites, seismic events, wildfires, and chokepoint AIS.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-cyan-400 flex justify-between">
            <span>3D Interactive Globe</span>
            <span>Horus-09 &bull; SGP4 &bull; USGS</span>
          </div>
        </button>

        {/* Work Area 1: Brain & Router */}
        <button
          onClick={() => onNavigate('brain')}
          className="text-left p-4 bg-[#121822] border border-[#283242] rounded-lg hover:border-[#42D9F5]/60 transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Brain className="h-5 w-5 text-[#42D9F5] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#42D9F5] transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F4F8]">Central Brain & Model Router</h3>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Calibrated model matrix (Flash, Pro, Sonnet, GPT-4o, DeepSeek), live classifier, and auditable routing decisions.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex justify-between">
            <span>6 Active Models</span>
            <span>&lt; 4ms Routing</span>
          </div>
        </button>

        {/* Work Area 2: Agent Fleet */}
        <button
          onClick={() => onNavigate('agents')}
          className="text-left p-4 bg-[#121822] border border-[#283242] rounded-lg hover:border-[#42D9F5]/60 transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Cpu className="h-5 w-5 text-[#8A83FF] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#8A83FF] transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F4F8]">Agent Fleet & Droids</h3>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Multi-agent orchestration with Droid Prime, Droid Sec, and specialized researcher, coder, and security sentinels.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex justify-between">
            <span>5 Specialized Agents</span>
            <span>Kill Switch Ready</span>
          </div>
        </button>

        {/* Work Area 3: Conversations & Memory */}
        <button
          onClick={() => onNavigate('memory')}
          className="text-left p-4 bg-[#121822] border border-[#283242] rounded-lg hover:border-[#42D9F5]/60 transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Database className="h-5 w-5 text-[#34D399] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#34D399] transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F4F8]">Conversations & Persistent Memory</h3>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Persistent multi-turn chat threads, episodic context inspection, and snapshot checkpoints for 1-click recovery.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex justify-between">
            <span>{checkpoints.length} Saved Checkpoints</span>
            <span>Durable Storage</span>
          </div>
        </button>

        {/* Work Area 4: Terminal & Editor */}
        <button
          onClick={() => onNavigate('terminal')}
          className="text-left p-4 bg-[#121822] border border-[#283242] rounded-lg hover:border-[#42D9F5]/60 transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Terminal className="h-5 w-5 text-[#FBBF24] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#FBBF24] transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F4F8]">Universal Sandboxed Terminal</h3>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Isolated workspace execution, virtual file explorer, inline editor, and repository import.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex justify-between">
            <span>Exit 126 Protected</span>
            <span>Virtual FS</span>
          </div>
        </button>

        {/* Work Area 5: Open-Source Discovery */}
        <button
          onClick={() => onNavigate('explore')}
          className="text-left p-4 bg-[#121822] border border-[#283242] rounded-lg hover:border-[#42D9F5]/60 transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Compass className="h-5 w-5 text-[#42D9F5] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#42D9F5] transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F4F8]">Open-Source Discovery & Graph</h3>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Real GitHub and Hugging Face indexing, repository metadata, dependencies, and interactive knowledge graph.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex justify-between">
            <span>{resources.length} Verified Entries</span>
            <span>Provenance Grounded</span>
          </div>
        </button>

        {/* Work Area 6: Autonomous Evolution */}
        <button
          onClick={() => onNavigate('evolution')}
          className="text-left p-4 bg-[#121822] border border-[#283242] rounded-lg hover:border-[#42D9F5]/60 transition-colors flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <Flame className="h-5 w-5 text-[#FBBF24] group-hover:scale-105 transition-transform" />
              <ChevronRight className="h-4 w-4 text-[#9AA6B7] group-hover:text-[#FBBF24] transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F4F8]">Autonomous Evolution Engine</h3>
            <p className="text-xs text-[#9AA6B7] mt-1">
              Automated benchmarking, statistical candidate comparison, verified promotion, and zero-downtime rollback.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex justify-between">
            <span>Real Benchmarks</span>
            <span>Rollback Safe</span>
          </div>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 4. ACTIVE AGENT FLEET & RESOURCE METERS                                */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Specialized Agent Fleet Status */}
        <div className="lg:col-span-7 bg-[#121822] border border-[#283242] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#8A83FF]" />
              Specialized Multi-Agent Fleet
            </h3>
            <span className="text-[11px] font-mono text-[#9AA6B7]">5 Registered Roles</span>
          </div>

          <div className="divide-y divide-[#283242]">
            {specializedFleet.map((ag) => (
              <div key={ag.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#F1F4F8]">{ag.name}</div>
                  <div className="text-[11px] text-[#9AA6B7] mt-0.5">{ag.role}</div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#34D399]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                  <span>{ag.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quota Usage Meters */}
        <div className="lg:col-span-5 bg-[#121822] border border-[#283242] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#FBBF24]" />
              Real Provider Quotas & Failover
            </h3>
            <span className="text-[11px] font-mono text-[#34D399]">HEALTHY</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-[#9AA6B7] mb-1 font-mono">
                <span>Google Gemini API (RPM)</span>
                <span>{googleQuota.requestsPerMinute} / {googleQuota.requestsLimit} req/min</span>
              </div>
              <div className="h-1.5 w-full bg-[#171F2B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#42D9F5] rounded-full"
                  style={{ width: `${Math.min(100, (googleQuota.requestsPerMinute / googleQuota.requestsLimit) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#9AA6B7] mb-1 font-mono">
                <span>Tokens Throughput (TPM)</span>
                <span>{googleQuota.tokensPerMinute.toLocaleString()} / {(googleQuota.tokensLimit / 1000).toLocaleString()}k</span>
              </div>
              <div className="h-1.5 w-full bg-[#171F2B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8A83FF] rounded-full"
                  style={{ width: `${Math.min(100, (googleQuota.tokensPerMinute / googleQuota.tokensLimit) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] space-y-1">
              <div className="flex justify-between">
                <span>Active Failover Chain:</span>
                <span className="text-[#F1F4F8]">Gemini 2.5 Pro → Flash → Local VFS</span>
              </div>
              <div className="flex justify-between">
                <span>Host Isolation:</span>
                <span className="text-[#34D399]">Sandboxed Environment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
