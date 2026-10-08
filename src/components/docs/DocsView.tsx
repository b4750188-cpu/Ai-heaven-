import {
  BookOpen,
  Code2,
  ExternalLink,
  FileCode,
  FileJson,
  Layers,
  Lock,
  Network,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const DocsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in-50 duration-150">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span>SYSTEM</span>
          <span className="text-slate-600">/</span>
          <span>DOCUMENTATION & SPECIFICATION</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 font-mono tracking-tight">
          AI Heaven Architectural Specification
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Standardized contracts, sandbox boundary invariants, and verification protocols governing autonomous agent runtimes.
        </p>
      </div>

      {/* Chapter 1: Agent Contract Standard */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 font-mono">
          <FileJson className="h-4 w-4 text-blue-400" />
          <span>01. Machine-Readable Agent Contracts</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every entity in AI Heaven publishes an RFC-compliant agent contract JSON containing invocation schema, authentication protocol, rate limits, deterministic constraints, and tool definitions. Autonomous agents consume these contracts directly to synthesize execution steps.
        </p>
        <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
          <code>
            {`{
  "contract_version": "2026.1",
  "invocation_protocol": "rest_json",
  "endpoint": "/v1beta/models/{model}:generateContent",
  "context_window": 2097152,
  "safety_boundaries": ["strict_sandboxing", "human_approval_on_delete"]
}`}
          </code>
        </div>
      </div>

      {/* Chapter 2: Sandbox Execution Boundaries */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 font-mono">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span>02. Sandbox Execution Boundary & State Machine</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tools execute strictly within isolated workspace containers. Commands advance through an audited state machine:
          <span className="font-mono text-slate-200"> draft → planned → approved → executing → executed</span>.
          Any command matching destructive patterns (<code className="text-rose-300 font-mono">rm</code>, <code className="text-rose-300 font-mono">drop</code>, <code className="text-rose-300 font-mono">delete</code>) halts at <span className="text-amber-300 font-mono">planned</span> until human sign-off is granted.
        </p>
      </div>

      {/* Chapter 3: Working Memory Scoping */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 font-mono">
          <Layers className="h-4 w-4 text-cyan-400" />
          <span>03. Scoped Short-Term Working Memory</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Memory layers are mathematically isolated across <span className="font-mono text-slate-200">Owner → Project → Workspace → Agent → Task</span>. No cross-tenant data leakage is permitted. Observations, tool outputs, and execution results remain ephemeral to the assigned task lifecycle.
        </p>
      </div>
    </div>
  );
};
