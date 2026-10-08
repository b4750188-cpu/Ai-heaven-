import {
  Activity,
  AlertOctagon,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Terminal,
  User,
  XCircle
} from 'lucide-react';
import React, { useState } from 'react';
import { RuntimeEvent } from '../../types/agentRuntime';
import { AuditEvent } from '../../types/foundation';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ActivityViewProps {
  events: RuntimeEvent[];
  auditEvents: AuditEvent[];
  onRefresh: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  events,
  auditEvents,
  onRefresh
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<RuntimeEvent | null>(null);

  const filteredEvents = events.filter(ev => {
    if (filterType !== 'all') {
      if (filterType === 'approval' && !ev.event_type.includes('approval')) return false;
      if (filterType === 'execution' && !ev.event_type.includes('execution')) return false;
      if (filterType === 'task' && !ev.event_type.includes('task')) return false;
      if (filterType === 'kill' && !ev.event_type.includes('kill')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ev.id.toLowerCase().includes(q) ||
        ev.event_type.toLowerCase().includes(q) ||
        (ev.agent_id && ev.agent_id.toLowerCase().includes(q)) ||
        (ev.task_id && ev.task_id.toLowerCase().includes(q))
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
            <span>SYSTEM</span>
            <span className="text-slate-600">/</span>
            <span>OBSERVABILITY & AUDIT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 font-mono tracking-tight">
            Real-Time Activity & Audit Feed
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live telemetry capturing agent planner events, sandbox executions, human authorization checkpoints, and kill switch activations.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={onRefresh}
        >
          Refresh Feed
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by event ID, agent, or task..."
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setFilterType('approval')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'approval'
                ? 'bg-amber-600/20 text-amber-300 font-medium border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Approvals
          </button>
          <button
            onClick={() => setFilterType('execution')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'execution'
                ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Executions
          </button>
          <button
            onClick={() => setFilterType('task')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'task'
                ? 'bg-emerald-600/20 text-emerald-300 font-medium border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setFilterType('kill')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterType === 'kill'
                ? 'bg-rose-600/20 text-rose-300 font-medium border border-rose-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Kill Switch
          </button>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500">
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-4 font-medium">Event Type</th>
                <th className="py-2.5 px-4 font-medium">Event ID</th>
                <th className="py-2.5 px-4 font-medium">Target / Context</th>
                <th className="py-2.5 px-4 font-medium text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No activity recorded in this view.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(ev => {
                  const isKill = ev.event_type === 'kill_switch_triggered';
                  const isApproval = ev.event_type.startsWith('approval');
                  const isFailed = ev.event_type.includes('failed');

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`hover:bg-slate-850/50 transition-colors cursor-pointer ${
                        isKill
                          ? 'bg-rose-950/20'
                          : isFailed
                          ? 'bg-rose-950/10'
                          : isApproval
                          ? 'bg-amber-950/10'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            isKill
                              ? 'danger'
                              : isFailed
                              ? 'danger'
                              : isApproval
                              ? 'warning'
                              : 'info'
                          }
                          size="xs"
                        >
                          {ev.event_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{ev.id}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {ev.agent_id ? (
                          <span>Agent: {ev.agent_id}</span>
                        ) : ev.task_id ? (
                          <span>Task: {ev.task_id}</span>
                        ) : (
                          <span className="text-slate-500">System Core</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-400 hover:underline">Inspect JSON</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal / Drawer for Event Payload */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0B0F19] p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {selectedEvent.event_type.toUpperCase()}
                </h3>
                <span className="text-slate-500 text-[11px]">{selectedEvent.id}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(selectedEvent, null, 2)}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="xs" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
