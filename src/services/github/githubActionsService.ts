/**
 * AI HEAVEN - GitHub Actions REST API Service
 * Upstream Specification: GitHub REST API v3 Actions (https://docs.github.com/en/rest/actions)
 * 
 * Provides:
 * 1. Secure token resolution (Environment vars, tenant configuration, or request headers)
 * 2. Scope discovery (workflow, repo, actions:read, actions:write) & rate limit tracking
 * 3. Workflow & repository discovery
 * 4. Workflow run history, status, and job step details
 * 5. Authorized workflow dispatch execution with cryptographic SHA-256 receipts
 * 6. Live run cancellation and re-execution
 * 7. Live step log streaming with secret masking
 * 8. Never simulates fake runs or passes mock data when unconfigured.
 */

import crypto from 'crypto';
import {
  GitHubActionsStatus,
  GitHubJobLogsResult,
  GitHubRepositorySummary,
  GitHubWorkflow,
  GitHubWorkflowJob,
  GitHubWorkflowRun,
  WorkflowDispatchPayload,
  WorkflowTriggerReceipt
} from '../../contracts/githubActions';

export class GitHubActionsService {
  private tenantTokens: Map<string, string> = new Map();
  private baseUrl = 'https://api.github.com';

  /**
   * Resolves the active GitHub token from tenant storage, request overrides, or environment.
   */
  public resolveToken(tokenOverride?: string, tenantId?: string): string {
    if (tokenOverride && tokenOverride.trim()) {
      return tokenOverride.trim();
    }
    if (tenantId && this.tenantTokens.has(tenantId)) {
      return this.tenantTokens.get(tenantId)!;
    }
    return (
      process.env.GITHUB_TOKEN?.trim() ||
      process.env.GITHUB_PAT?.trim() ||
      process.env.GH_TOKEN?.trim() ||
      ''
    );
  }

  /**
   * Securely saves or updates a GitHub token for a specific tenant workspace.
   */
  public setTenantToken(tenantId: string, token: string): void {
    if (!token || !token.trim()) {
      this.tenantTokens.delete(tenantId);
    } else {
      this.tenantTokens.set(tenantId, token.trim());
    }
  }

  /**
   * Clears the configured token for a tenant.
   */
  public clearTenantToken(tenantId: string): void {
    this.tenantTokens.delete(tenantId);
  }

  /**
   * Builds standardized headers for GitHub REST API v3.
   */
  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'AI-Heaven-Platform-Bridge/1.0'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Truthfully inspects token validity, user profile, granted OAuth/PAT scopes, and rate limits.
   */
  public async checkStatus(tokenOverride?: string, tenantId?: string): Promise<GitHubActionsStatus> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const requiredScopes = ['repo (or actions:read/write)', 'workflow'];

    if (!token) {
      return {
        isConfigured: false,
        authType: 'unconfigured',
        scopes: [],
        rateLimit: {
          limit: 60,
          remaining: 60,
          resetTime: new Date(Date.now() + 3600000).toISOString()
        },
        message: 'GitHub Actions integration is unconfigured. Provide a GitHub Personal Access Token or configure GITHUB_TOKEN in your environment.',
        requiredScopes,
        suggestedSetupUrl: 'https://github.com/settings/tokens/new?scopes=repo,workflow'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: this.getHeaders(token)
      });

