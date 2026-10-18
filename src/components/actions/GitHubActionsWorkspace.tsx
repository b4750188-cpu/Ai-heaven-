import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  Filter,
  Github,
  Key,
  Layers,
  Lock,
  Pause,
  Play,
  PlayCircle,
  RefreshCw,
  RotateCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Workflow,
  X,
  XCircle
} from 'lucide-react';
import {
  GitHubActionsStatus,
  GitHubJobLogsResult,
  GitHubRepositorySummary,
  GitHubWorkflow,
  GitHubWorkflowJob,
  GitHubWorkflowRun,
  WorkflowTriggerReceipt
} from '../../contracts/githubActions';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const GitHubActionsWorkspace: React.FC = () => {
  // Status & Auth
  const [status, setStatus] = useState<GitHubActionsStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [patInput, setPatInput] = useState<string>('');
  const [isSavingToken, setIsSavingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Repository Selection
  const [repos, setRepos] = useState<GitHubRepositorySummary[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [selectedOwner, setSelectedOwner] = useState<string>('b4750188-cpu');
  const [selectedRepo, setSelectedRepo] = useState<string>('Ai-heaven-');
  const [customRepoInput, setCustomRepoInput] = useState<string>('b4750188-cpu/Ai-heaven-');

  // Workflows & Runs
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState<boolean>(false);
  const [runs, setRuns] = useState<GitHubWorkflowRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [runSearchQuery, setRunSearchQuery] = useState<string>('');

  // Dispatch Trigger Modal
  const [dispatchModalWorkflow, setDispatchModalWorkflow] = useState<GitHubWorkflow | null>(null);
  const [dispatchRef, setDispatchRef] = useState<string>('main');
  const [dispatchInputs, setDispatchInputs] = useState<string>('{}');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<WorkflowTriggerReceipt | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Run Details & Jobs/Logs
  const [activeRun, setActiveRun] = useState<GitHubWorkflowRun | null>(null);
  const [activeRunJobs, setActiveRunJobs] = useState<GitHubWorkflowJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [activeJobLogs, setActiveJobLogs] = useState<GitHubJobLogsResult | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [cancelModalRunId, setCancelModalRunId] = useState<number | string | null>(null);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Auto-refresh interval for in-progress runs
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Initial load
  useEffect(() => {
    loadStatus();
  }, []);

  // When selected repo changes, load workflows & runs
  useEffect(() => {
    if (selectedOwner && selectedRepo) {
      loadWorkflowsAndRuns();
    }
  }, [selectedOwner, selectedRepo]);

  // Periodic polling if there are in-progress runs and tab is active
  useEffect(() => {
    if (!autoRefresh) return;
    const hasActiveRun = runs.some(r => r.status === 'in_progress' || r.status === 'queued');
    if (!hasActiveRun) return;

    const timer = setInterval(() => {
      loadRuns(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [selectedOwner, selectedRepo, selectedWorkflowId, statusFilter, runs, autoRefresh]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const s = await apiClient.getGitHubActionsStatus();
      setStatus(s);
      if (s.isConfigured) {
        loadRepositories();
      }
    } catch (err: any) {
      console.error('Failed to load GitHub Actions status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const list = await apiClient.listGitHubAccessibleRepos();
      setRepos(list);
    } catch {
      // Fallback: repos can still be entered manually
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const loadWorkflowsAndRuns = async () => {
    await Promise.all([loadWorkflows(), loadRuns(true)]);
  };

  const loadWorkflows = async () => {
    setIsLoadingWorkflows(true);
    setActionError(null);
    try {
      const wfList = await apiClient.listGitHubWorkflows(selectedOwner, selectedRepo);
      setWorkflows(wfList);
    } catch (err: any) {
      setWorkflows([]);
      if (status?.isConfigured) {
        setActionError(`Workflows discovery: ${err.message}`);
      }
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const loadRuns = async (showLoading = true) => {
    if (showLoading) setIsLoadingRuns(true);
    try {
      const res = await apiClient.getGitHubWorkflowRuns(selectedOwner, selectedRepo, {
        workflowId: selectedWorkflowId !== 'all' ? selectedWorkflowId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        per_page: 30
      });
      setRuns(res.workflow_runs || []);
    } catch (err: any) {
      if (showLoading) {
        setRuns([]);
        if (status?.isConfigured) {
          setActionError(`Workflow runs: ${err.message}`);
        }
      }
    } finally {
      if (showLoading) setIsLoadingRuns(false);
    }
  };

  const handleSaveToken = async () => {
    setIsSavingToken(true);
    setTokenError(null);
    try {
      const updated = await apiClient.configureGitHubActionsToken(patInput);
      setStatus(updated);
      setIsTokenModalOpen(false);
      setPatInput('');
      if (updated.isConfigured) {
        await loadRepositories();
        await loadWorkflowsAndRuns();
      }
    } catch (err: any) {
      setTokenError(err.message || 'Failed to save token');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleApplyCustomRepo = () => {
    const parts = customRepoInput.trim().split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      setSelectedOwner(parts[0].trim());
      setSelectedRepo(parts[1].trim());
    } else {
      setActionError("Please enter repository in 'owner/repo' format (e.g. 'b4750188-cpu/Ai-heaven-').");
    }
  };

  const handleOpenDispatchModal = (wf: GitHubWorkflow) => {
    setDispatchModalWorkflow(wf);
    setDispatchRef('main');
    setDispatchInputs('{}');
    setDispatchError(null);
    setLastReceipt(null);
  };

  const handleExecuteDispatch = async () => {
    if (!dispatchModalWorkflow) return;
    setIsDispatching(true);
    setDispatchError(null);
    setLastReceipt(null);

    let parsedInputs: Record<string, any> = {};
    if (dispatchInputs.trim()) {
      try {
        parsedInputs = JSON.parse(dispatchInputs);
      } catch {
        setDispatchError('Inputs must be valid JSON object or empty {}.');
        setIsDispatching(false);
        return;
      }
    }

    try {
      const receipt = await apiClient.triggerGitHubWorkflowDispatch(
        selectedOwner,
        selectedRepo,
        dispatchModalWorkflow.id,
        {
          ref: dispatchRef.trim() || 'main',
          inputs: parsedInputs
        }
      );
      setLastReceipt(receipt);
      // Wait 1.5 seconds then refresh runs to pick up the newly triggered run
      setTimeout(() => {
        loadRuns(false);
      }, 1500);
    } catch (err: any) {
      setDispatchError(err.message || 'Workflow dispatch failed.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSelectRun = async (run: GitHubWorkflowRun) => {
    setActiveRun(run);
    setActiveRunJobs([]);
    setActiveJobLogs(null);
    setIsLoadingJobs(true);
    try {
      const jobs = await apiClient.getGitHubRunJobs(selectedOwner, selectedRepo, run.id);
      setActiveRunJobs(jobs);
      if (jobs.length > 0) {
        handleViewJobLogs(jobs[0].id);
      }
    } catch (err: any) {
      setActionError(`Failed to load jobs for run #${run.id}: ${err.message}`);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleViewJobLogs = async (jobId: number | string) => {
    setIsLoadingLogs(true);
    try {
      const logs = await apiClient.getGitHubJobLogs(selectedOwner, selectedRepo, jobId);
      setActiveJobLogs(logs);
    } catch (err: any) {
      setActiveJobLogs({
        jobId,
        repository: `${selectedOwner}/${selectedRepo}`,
        content: `Could not retrieve live logs: ${err.message}\n(Ensure GitHub token has 'actions:read' or 'repo' scope).`,
        lineCount: 1,
        truncated: false,
        retrievedAt: new Date().toISOString()
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRequestCancel = (runId: number | string) => {
    setCancelModalRunId(runId);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalRunId) return;
    setIsCanceling(true);
    try {
      const res = await apiClient.cancelGitHubWorkflowRun(selectedOwner, selectedRepo, cancelModalRunId);
      setToastNotification({ type: 'success', message: res.message });
      setCancelModalRunId(null);
      loadRuns(false);
    } catch (err: any) {
      setToastNotification({ type: 'error', message: `Cancellation error: ${err.message}` });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleRerun = async (runId: number | string) => {
    try {
      const res = await apiClient.rerunGitHubWorkflowRun(selectedOwner, selectedRepo, runId);
      setToastNotification({ type: 'success', message: res.message });
      loadRuns(false);
    } catch (err: any) {
      setToastNotification({ type: 'error', message: `Rerun error: ${err.message}` });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const filteredRuns = runs.filter(run => {
    if (runSearchQuery.trim()) {
      const q = runSearchQuery.toLowerCase();
      const matchName = run.name?.toLowerCase().includes(q);
      const matchBranch = run.head_branch?.toLowerCase().includes(q);
      const matchActor = run.actor?.login?.toLowerCase().includes(q);
      const matchNumber = String(run.run_number).includes(q);
      if (!matchName && !matchBranch && !matchActor && !matchNumber) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="border-b border-neutral-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-sky-400">
              <Github className="h-3.5 w-3.5" />
              <span>GITHUB ACTIONS CI/CD</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>REST API V3 AUTOMATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 mt-1">
              Workflow Orchestrator & Live Monitor
            </h1>
            <p className="text-sm text-neutral-400 mt-1.5 max-w-3xl leading-relaxed">
              Discover repository workflows, trigger authorized <code className="text-xs text-sky-400 bg-neutral-900 px-1 py-0.5 rounded font-mono">workflow_dispatch</code> runs with cryptographic receipts, inspect live jobs, and stream redacted step logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTokenModalOpen(true)}
              className="border-neutral-700 hover:border-neutral-600 text-neutral-200"
            >
              <Key className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
              {status?.isConfigured ? 'Configure Token' : 'Connect Token'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadWorkflowsAndRuns}
              disabled={isLoadingWorkflows || isLoadingRuns}
              className="border-neutral-700 hover:border-neutral-600 text-neutral-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingRuns ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Authentication & Health Ribbon */}
        <div className="mt-4 p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Status:</span>
              {isLoadingStatus ? (
                <span className="text-neutral-400 animate-pulse">Checking...</span>
              ) : status?.isConfigured ? (
                <Badge variant="success" className="border-emerald-500/50 bg-emerald-950/30 text-emerald-300">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                  AUTHENTICATED ({status.authenticatedUser ? `@${status.authenticatedUser}` : 'Token Active'})
                </Badge>
              ) : (
                <Badge variant="warning" className="border-amber-500/50 bg-amber-950/30 text-amber-300">
                  <AlertCircle className="h-3 w-3 mr-1 text-amber-400" />
                  TOKEN REQUIRED
                </Badge>
              )}
            </div>

            {status?.isConfigured && status.scopes.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-neutral-400">
                <span className="text-neutral-500">Scopes:</span>
                <span className="text-sky-300 truncate max-w-xs">{status.scopes.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            {status?.rateLimit && (
              <div>
                <span className="text-neutral-500">Rate Limit: </span>
                <span className="text-neutral-200 font-semibold">{status.rateLimit.remaining}</span>
                <span className="text-neutral-500">/{status.rateLimit.limit}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Auto-refresh:</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  autoRefresh ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {autoRefresh ? 'ON (8s)' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {!status?.isConfigured && !isLoadingStatus && (
          <div className="mt-3 p-3.5 rounded-lg border border-amber-900/60 bg-amber-950/20 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">GitHub Actions Token Not Configured</div>
              <p className="text-neutral-300 leading-relaxed">
                To discover workflows, trigger dispatches, and monitor execution logs, connect a GitHub Personal Access Token with <code className="text-amber-300 bg-amber-950 px-1 py-0.5 rounded">repo</code> and <code className="text-amber-300 bg-amber-950 px-1 py-0.5 rounded">workflow</code> scopes. Public repositories can be inspected anonymously within standard rate limits.
              </p>
              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={() => setIsTokenModalOpen(true)}
                  className="font-medium text-sky-400 hover:text-sky-300 underline"
                >
                  Configure Token in AI Heaven &rarr;
                </button>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=AI%20Heaven%20Actions%20Bridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-neutral-200 inline-flex items-center gap-1"
                >
                  Generate Token on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {toastNotification && (
          <div className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between ${
            toastNotification.type === 'success'
              ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300'
              : toastNotification.type === 'error'
              ? 'border-rose-900/60 bg-rose-950/20 text-rose-300'
              : 'border-sky-900/60 bg-sky-950/20 text-sky-300'
          }`}>
            <div className="flex items-center gap-2">
              {toastNotification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : toastNotification.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              ) : (
                <Activity className="h-4 w-4 text-sky-400 shrink-0" />
              )}
              <span>{toastNotification.message}</span>
            </div>
            <button onClick={() => setToastNotification(null)} className="text-neutral-400 hover:text-neutral-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mt-3 p-3 rounded-lg border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-neutral-400 hover:text-neutral-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Target Repository Selection */}
      <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 space-y-3">
        <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-sky-400" />
          <span>TARGET REPOSITORY</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {repos.length > 0 && (
            <select
              value={`${selectedOwner}/${selectedRepo}`}
              onChange={(e) => {
                const parts = e.target.value.split('/');
                if (parts.length === 2) {
                  setSelectedOwner(parts[0]);
                  setSelectedRepo(parts[1]);
                  setCustomRepoInput(e.target.value);
                }
              }}
              className="bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-sky-500"
            >
              <optgroup label="Discovered Repositories">
                {repos.map(r => (
                  <option key={r.id} value={r.full_name}>
                    {r.full_name} {r.private ? '(private)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          )}

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={customRepoInput}
              onChange={(e) => setCustomRepoInput(e.target.value)}
              placeholder="e.g. b4750188-cpu/Ai-heaven-"
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-sky-500"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApplyCustomRepo}
              className="border-neutral-700 hover:border-neutral-600 text-neutral-200 text-xs shrink-0"
            >
              Select
            </Button>
          </div>

          <a
            href={`https://github.com/${selectedOwner}/${selectedRepo}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 hover:text-sky-400 inline-flex items-center gap-1 font-mono shrink-0 px-2 py-1"
          >
            <span>GitHub Actions Web</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Main Grid: Workflows (Left) and Runs/History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workflows (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-sky-400" />
              <span>Workflows</span>
              <span className="text-xs font-mono text-neutral-500">({workflows.length})</span>
            </h2>
            <button
              onClick={loadWorkflows}
              className="text-xs text-neutral-400 hover:text-neutral-200"
              title="Reload workflows"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingWorkflows ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingWorkflows ? (
            <div className="p-8 text-center text-xs font-mono text-neutral-500 border border-neutral-800 rounded-lg">
              Scanning `.github/workflows`...
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400 border border-neutral-800 rounded-lg bg-neutral-900/30 space-y-2">
              <p>No workflows found in <code className="text-sky-300 font-mono">{selectedOwner}/{selectedRepo}</code>.</p>
              <p className="text-[11px] text-neutral-500">
                Workflows must exist under <code className="font-mono text-neutral-400">.github/workflows/*.yml</code> on the default branch.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* "All Workflows" filter button */}
              <button
                onClick={() => {
                  setSelectedWorkflowId('all');
                  loadRuns(true);
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  selectedWorkflowId === 'all'
                    ? 'border-sky-500 bg-sky-950/20 text-neutral-100 ring-1 ring-sky-500/20'
                    : 'border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>All Repository Workflows</span>
                  {selectedWorkflowId === 'all' && (
                    <Badge variant="info" className="border-sky-500 text-sky-300 text-[10px]">Active</Badge>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 font-mono mt-1">Aggregated run stream</div>
              </button>

              {workflows.map((wf) => {
                const isSelected = selectedWorkflowId === wf.id;
                return (
                  <div
                    key={wf.id}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-950/20 text-neutral-100 ring-1 ring-sky-500/20'
                        : 'border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => {
                          setSelectedWorkflowId(wf.id);
                          loadRuns(true);
                        }}
                      >
                        <div className="font-semibold text-neutral-200 hover:text-sky-300 transition-colors">
                          {wf.name}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 truncate mt-0.5">
                          {wf.path}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenDispatchModal(wf)}
                        className="border-sky-700/60 hover:border-sky-500 text-sky-300 hover:bg-sky-950/40 text-[11px] h-7 px-2 shrink-0"
                        title="Trigger workflow dispatch"
                      >
                        <Play className="h-3 w-3 mr-1 fill-sky-400/20" />
                        Run
                      </Button>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                      <span className={`capitalize ${wf.state === 'active' ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        {wf.state}
                      </span>
                      <a
                        href={wf.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-300 inline-flex items-center gap-1"
                      >
                        Source <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Workflow Runs & History (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Workflow Runs</span>
              <span className="text-xs font-mono text-neutral-500">({filteredRuns.length})</span>
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={runSearchQuery}
                  onChange={(e) => setRunSearchQuery(e.target.value)}
                  placeholder="Filter runs..."
                  className="bg-neutral-950 border border-neutral-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 font-mono w-40 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  loadRuns(true);
                }}
                className="bg-neutral-950 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="queued">Queued</option>
                <option value="completed">Completed</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
          </div>

          {isLoadingRuns ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-500 border border-neutral-800 rounded-lg">
              Fetching GitHub Actions workflow runs...
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-10 text-center text-xs text-neutral-400 border border-neutral-800 rounded-lg bg-neutral-900/30 space-y-2">
              <p>No workflow runs found matching the active filters.</p>
              <p className="text-[11px] text-neutral-500">
                Trigger a workflow using the <span className="text-sky-300 font-semibold">Run</span> button, or push commits to the repository.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRuns.map((run) => {
                const isSelected = activeRun?.id === run.id;
                const isInProgress = run.status === 'in_progress' || run.status === 'queued';
                const isSuccess = run.conclusion === 'success';
                const isFailure = run.conclusion === 'failure';
                const isCancelled = run.conclusion === 'cancelled';

                return (
                  <div
                    key={run.id}
                    className={`p-3.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/20'
                        : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Status Icon */}
                        <div className="mt-0.5 shrink-0">
                          {isInProgress ? (
                            <RotateCw className="h-4 w-4 text-sky-400 animate-spin" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : isFailure ? (
                            <XCircle className="h-4 w-4 text-rose-400" />
                          ) : isCancelled ? (
                            <Pause className="h-4 w-4 text-neutral-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-neutral-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-neutral-200 truncate">
                              {run.display_title || run.name || `Run #${run.run_number}`}
                            </span>
                            <span className="text-[11px] font-mono text-neutral-500">#{run.run_number}</span>
                            {run.head_branch && (
                              <Badge variant="neutral" className="border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300">
                                {run.head_branch}
                              </Badge>
                            )}
                            <Badge
                              variant={isInProgress ? 'info' : isSuccess ? 'success' : isFailure ? 'danger' : 'neutral'}
                              className={`text-[10px] font-mono ${
                                isInProgress
                                  ? 'border-sky-500/50 bg-sky-950/30 text-sky-300'
                                  : isSuccess
                                  ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300'
                                  : isFailure
                                  ? 'border-rose-500/50 bg-rose-950/30 text-rose-300'
                                  : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                              }`}
                            >
                              {run.conclusion || run.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono mt-1 flex-wrap">
                            <span>Event: <code className="text-neutral-400">{run.event}</code></span>
                            {run.actor?.login && (
                              <span>by @{run.actor.login}</span>
                            )}
                            <span>{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Run Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSelectRun(run)}
                          className={`text-xs h-7 px-2.5 ${isSelected ? 'border-sky-500 text-sky-300' : 'border-neutral-700 text-neutral-300'}`}
                        >
                          <Terminal className="h-3 w-3 mr-1" />
                          Inspect & Logs
                        </Button>

                        {isInProgress && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRequestCancel(run.id)}
                            className="border-rose-800 hover:border-rose-600 text-rose-400 hover:bg-rose-950/30 text-xs h-7 px-2"
                            title="Cancel Run"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}

                        {!isInProgress && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRerun(run.id)}
                            className="border-neutral-700 hover:border-neutral-600 text-neutral-400 hover:text-neutral-200 text-xs h-7 px-2"
                            title="Rerun Workflow"
                          >
                            <RotateCw className="h-3 w-3" />
                          </Button>
                        )}

                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-neutral-500 hover:text-neutral-300"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Run Inspector & Logs Viewer */}
          {activeRun && (
            <div className="mt-6 border border-neutral-800 rounded-lg bg-neutral-950 overflow-hidden">
              <div className="p-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-sky-400" />
                  <span className="font-semibold text-xs text-neutral-200">
                    Execution Inspector: Run #{activeRun.run_number} &mdash; {activeRun.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeJobLogs?.content && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(activeJobLogs.content)}
                      className="h-6 text-[11px] px-2 border-neutral-700 text-neutral-300"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copiedLog ? 'Copied' : 'Copy Logs'}
                    </Button>
                  )}
                  <button
                    onClick={() => setActiveRun(null)}
                    className="text-neutral-400 hover:text-neutral-200 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Jobs & Step Pipeline */}
              <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/30">
                <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
                  Pipeline Jobs & Steps
                </div>

                {isLoadingJobs ? (
                  <div className="text-xs font-mono text-neutral-500 animate-pulse">Loading jobs...</div>
                ) : activeRunJobs.length === 0 ? (
                  <div className="text-xs text-neutral-400 font-mono">No separate jobs reported for this run.</div>
                ) : (
                  <div className="space-y-3">
                    {activeRunJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 rounded border border-neutral-800 bg-neutral-900/50 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-200">{job.name}</span>
                            <Badge
                              variant={job.conclusion === 'success' ? 'success' : job.conclusion === 'failure' ? 'danger' : 'neutral'}
                              className={`text-[10px] font-mono ${
                                job.conclusion === 'success'
                                  ? 'border-emerald-500/40 text-emerald-400'
                                  : job.conclusion === 'failure'
                                  ? 'border-rose-500/40 text-rose-400'
                                  : 'border-neutral-700 text-neutral-400'
                              }`}
                            >
                              {job.conclusion || job.status}
                            </Badge>
                          </div>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewJobLogs(job.id)}
                            className="h-6 text-[11px] px-2 border-neutral-700 text-sky-400 hover:text-sky-300"
                          >
                            Stream Logs
                          </Button>
                        </div>

                        {/* Steps */}
                        {job.steps && job.steps.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {job.steps.map((st) => (
                              <div
                                key={st.number}
                                className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2 py-1 rounded"
                              >
                                {st.conclusion === 'success' ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                ) : st.conclusion === 'failure' ? (
                                  <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                                ) : st.status === 'in_progress' ? (
                                  <RotateCw className="h-3 w-3 text-sky-400 animate-spin shrink-0" />
                                ) : (
                                  <Clock className="h-3 w-3 text-neutral-600 shrink-0" />
                                )}
                                <span className="truncate">{st.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logs Content */}
              <div className="p-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
                  <span>Execution Logs {activeJobLogs?.truncated ? '(Truncated to last 2,500 lines)' : ''}</span>
                  {activeJobLogs && <span>Lines: {activeJobLogs.lineCount}</span>}
                </div>

                {isLoadingLogs ? (
                  <div className="p-6 text-center text-xs font-mono text-neutral-500">
                    Retrieving execution logs from GitHub Actions API...
                  </div>
                ) : !activeJobLogs ? (
                  <div className="p-4 text-xs font-mono text-neutral-500">
                    Select a job above to view execution logs.
                  </div>
                ) : (
                  <div className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs font-mono text-neutral-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                    {activeJobLogs.content}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trigger Dispatch Modal */}
      {dispatchModalWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <PlayCircle className="h-4 w-4 text-sky-400" />
                <span>Trigger Workflow Dispatch</span>
              </div>
              <button
                onClick={() => setDispatchModalWorkflow(null)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 font-mono block mb-1">Workflow</label>
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 font-mono text-neutral-200">
                  {dispatchModalWorkflow.name} ({dispatchModalWorkflow.path})
                </div>
              </div>

              <div>
                <label className="text-neutral-400 font-mono block mb-1">Git Ref / Branch</label>
                <input
                  type="text"
                  value={dispatchRef}
                  onChange={(e) => setDispatchRef(e.target.value)}
                  placeholder="main"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 font-mono text-neutral-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-mono block mb-1">
                  Inputs (JSON Object &mdash; optional)
                </label>
                <textarea
                  value={dispatchInputs}
                  onChange={(e) => setDispatchInputs(e.target.value)}
                  rows={3}
                  placeholder="{}"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 font-mono text-neutral-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              {dispatchError && (
                <div className="p-3 rounded border border-rose-900 bg-rose-950/30 text-rose-300">
                  {dispatchError}
                </div>
              )}

              {lastReceipt && (
                <div className="p-3 rounded border border-emerald-900 bg-emerald-950/30 text-emerald-300 space-y-1 font-mono text-[11px]">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Cryptographic Evidence Receipt Generated</span>
                  </div>
                  <div>Checksum: <code className="text-neutral-300">{lastReceipt.evidenceChecksum.slice(0, 24)}...</code></div>
                  <div>Status: {lastReceipt.status}</div>
                  <p className="text-neutral-400 pt-1">{lastReceipt.message}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDispatchModalWorkflow(null)}
                className="border-neutral-700 text-neutral-300"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteDispatch}
                disabled={isDispatching}
                className="bg-sky-600 hover:bg-sky-500 text-white"
              >
                {isDispatching ? 'Dispatching...' : 'Confirm & Dispatch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Token Configuration Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <Key className="h-4 w-4 text-sky-400" />
                <span>Configure GitHub Personal Access Token</span>
              </div>
              <button
                onClick={() => setIsTokenModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-400 leading-relaxed">
                Provide a GitHub Personal Access Token (Classic or Fine-Grained) to authorize workflow discovery, dispatch triggering, and log streaming.
              </p>

              <div>
                <label className="text-neutral-300 font-mono block mb-1">GitHub Token</label>
                <input
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 font-mono text-neutral-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="font-semibold text-neutral-300">Required Token Scopes:</div>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-400 font-mono">
                  <li><strong className="text-sky-300">repo</strong>: Read & write access to repositories</li>
                  <li><strong className="text-sky-300">workflow</strong>: Trigger and inspect GitHub Actions workflows</li>
                </ul>
              </div>

              {tokenError && (
                <div className="p-3 rounded border border-rose-900 bg-rose-950/30 text-rose-300">
                  {tokenError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setPatInput('');
                  await handleSaveToken();
                }}
                className="border-neutral-800 text-neutral-400 hover:text-rose-400"
              >
                Clear Token
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="border-neutral-700 text-neutral-300"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveToken}
                  disabled={isSavingToken}
                  className="bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {isSavingToken ? 'Verifying...' : 'Save & Verify'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalRunId !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>Cancel Workflow Run #{cancelModalRunId}</span>
              </div>
              <button
                onClick={() => setCancelModalRunId(null)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-2">
              <p>
                Are you sure you want to request cancellation for workflow run <code className="text-rose-300 font-mono">#{cancelModalRunId}</code> in <code className="text-sky-300 font-mono">{selectedOwner}/{selectedRepo}</code>?
              </p>
              <p className="text-[11px] text-neutral-400">
                GitHub Actions will immediately stop queued and active runner jobs.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCancelModalRunId(null)}
                className="border-neutral-700 text-neutral-300"
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="bg-rose-700 hover:bg-rose-600 text-white"
              >
                {isCanceling ? 'Aborting...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
