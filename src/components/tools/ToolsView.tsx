import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  HardDrive,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Terminal,
  Workflow
} from 'lucide-react';
import React, { useState } from 'react';
import { ToolDefinition } from '../../types/foundation';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ToolsViewProps {
  tools: ToolDefinition[];
  onOpenNewTaskModal?: () => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({ tools, onOpenNewTaskModal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<string>('all');

  const filteredTools = tools.filter(tool => {
    if (selectedCapability !== 'all' && tool.capability !== selectedCapability) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.capability.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span>PLATFORM</span>
            <span className="text-slate-600">/</span>
            <span>TOOL REGISTRY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 font-mono tracking-tight">
            Registered Sandbox Tools
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Controlled execution boundary tools authorized for autonomous agents, enforcing allow/deny policies, timeout guards, and output caps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">
            {tools.length} Tools Active
          </Badge>
          <Badge variant="success" size="sm">
            Sandbox Boundary Enforced
          </Badge>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools by capability or ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setSelectedCapability('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              selectedCapability === 'all'
                ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            All ({tools.length})
          </button>
          {['terminal', 'filesystem', 'mcp', 'github'].map(cap => (
            <button
              key={cap}
              onClick={() => setSelectedCapability(cap)}
              className={`px-2.5 py-1 rounded transition-colors uppercase ${
                selectedCapability === cap
                  ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cap}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Table (Dense, Clean, Linear-Style) */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500">
                <th className="py-2.5 px-4 font-medium">Tool ID & Name</th>
                <th className="py-2.5 px-4 font-medium">Capability</th>
                <th className="py-2.5 px-4 font-medium">Permissions Required</th>
                <th className="py-2.5 px-4 font-medium">Timeout</th>
                <th className="py-2.5 px-4 font-medium">Max Output</th>
                <th className="py-2.5 px-4 font-medium">Execution Policy</th>
                <th className="py-2.5 px-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No tools match your query.
                  </td>
                </tr>
              ) : (
                filteredTools.map(tool => (
                  <tr key={tool.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 font-sans">{tool.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{tool.id}</div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-1">
                        {tool.description}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" size="xs">
                        {tool.capability}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {tool.permission_requirements.map(req => (
                          <span
                            key={req}
                            className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px]"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {tool.execution_policy.timeout_seconds}s
                    </td>
                    <td className="py-3 px-4 text-slate-400 tabular-nums">
                      {(tool.execution_policy.max_output_bytes / 1024 / 1024).toFixed(1)} MB
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {tool.execution_policy.sandboxed_only && (
                          <Badge variant="success" size="xs">
                            Sandboxed Only
                          </Badge>
                        )}
                        {tool.execution_policy.requires_confirmation && (
                          <Badge variant="warning" size="xs">
                            Confirmation
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant={tool.is_enabled ? 'success' : 'danger'}
                        size="xs"
                        dot
                      >
                        {tool.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