      const scopeHeader = response.headers.get('x-oauth-scopes') || '';
      const scopes = scopeHeader
        ? scopeHeader.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const limit = parseInt(response.headers.get('x-ratelimit-limit') || '5000', 10);
      const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '5000', 10);
      const resetEpoch = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
      const resetTime = resetEpoch ? new Date(resetEpoch * 1000).toISOString() : new Date().toISOString();

      if (response.status === 401) {
        return {
          isConfigured: false,
          authType: 'personal_access_token',
          scopes: [],
          rateLimit: { limit, remaining, resetTime },
          message: 'The provided GitHub token is invalid, expired, or has been revoked.',
          requiredScopes,
          suggestedSetupUrl: 'https://github.com/settings/tokens/new?scopes=repo,workflow'
        };
      }

      if (!response.ok) {
        return {
          isConfigured: false,
          authType: 'personal_access_token',
          scopes,
          rateLimit: { limit, remaining, resetTime },
          message: `GitHub API error during status check: HTTP ${response.status} ${response.statusText}`,
          requiredScopes,
          suggestedSetupUrl: 'https://github.com/settings/tokens/new?scopes=repo,workflow'
        };
      }

      const userData = await response.json();
      const hasWorkflowScope = scopes.some(s => s === 'workflow' || s === 'repo');

      return {
        isConfigured: true,
        authType: 'personal_access_token',
        authenticatedUser: userData.login,
        scopes,
        rateLimit: { limit, remaining, resetTime },
        message: hasWorkflowScope
          ? `Authenticated as @${userData.login} with active GitHub Actions permissions.`
          : `Authenticated as @${userData.login}, but missing 'workflow' scope. Triggering workflows will require updating token scopes.`,
        requiredScopes,
        suggestedSetupUrl: 'https://github.com/settings/tokens/new?scopes=repo,workflow'
      };
    } catch (err: any) {
      return {
        isConfigured: false,
        authType: 'unconfigured',
        scopes: [],
        rateLimit: { limit: 60, remaining: 0, resetTime: new Date().toISOString() },
        message: `Network error connecting to GitHub API: ${err.message}`,
        requiredScopes,
        suggestedSetupUrl: 'https://github.com/settings/tokens'
      };
    }
  }

  /**
   * Discovers repositories accessible by the current authentication token.
   */
  public async listAccessibleRepositories(
    tokenOverride?: string,
    tenantId?: string
  ): Promise<GitHubRepositorySummary[]> {
    const token = this.resolveToken(tokenOverride, tenantId);
    if (!token) {
      throw new Error('GitHub token required to discover private and user repositories. Configure a token in Settings or environment.');
    }

    const response = await fetch(`${this.baseUrl}/user/repos?per_page=100&sort=updated`, {
      method: 'GET',
      headers: this.getHeaders(token)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Failed to list repositories from GitHub: HTTP ${response.status} - ${errBody || response.statusText}`);
    }

    const rawRepos = await response.json();
    return rawRepos.map((r: any): GitHubRepositorySummary => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: {
        login: r.owner?.login || '',
        avatar_url: r.owner?.avatar_url
      },
      private: Boolean(r.private),
      html_url: r.html_url,
      description: r.description,
      default_branch: r.default_branch || 'main',
      permissions: r.permissions
    }));
  }

  /**
   * Lists all GitHub Actions workflows defined in a repository.
   */
  public async listWorkflows(
    owner: string,
    repo: string,
    tokenOverride?: string,
    tenantId?: string
  ): Promise<GitHubWorkflow[]> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const headers = this.getHeaders(token);

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/workflows`, {
      method: 'GET',
      headers
    });

    if (response.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' or its workflows were not found. Verify repository name and token permissions.`);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`GitHub API error listing workflows: HTTP ${response.status} - ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data.workflows) ? data.workflows : [];
  }

  /**
   * Retrieves single workflow details.
   */
  public async getWorkflow(
    owner: string,
    repo: string,
    workflowId: string | number,
    tokenOverride?: string,
    tenantId?: string
  ): Promise<GitHubWorkflow> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const headers = this.getHeaders(token);

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanWorkflow = encodeURIComponent(String(workflowId).trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/workflows/${cleanWorkflow}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve workflow '${workflowId}': HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Retrieves workflow runs with optional filters for status, branch, or workflow ID.
   */
  public async listWorkflowRuns(
    owner: string,
    repo: string,
    query?: {
      workflowId?: string | number;
      status?: string;
      branch?: string;
      per_page?: number;
      page?: number;
    },
    tokenOverride?: string,
    tenantId?: string
  ): Promise<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const headers = this.getHeaders(token);

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());

    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.branch) params.set('branch', query.branch);
    if (query?.per_page) params.set('per_page', String(Math.min(query.per_page, 100)));
    if (query?.page) params.set('page', String(query.page));

    const endpoint = query?.workflowId
      ? `${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/workflows/${encodeURIComponent(String(query.workflowId))}/runs?${params.toString()}`
      : `${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/runs?${params.toString()}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Failed to fetch workflow runs: HTTP ${response.status} - ${errBody || response.statusText}`);
    }

    const data = await response.json();
    return {
      total_count: data.total_count || 0,
      workflow_runs: Array.isArray(data.workflow_runs) ? data.workflow_runs : []
    };
  }

  /**
   * Retrieves single workflow run details.
   */
  public async getWorkflowRun(
    owner: string,
    repo: string,
    runId: number | string,
    tokenOverride?: string,
    tenantId?: string
  ): Promise<GitHubWorkflowRun> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const headers = this.getHeaders(token);

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanRunId = encodeURIComponent(String(runId).trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/runs/${cleanRunId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow run #${runId}: HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Retrieves the jobs and execution steps for a specific workflow run.
   */
  public async getRunJobs(
    owner: string,
    repo: string,
    runId: number | string,
    tokenOverride?: string,
    tenantId?: string
  ): Promise<GitHubWorkflowJob[]> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const headers = this.getHeaders(token);

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanRunId = encodeURIComponent(String(runId).trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/runs/${cleanRunId}/jobs`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs for run #${runId}: HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.jobs) ? data.jobs : [];
  }

  /**
   * Triggers a workflow dispatch event with authorized branch and inputs.
   * Generates a cryptographic SHA-256 evidence receipt on completion.
   */
  public async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: string | number,
    payload: WorkflowDispatchPayload,
    operatorId: string,
    tenantId: string,
    tokenOverride?: string
  ): Promise<WorkflowTriggerReceipt> {
    const token = this.resolveToken(tokenOverride, tenantId);
    if (!token) {
      throw new Error('GitHub token with `workflow` or `actions:write` scope required to dispatch workflows.');
    }

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanWorkflow = encodeURIComponent(String(workflowId).trim());

    const dispatchId = `gh_dispatch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const targetRef = payload.ref?.trim() || 'main';

    const body: Record<string, any> = {
      ref: targetRef
    };
    if (payload.inputs && Object.keys(payload.inputs).length > 0) {
      body.inputs = payload.inputs;
    }

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/workflows/${cleanWorkflow}/dispatches`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const timestamp = new Date().toISOString();

    if (response.status === 204) {
      // 204 No Content indicates successful queueing
      const evidencePayload = `${dispatchId}|${owner}/${repo}|${workflowId}|${targetRef}|${operatorId}|${timestamp}`;
      const evidenceChecksum = crypto.createHash('sha256').update(evidencePayload).digest('hex');

      return {
        dispatchId,
        workflowId,
        workflowName: String(workflowId),
        repository: `${owner}/${repo}`,
        ref: targetRef,
        inputs: payload.inputs,
        dispatchedAt: timestamp,
        dispatchedBy: operatorId,
        evidenceChecksum,
        status: 'dispatched',
        message: `Workflow '${workflowId}' successfully dispatched on branch '${targetRef}'.`
      };
    }

    // Handle GitHub error conditions
    const errorBody = await response.text().catch(() => '');
    let detailedMsg = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      detailedMsg = parsed.message || detailedMsg;
    } catch {
      detailedMsg = errorBody || detailedMsg;
    }

    if (response.status === 404) {
      throw new Error(`Workflow '${workflowId}' or repository '${owner}/${repo}' not found, or lacks 'workflow' scope.`);
    }

    if (response.status === 422) {
      throw new Error(`Workflow '${workflowId}' cannot be dispatched: ${detailedMsg}. Ensure the workflow file has 'on: workflow_dispatch' configured on branch '${targetRef}'.`);
    }

    throw new Error(`Failed to dispatch workflow: ${detailedMsg}`);
  }

  /**
   * Cancels an active or queued workflow run.
   */
  public async cancelWorkflowRun(
    owner: string,
    repo: string,
    runId: number | string,
    operatorId: string,
    tenantId: string,
    tokenOverride?: string
  ): Promise<{ success: boolean; message: string; evidenceChecksum: string }> {
    const token = this.resolveToken(tokenOverride, tenantId);
    if (!token) {
      throw new Error('GitHub token required to cancel workflow runs.');
    }

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanRunId = encodeURIComponent(String(runId).trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/runs/${cleanRunId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(token)
    });

    const timestamp = new Date().toISOString();
    const evidenceChecksum = crypto
      .createHash('sha256')
      .update(`cancel|${owner}/${repo}|${runId}|${operatorId}|${timestamp}`)
      .digest('hex');

    if (response.status === 202) {
      return {
        success: true,
        message: `Cancellation requested for workflow run #${runId}. GitHub Actions will abort active jobs.`,
        evidenceChecksum
      };
    }

    const err = await response.text().catch(() => '');
    throw new Error(`Failed to cancel workflow run #${runId}: HTTP ${response.status} - ${err || response.statusText}`);
  }

  /**
   * Re-runs a completed workflow run.
   */
  public async rerunWorkflowRun(
    owner: string,
    repo: string,
    runId: number | string,
    operatorId: string,
    tenantId: string,
    tokenOverride?: string
  ): Promise<{ success: boolean; message: string; evidenceChecksum: string }> {
    const token = this.resolveToken(tokenOverride, tenantId);
    if (!token) {
      throw new Error('GitHub token required to rerun workflows.');
    }

    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanRunId = encodeURIComponent(String(runId).trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/runs/${cleanRunId}/rerun`, {
      method: 'POST',
      headers: this.getHeaders(token)
    });

    const timestamp = new Date().toISOString();
    const evidenceChecksum = crypto
      .createHash('sha256')
      .update(`rerun|${owner}/${repo}|${runId}|${operatorId}|${timestamp}`)
      .digest('hex');

    if (response.status === 201) {
      return {
        success: true,
        message: `Workflow run #${runId} has been scheduled for re-execution.`,
        evidenceChecksum
      };
    }

    const err = await response.text().catch(() => '');
    throw new Error(`Failed to rerun workflow #${runId}: HTTP ${response.status} - ${err || response.statusText}`);
  }

  /**
   * Retrieves raw or text logs for a specific job, redacting sensitive tokens and credentials.
   */
  public async getJobLogs(
    owner: string,
    repo: string,
    jobId: number | string,
    tokenOverride?: string,
    tenantId?: string
  ): Promise<GitHubJobLogsResult> {
    const token = this.resolveToken(tokenOverride, tenantId);
    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanJobId = encodeURIComponent(String(jobId).trim());

    const response = await fetch(`${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/actions/jobs/${cleanJobId}/logs`, {
      method: 'GET',
      headers: this.getHeaders(token),
      redirect: 'follow'
    });

    if (response.status === 404) {
      throw new Error(`Logs for job #${jobId} are not available or have expired.`);
    }

    if (!response.ok) {
      throw new Error(`Failed to retrieve logs for job #${jobId}: HTTP ${response.status}`);
    }

    let rawText = await response.text();
    rawText = this.sanitizeLogs(rawText);

    const lines = rawText.split('\n');
    const MAX_LINES = 2500;
    const truncated = lines.length > MAX_LINES;
    const content = truncated ? lines.slice(-MAX_LINES).join('\n') : rawText;

    return {
      jobId,
      repository: `${owner}/${repo}`,
      content,
      lineCount: lines.length,
      truncated,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Masks sensitive credentials, tokens, and private keys from logs.
   */
  public sanitizeLogs(rawText: string): string {
    return rawText
      .replace(/\b(gh[pousr]_[a-zA-Z0-9]{36,40}|github_pat_[a-zA-Z0-9_]{80,95})\b/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/\b(AIzaSy[A-Za-z0-9_-]{30,40}|AIza[0-9A-Za-z-_]{30,40})\b/g, '[REDACTED_API_KEY]')
      .replace(/\b(AKIA[0-9A-Z]{16})\b/g, '[REDACTED_AWS_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9\-_\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/-----BEGIN (?:RSA|DSA|EC|OPENSSH|PRIVATE) KEY-----[\s\S]+?-----END (?:RSA|DSA|EC|OPENSSH|PRIVATE) KEY-----/g, '[REDACTED_PRIVATE_KEY]');
  }
}

export const githubActionsService = new GitHubActionsService();
