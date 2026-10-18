/**
 * AI HEAVEN - GitHub Actions Integration Contracts & Types
 * Standardized schemas for GitHub Workflows, Workflow Runs, Jobs, Logs, and Dispatch Triggers.
 * Upstream Reference: GitHub REST API v3 Actions (https://docs.github.com/en/rest/actions)
 */

export interface GitHubActionsStatus {
  isConfigured: boolean;
  authType: 'personal_access_token' | 'oauth_token' | 'unconfigured';
  authenticatedUser?: string;
  scopes: string[];
  rateLimit: {
    limit: number;
    remaining: number;
    resetTime: string;
  };
  message: string;
  requiredScopes: string[];
  suggestedSetupUrl: string;
}

export interface GitHubRepositorySummary {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
}

export interface GitHubWorkflow {
  id: number;
  node_id: string;
  name: string;
  path: string;
  state: 'active' | 'deleted' | 'disabled_fork' | 'disabled_inactivity' | 'disabled_manually';
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

export type GitHubRunStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'waiting'
  | 'requested'
  | 'pending';

export type GitHubRunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'timed_out'
  | 'action_required'
  | 'skipped'
  | 'stale'
  | null;

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title?: string;
  run_number: number;
  event: string;
  status: GitHubRunStatus;
  conclusion: GitHubRunConclusion;
  workflow_id: number;
  url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  jobs_url: string;
  logs_url: string;
  check_suite_url?: string;
  artifacts_url?: string;
  cancel_url?: string;
  rerun_url?: string;
  workflow_url?: string;
  actor: {
    login: string;
    avatar_url?: string;
  };
  triggering_actor?: {
    login: string;
    avatar_url?: string;
  };
  run_attempt: number;
}

export interface GitHubWorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface GitHubWorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | null;
  started_at: string;
  completed_at: string | null;
  html_url: string;
  steps: GitHubWorkflowStep[];
  runner_name?: string;
  runner_group_name?: string;
}

export interface WorkflowDispatchPayload {
  ref: string;
  inputs?: Record<string, string | boolean | number>;
}

export interface WorkflowTriggerReceipt {
  dispatchId: string;
  workflowId: number | string;
  workflowName: string;
  repository: string;
  ref: string;
  inputs?: Record<string, any>;
  dispatchedAt: string;
  dispatchedBy: string;
  evidenceChecksum: string;
  status: 'dispatched' | 'failed' | 'rejected_insufficient_permissions';
  message: string;
}

export interface GitHubJobLogsResult {
  jobId: number | string;
  jobName?: string;
  repository: string;
  content: string;
  lineCount: number;
  truncated: boolean;
  retrievedAt: string;
}
