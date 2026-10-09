/**
 * AI HEAVEN - Secure Operator Dashboard & Autonomous Reliability Console
 * Provides real-time operational visibility: task state distribution, worker health,
 * failed jobs inspector, queue depth, database connectivity diagnostics,
 * safe recovery controls, and secret-redacted audit history.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  Users,
  Zap
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { AgentWorker, KillSwitchStatus } from '../../types/agentRuntime';
import { AuditEvent } from '../../types/foundation';

interface OperatorDashboardProps {
  onNavigateToAgent?: (agentId: string) => void;
  onNavigateToApprovals?: () => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  onNavigateToAgent,
  onNavigateToApprovals
}) => {
  const [data, setData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const [overview, audits] = await Promise.all([
        apiClient.getOperationsOverview(),
        apiClient.getAuditEvents({ limit: 20 })
      ]);
      if (overview) setData(overview);
      setAuditLogs(audits || []);
    } catch (err: any) {
      console.error('Failed to load operational overview:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleRecoverState = async () => {
    setIsActionPending(true);
    try {
      const res = await apiClient.triggerStateRecovery();
      showNotification('success', `State recovered: ${res.recoveredTasks} tasks, ${res.recoveredWorkers} workers reconciled.`);
      await loadOverview();
    } catch (err: any) {
      showNotification('error', `Recovery failed: ${err.message}`);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCleanupApprovals = async () => {
    setIsActionPending(true);
    try {
      const res = await apiClient.cleanupStaleApprovals();
      showNotification('success', `Cleaned up ${res.expiredApprovalsCleaned} expired approval requests.`);
      await loadOverview();
    } catch (err: any) {
      showNotification('error', `Cleanup failed: ${err.message}`);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResetWorker = async (agentId: string) => {
    setIsActionPending(true);
    try {
      await apiClient.resetWorker(agentId);
      showNotification('success', `Worker for ${agentId} reset to READY state.`);
      await loadOverview();
    } catch (err: any) {
      showNotification('error', `Reset failed: ${err.message}`);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTriggerKillSwitch = async () => {
    if (!confirm('Are you sure you want to trigger the GLOBAL KILL SWITCH? This immediately cancels all in-flight tasks.')) {
      return;
    }
    setIsActionPending(true);
    try {
      await apiClient.triggerKillSwitch('global', undefined, 'Operator triggered emergency shutdown from console');
      showNotification('error', 'Global Kill Switch ACTIVATED: All agent operations halted.');
      await loadOverview();
    } catch (err: any) {
      showNotification('error', `Failed to trigger kill switch: ${err.message}`);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResetKillSwitch = async () => {
    setIsActionPending(true);
    try {
      await apiClient.resetKillSwitch();
      showNotification('success', 'Global Kill Switch reset. Agent operations restored.');
      await loadOverview();
    } catch (err: any) {
      showNotification('error', `Failed to reset kill switch: ${err.message}`);
    } finally {
      setIsActionPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-sm font-medium text-neutral-400">Loading operations console...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    tasks: { total: 0, created: 0, in_progress: 0, completed: 0, failed: 0, cancelled: 0, paused: 0 },
    workers: { total: 0, ready: 0, executing: 0, waiting_approval: 0, paused: 0, terminated: 0 },
    receiptsCount: 0,
    killSwitchActive: false
  };

  const db = data?.database || { configured: false, connected: false };
  const system = data?.system || {};
  const isKillSwitchActive = metrics.killSwitchActive;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl font-mono">
              OPERATIONS CONSOLE
            </h1>
            <Badge variant={isKillSwitchActive ? 'danger' : 'success'}>
              {isKillSwitchActive ? 'KILL SWITCH ACTIVE' : 'SYSTEM HEALTHY'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-400">
            Real-time autonomous runtime status, execution boundaries, database diagnostics, and safe operator controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadOverview(true)}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRecoverState}
            disabled={isActionPending}
            className="inline-flex items-center space-x-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
            title="Reconciles in-flight tasks and worker states from durable storage"
          >
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Recover State</span>
          </button>

          <button
            onClick={handleCleanupApprovals}
            disabled={isActionPending}
            className="inline-flex items-center space-x-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
            title="Expires pending approvals past TTL"
          >
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Clean Expired Approvals</span>
          </button>

          {isKillSwitchActive ? (
            <button
              onClick={handleResetKillSwitch}
              disabled={isActionPending}
              className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Reset Kill Switch</span>
            </button>
          ) : (
            <button
              onClick={handleTriggerKillSwitch}
              disabled={isActionPending}
              className="inline-flex items-center space-x-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <AlertOctagon className="h-4 w-4" />
              <span>Kill Switch</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`flex items-center space-x-3 rounded-lg border p-4 text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* PostgreSQL Status */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 font-mono">
              Database (PostgreSQL)
            </span>
            <Database className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-xl font-bold font-mono text-neutral-100">
              {db.connected ? 'CONNECTED' : db.configured ? 'UNREACHABLE' : 'UNCONFIGURED'}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-400 font-mono">
            {db.connected
              ? `Host: ${db.host || 'postgres'} (${db.latencyMs}ms)`
              : db.configured
              ? db.error || 'Connection failed'
              : 'Add DATABASE_URL in Vercel'}
          </p>
        </div>

        {/* Task Engine */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 font-mono">
              Active Tasks
            </span>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-neutral-100">
              {metrics.tasks.in_progress}
            </span>
            <span className="text-xs text-neutral-400">in progress / {metrics.tasks.total} total</span>
          </div>
          <p className="mt-2 text-xs text-neutral-400 font-mono">
            {metrics.tasks.completed} completed · {metrics.tasks.failed} failed · {metrics.receiptsCount} receipts
          </p>
        </div>

        {/* Worker Pool */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 font-mono">
              Worker Pool
            </span>
            <Users className="h-5 w-5 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-neutral-100">
              {metrics.workers.ready}
            </span>
            <span className="text-xs text-neutral-400">ready / {metrics.workers.total} registered</span>
          </div>
          <p className="mt-2 text-xs text-neutral-400 font-mono">
            {metrics.workers.executing} running · {metrics.workers.waiting_approval} awaiting approval
          </p>
        </div>

        {/* Queue & Approvals */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 font-mono">
              Pending Approvals
            </span>
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-neutral-100">
              {data?.approvals?.pending || 0}
            </span>
            <span className="text-xs text-neutral-400">requiring human decision</span>
          </div>
          <p className="mt-2 text-xs text-neutral-400 font-mono">
            {data?.approvals?.expired || 0} expired · {data?.approvals?.total || 0} total requests
          </p>
        </div>
      </div>

      {/* Task Distribution & Environment Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Task State Distribution */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            Task Lifecycle Distribution
          </h2>
          <div className="mt-6 space-y-3">
            {[
              { label: 'Completed', count: metrics.tasks.completed, color: 'bg-emerald-500' },
              { label: 'In Progress', count: metrics.tasks.in_progress, color: 'bg-sky-500' },
              { label: 'Created / Planned', count: metrics.tasks.created, color: 'bg-amber-500' },
              { label: 'Paused', count: metrics.tasks.paused, color: 'bg-indigo-500' },
              { label: 'Cancelled', count: metrics.tasks.cancelled, color: 'bg-neutral-500' },
              { label: 'Failed', count: metrics.tasks.failed, color: 'bg-rose-500' }
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-neutral-400">
                  <span>{item.label}</span>
                  <span className="text-neutral-200 font-semibold">{item.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full ${item.color}`}
                    style={{
                      width: `${metrics.tasks.total > 0 ? (item.count / metrics.tasks.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime Environment & Serverless Metrics */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-2">
            <Server className="h-4 w-4 text-sky-400" />
            Runtime Environment
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <span className="text-neutral-500 block">Execution Mode</span>
              <span className="font-semibold text-neutral-200 mt-1 block">
                {system.isServerless ? 'Vercel Serverless (Lambda)' : 'Standalone Node.js / Container'}
              </span>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <span className="text-neutral-500 block">Node Runtime</span>
              <span className="font-semibold text-neutral-200 mt-1 block">{system.nodeVersion || 'v22.x'}</span>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <span className="text-neutral-500 block">Heap Usage</span>
              <span className="font-semibold text-neutral-200 mt-1 block">
                {system.memoryMb?.heapUsed || 0} MB / {system.memoryMb?.heapTotal || 0} MB
              </span>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <span className="text-neutral-500 block">Process Uptime</span>
              <span className="font-semibold text-neutral-200 mt-1 block">
                {Math.floor((system.uptimeSeconds || 0) / 60)}m {(system.uptimeSeconds || 0) % 60}s
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs font-mono text-neutral-400">
            <div className="flex items-center justify-between">
              <span>Security Sandboxing:</span>
              <span className="text-emerald-400 font-semibold">Strict Workspace Isolation</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Approval Gates:</span>
              <span className="text-emerald-400 font-semibold">Active (Destructive Detection)</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Execution Timeout:</span>
              <span className="text-neutral-200">30s default / 60s max bounded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Failed Jobs & Error Inspector */}
      {data?.jobs?.failed > 0 && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Recent Failed or Rejected Executions ({data?.jobs?.failed})
            </h2>
          </div>

          <div className="space-y-3">
            {data?.jobs?.recentFailed?.map((job: any) => (
              <div key={job.id} className="rounded-lg border border-rose-900/30 bg-neutral-950 p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">{job.id}</span>
                  <Badge variant="danger">{job.state}</Badge>
                </div>
                <div className="text-neutral-300">
                  <span className="text-neutral-500">Command: </span>
                  <code>{job.command}</code>
                </div>
                <div className="text-rose-300/80 bg-rose-950/20 p-2 rounded border border-rose-900/20">
                  <span className="text-neutral-500 block mb-0.5">Error Detail (Redacted):</span>
                  {job.errorMessage}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit History & Execution Trail */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 font-mono flex items-center gap-2">
            <Terminal className="h-4 w-4 text-neutral-400" />
            Recent Security & Audit Events ({auditLogs.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Actor</th>
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Event Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500">
                    No recent audit events logged.
                  </td>
                </tr>
              ) : (
                auditLogs.map((evt) => (
                  <tr key={evt.id} className="hover:bg-neutral-800/30">
                    <td className="py-2.5 text-neutral-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-semibold text-neutral-300">{evt.actor_id}</td>
                    <td className="py-2.5 text-neutral-200">{evt.action}</td>
                    <td className="py-2.5">
                      <Badge variant={evt.status === 'success' ? 'success' : evt.status === 'rejected' ? 'warning' : 'danger'}>
                        {evt.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-neutral-500">{evt.event_type}</td>
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
