import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Globe,
  HardDrive,
  Layers,
  ListTodo,
  Network,
  Play,
  Plus,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Workflow,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AgentDefinition } from '../../types/foundation';
import { AgentWorker } from '../../types/agentRuntime';
import { Resource } from '../../types/resource';
import { ShellView } from '../shell/AppShell';

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
  const verifiedCount = resources.filter(r => r.verification_status === 'verified').length;
  const modelsCount = resources.filter(r => r.resource_type === 'model').length;
  const primaryAgent = agents[0] || {
    id: 'agent_droid_prime',
    name: 'AI Heaven Droid Prime',
    description: 'Autonomous platform engineering worker with sandboxed terminal and MCP client.',
    status: 'ready'
  };
  const primaryWorker = workers.find(w => w.agent_id === primaryAgent.id) || workers[0];

  const [commandPrompt, setCommandPrompt] = useState('');

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandPrompt.trim()) return;
    // Dispatch into agent tasks view
    onNavigate('agents');
  };

  // Top spotlight resources
  const spotlightResources = resources.slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-150">
      {/* ===================================================================== */}
      {/* 1. AUTONOMOUS DROID COMMAND CENTER HERO                               */}
      {/* ===================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#0B0F1B] via-[#080B14] to-[#06080F] p-6 sm:p-8 shadow-2xl">
        {/* Subtle radial background glow */}
        <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 translate-y-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold uppercase tracking-wider">COMMAND CENTER · ACTIVE AUTONOMOUS RUNTIME</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-mono">
              AI HEAVEN COMMAND OS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Unified operating environment for persistent autonomous AI droids, interconnected foundation models, and sandboxed execution boundaries.
            </p>
          </div>

          {/* Droid Primary Status Card */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
            <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-950/60 border border-emerald-500/40 shrink-0">
              <Bot className="h-6 w-6 text-emerald-400" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 font-mono">{primaryAgent.name}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-semibold uppercase">
                  {primaryWorker?.state || 'READY'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <span>Heartbeat: {primaryWorker?.heartbeat_at ? 'Active' : 'Live'}</span>
                <span>·</span>
                <span>Isolation: Strict Sandbox</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Play className="h-3 w-3" />}
              onClick={() => onNavigate('agents')}
              className="mt-2 sm:mt-0 sm:ml-2"
            >
              Control Droid
            </Button>
          </div>
        </div>

        {/* Quick Command Dispatch Bar */}
        <div className="relative z-10 pt-6">
          <form onSubmit={handleCommandSubmit} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={commandPrompt}
                onChange={e => setCommandPrompt(e.target.value)}
                placeholder="Instruct Droid: 'Run multimodal evaluation on Gemini 1.5 Pro', 'Inspect MCP tools'..."
                className="w-full rounded-lg border border-slate-700/80 bg-slate-950/90 py-2.5 pl-10 pr-4 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={<Send className="h-3.5 w-3.5" />}
              className="w-full sm:w-auto shrink-0 shadow-lg"
            >
              Dispatch Command
            </Button>
          </form>

          {/* Quick Command Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-mono text-slate-400">
            <span className="text-slate-500">Quick Actions:</span>
            <button
              onClick={() => {
                setCommandPrompt('Verify Gemini API tool call schema for MCP bridge');
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-slate-200 transition-colors"
            >
              Verify Tool Call Schema
            </button>
            <button
              onClick={() => {
                setCommandPrompt('Analyze context window capacity across frontier models');
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-slate-200 transition-colors"
            >
              Model Context Benchmark
            </button>
            <button
              onClick={() => onNavigate('graph')}
              className="px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/40 transition-colors"
            >
              Explore Knowledge Topology →
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/60 font-mono">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Ecosystem Registry</span>
            <div className="text-xl font-bold text-slate-100 tabular-nums">
              {resources.length}{' '}
              <span className="text-xs text-slate-500 font-normal">entities</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Server-Verified</span>
            <div className="text-xl font-bold text-emerald-400 tabular-nums">
              {verifiedCount}{' '}
              <span className="text-xs text-slate-500 font-normal">audited</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Autonomous Droids</span>
            <div className="text-xl font-bold text-blue-400 tabular-nums">
              {agents.length}{' '}
              <span className="text-xs text-slate-500 font-normal">online</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div
              className={`text-xl font-bold tabular-nums ${
                pendingApprovalsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'
              }`}
            >
              {pendingApprovalsCount}{' '}
              <span className="text-xs text-slate-500 font-normal">queue</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. PENDING APPROVALS QUEUE BANNER                                     */}
      {/* ===================================================================== */}
      {pendingApprovalsCount > 0 && (
        <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200">
                {pendingApprovalsCount} High-Risk Sandbox Operation{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Human Authorization
              </div>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Destructive file changes and external network writes are paused at the security execution boundary.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('tasks')}
            className="border-amber-600/60 bg-amber-950/60 text-amber-200 hover:bg-amber-900 shrink-0"
          >
            Review Approval Queue
          </Button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. KNOWLEDGE TOPOLOGY PREVIEW & SUBSYSTEM WORKSPACES                  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Topology Radar Card (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
                  Living Knowledge Graph Network
                </h3>
              </div>
              <Button
                variant="secondary"
                size="xs"
                icon={<ArrowRight className="h-3 w-3" />}
                iconPosition="right"
                onClick={() => onNavigate('graph')}
              >
                Open Full Graph
              </Button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time interconnected ontology of verified foundation models, developer SDKs, MCP servers, and autonomous droid tool boundaries.
            </p>

            {/* Quick Interactive Mini Nodes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 font-mono text-xs">
              {[
                { name: 'Google AI Studio', type: 'Platform', slug: 'google-ai-studio', color: '#10b981' },
                { name: 'Gemini 1.5 Pro', type: 'Model (2M)', slug: 'gemini-1-5-pro', color: '#a855f7' },
                { name: 'Gemini API', type: 'API Gateway', slug: 'gemini-api', color: '#06b6d4' },
                { name: 'Claude 3.5 Sonnet', type: 'Model', slug: 'claude-3-5-sonnet', color: '#a855f7' },
                { name: 'Model Context Protocol', type: 'Protocol', slug: 'model-context-protocol', color: '#f59e0b' },
                { name: 'AI Heaven Droid Prime', type: 'Autonomous', slug: 'agent_droid_prime', color: '#22c55e' }
              ].map(node => (
                <div
                  key={node.slug}
                  onClick={() => onNavigate('graph')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                      {node.type}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-200 group-hover:text-blue-300 truncate">
                    {node.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Graph includes real provenance & RFC agent contracts</span>
            <button
              onClick={() => onNavigate('graph')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Explore All Nodes</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Right: Featured Integration Workbench (Google AI Studio) (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
              <span className="text-slate-400 uppercase tracking-wider font-semibold">
                PLATFORM INTEGRATION
              </span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                Google AI Studio & Gemini API
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Native integration with Gemini 1.5 Pro (2M token window), Gemini 2.0 Flash, and the official @google/genai SDK with automated code export and function calling schemas.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/90 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Context Window:</span>
                <span className="text-slate-200 font-bold">2,097,152 tokens</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>SDK Version:</span>
                <span className="text-slate-200">@google/genai ^2.4.0</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>RFC Agent Contract:</span>
                <span className="text-emerald-400 font-bold">Active & Validated</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              iconPosition="right"
              onClick={() => onNavigate('google-ai-studio')}
            >
              Open Studio Workbench
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Network className="h-3.5 w-3.5" />}
              onClick={() => onNavigate('graph')}
            >
              Graph Links
            </Button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. VISUAL RESOURCE REGISTRY HIGHLIGHTS                                */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-mono">
              Authoritative Resource Registry
            </h2>
            <p className="text-xs text-slate-400">
              Verified production platforms, foundation models, SDKs, and open protocols with RFC contracts
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Compass className="h-3.5 w-3.5" />}
            onClick={() => onNavigate('explore')}
          >
            Browse All ({resources.length})
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spotlightResources.map(res => (
            <div
              key={res.slug}
              onClick={() => onSelectResource(res)}
              className="group rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                    {res.resource_type}
                  </span>
                  {res.verification_status === 'verified' && (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {res.trust_score}% Trust
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-100 font-mono group-hover:text-blue-300 transition-colors">
                  {res.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {res.summary || res.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{res.provider_id.replace('prov_', '')}</span>
                <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                  <span>View Specs</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
