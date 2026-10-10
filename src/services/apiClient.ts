/**
 * AI Heaven API Client
 * Compatible with FastAPI / SQLAlchemy 2.0 backend endpoints.
 * Includes graceful fallback to authoritative local data store and live connection health reporting.
 */

import { PROVIDERS, RELATIONSHIPS, RESOURCES } from '../data/database';
import {
  AgentDefinition,
  AuditEvent,
  DroidManifest,
  ExecutionReceipt,
  Project,
  ToolDefinition,
  User,
  Workspace
} from '../types/foundation';
import {
  ExecutionApproval,
  ExecutionJob,
  FsFileContent,
  FsNodeMetadata
} from '../types/execution';
import {
  AgentTask,
  AgentWorker,
  AgentWorkingMemory,
  KillSwitchScope,
  KillSwitchStatus,
  RuntimeEvent,
  TaskPriority
} from '../types/agentRuntime';
import { GraphEdge, GraphNode, KnowledgeGraphData } from '../types/graph';
import { Provider, RelationshipType, Resource, ResourceRelationship, ResourceType } from '../types/resource';

export interface BackendStatus {
  connected: boolean;
  baseUrl: string;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

const API_BASE_URL = '/api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AIHeavenApiClient {
  private baseUrl: string;
  private isBackendAvailable: boolean | null = null;
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
  }

  public clearCache() {
    this.cache.clear();
    this.inFlight.clear();
  }

  private async fetchWithCache<T>(cacheKey: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data;
    }
    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey);
    }
    const promise = fetcher()
      .then((data) => {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        this.inFlight.delete(cacheKey);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(cacheKey);
        throw err;
      });
    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
    this.isBackendAvailable = null;
  }

  public async checkHealth(): Promise<BackendStatus> {
    if (!this.baseUrl) {
      return {
        connected: false,
        baseUrl: 'Local Standalone Store (No VITE_API_URL configured)',
        lastChecked: new Date().toISOString()
      };
    }

    const start = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      const latencyMs = Math.round(performance.now() - start);

      if (response.ok) {
        this.isBackendAvailable = true;
        return {
          connected: true,
          baseUrl: this.baseUrl,
          latencyMs,
          lastChecked: new Date().toISOString()
        };
      } else {
        this.isBackendAvailable = false;
        return {
          connected: false,
          baseUrl: this.baseUrl,
          lastChecked: new Date().toISOString(),
          error: `HTTP ${response.status} ${response.statusText}`
        };
      }
    } catch (err: any) {
      this.isBackendAvailable = false;
      return {
        connected: false,
        baseUrl: this.baseUrl,
        lastChecked: new Date().toISOString(),
        error: err.message || 'Network unreachable'
      };
    }
  }

  public async getResources(options?: {
    type?: ResourceType | 'all';
    provider?: string | 'all';
    search?: string;
    verifiedOnly?: boolean;
    includeDemo?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Resource[]; total: number }> {
    // If backend is configured, attempt fetch with fallback
    if (this.baseUrl) {
      try {
        const queryParams = new URLSearchParams();
        if (options?.type && options.type !== 'all') queryParams.set('type', options.type);
        if (options?.provider && options.provider !== 'all') queryParams.set('provider', options.provider);
        if (options?.search) queryParams.set('q', options.search);
        if (options?.verifiedOnly) queryParams.set('verified_only', 'true');
        if (options?.limit) queryParams.set('limit', String(options.limit));
        if (options?.offset) queryParams.set('offset', String(options.offset));

        const res = await fetch(`${this.baseUrl}/resources?${queryParams.toString()}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch {
        // Fall back gracefully
      }
    }

    // Local Authoritative Processing
    let filtered = [...RESOURCES];

    if (options?.includeDemo === false) {
      filtered = filtered.filter(r => !r.provenance.is_demo_data);
    }

    if (options?.type && options.type !== 'all') {
      filtered = filtered.filter(r => r.resource_type === options.type);
    }

    if (options?.provider && options.provider !== 'all') {
      filtered = filtered.filter(r => r.provider_id === options.provider);
    }

    if (options?.verifiedOnly) {
      filtered = filtered.filter(r => r.verification_status === 'verified');
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        r.capabilities.some(c => c.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const items = filtered.slice(offset, offset + limit);

    return { items, total };
  }

  public async getResourceBySlug(slug: string): Promise<Resource | null> {
    if (this.baseUrl) {
      try {
        const res = await fetch(`${this.baseUrl}/resources/${encodeURIComponent(slug)}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fall back to local
      }
    }

    const match = RESOURCES.find(r => r.slug === slug || r.id === slug);
    return match || null;
  }

  public async getRelationships(slug: string): Promise<ResourceRelationship[]> {
    if (this.baseUrl) {
      try {
        const res = await fetch(`${this.baseUrl}/resources/${encodeURIComponent(slug)}/relationships`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fall back
      }
    }

    return RELATIONSHIPS.filter(r => r.source_slug === slug || r.target_slug === slug);
  }

  public async getProviders(): Promise<Provider[]> {
    return this.fetchWithCache('providers', 30000, async () => {
      if (this.baseUrl) {
        try {
          const res = await fetch(`${this.baseUrl}/providers`, {
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {
          // Fall back
        }
      }
      return PROVIDERS;
    });
  }

  public async syncConnector(connectorId: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/connectors/${encodeURIComponent(connectorId)}/sync`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  }

  public async getKnowledgeGraph(): Promise<KnowledgeGraphData> {
    return this.fetchWithCache('knowledge_graph', 30000, async () => {
      if (this.baseUrl) {
        try {
          const res = await fetch(`${this.baseUrl}/graph`, {
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {
          // Fall back
        }
      }

      // Build graph representation from authoritative local database
    const resourceNodes: GraphNode[] = RESOURCES.map(r => ({
      id: r.slug,
      slug: r.slug,
      name: r.name,
      resource_type: r.resource_type,
      provider_id: r.provider_id,
      trust_score: r.trust_score,
      verification_status: r.verification_status,
      is_demo_data: r.provenance?.is_demo_data || false,
      summary: r.summary,
      description: r.description,
      capabilities: r.capabilities || [],
      tags: r.tags || [],
      version: r.version,
      documentation_url: r.documentation_url,
      source_url: r.source_url,
      license: r.license,
      agent_contract: r.agent_contract,
      provenance: r.provenance,
      category: r.categories?.[0] || 'AI Ecosystem',
      cluster: r.provider_id ? r.provider_id.replace('prov_', '') : 'ecosystem'
    }));

    const providerNodes: GraphNode[] = PROVIDERS.map(p => ({
      id: p.slug,
      slug: p.slug,
      name: p.name,
      resource_type: 'provider' as const,
      provider_id: p.id,
      trust_score: p.verified ? 100 : 80,
      verification_status: p.verified ? 'verified' : 'unverified',
      is_demo_data: false,
      summary: p.description,
      description: p.description,
      capabilities: p.resource_types_provided,
      tags: ['provider', 'infrastructure', p.slug],
      documentation_url: p.documentation_url,
      source_url: p.website_url,
      category: 'Cloud & AI Provider',
      cluster: p.slug
    }));

    const toolNodes: GraphNode[] = [
      {
        id: 'tool_terminal_sandbox',
        slug: 'tool_terminal_sandbox',
        name: 'Sandboxed Terminal Execution',
        resource_type: 'tool' as const,
        provider_id: 'prov_ai_heaven',
        trust_score: 99,
        verification_status: 'verified',
        is_demo_data: false,
        summary: 'Executes shell commands strictly inside isolated container environment.',
        description: 'Executes shell commands strictly inside isolated container environment.',
        capabilities: ['terminal'],
        tags: ['sandbox_tool', 'terminal'],
        category: 'Agent Execution Tools',
        cluster: 'platform_tools'
      },
      {
        id: 'tool_fs_scoped',
        slug: 'tool_fs_scoped',
        name: 'Scoped Workspace Filesystem',
        resource_type: 'tool' as const,
        provider_id: 'prov_ai_heaven',
        trust_score: 99,
        verification_status: 'verified',
        is_demo_data: false,
        summary: 'Provides path-traversal protected read/write within workspace directories.',
        description: 'Provides path-traversal protected read/write within workspace directories.',
        capabilities: ['filesystem'],
        tags: ['sandbox_tool', 'filesystem'],
        category: 'Agent Execution Tools',
        cluster: 'platform_tools'
      },
      {
        id: 'tool_mcp_client',
        slug: 'tool_mcp_client',
        name: 'Model Context Protocol (MCP) Client',
        resource_type: 'tool' as const,
        provider_id: 'prov_ai_heaven',
        trust_score: 99,
        verification_status: 'verified',
        is_demo_data: false,
        summary: 'Enables discovery and invocation of remote MCP tools and dynamic resources.',
        description: 'Enables discovery and invocation of remote MCP tools and dynamic resources.',
        capabilities: ['mcp'],
        tags: ['sandbox_tool', 'mcp'],
        category: 'Agent Execution Tools',
        cluster: 'platform_tools'
      }
    ];

    const agentNodes: GraphNode[] = [
      {
        id: 'agent_droid_prime',
        slug: 'agent_droid_prime',
        name: 'AI Heaven Droid Prime',
        resource_type: 'droid' as const,
        provider_id: 'prov_ai_heaven',
        trust_score: 98,
        verification_status: 'verified',
        is_demo_data: false,
        summary: 'Autonomous platform engineering worker equipped with terminal, scoped filesystem, and MCP inspection.',
        description: 'Autonomous platform engineering worker equipped with terminal, scoped filesystem, and MCP inspection.',
        capabilities: ['tool_terminal_sandbox', 'tool_fs_scoped', 'tool_mcp_client'],
        tags: ['autonomous_agent', 'droid', 'idle'],
        status: 'idle',
        category: 'Autonomous Droids',
        cluster: 'droids'
      }
    ];

    const nodes: GraphNode[] = [...providerNodes, ...resourceNodes, ...toolNodes, ...agentNodes];

    const edges: GraphEdge[] = [
      ...RELATIONSHIPS.map(rel => ({
        id: rel.id,
        source: rel.source_slug,
        target: rel.target_slug,
        relationship_type: rel.relationship_type,
        evidence_url: rel.evidence_url,
        confidence: rel.confidence,
        verified: rel.verified,
        description: rel.description
      })),
      ...RESOURCES.map(r => {
        const prov = PROVIDERS.find(p => p.id === r.provider_id);
        if (!prov) return null;
        return {
          id: `rel_prov_${prov.slug}_${r.slug}`,
          source: prov.slug,
          target: r.slug,
          relationship_type: (r.resource_type === 'model' || r.resource_type === 'api' ? 'provides' : 'publishes') as any,
          evidence_url: r.documentation_url || prov.website_url,
          confidence: 1.0,
          verified: true,
          description: `${prov.name} provides and maintains ${r.name}.`
        };
      }).filter(Boolean) as GraphEdge[],
      {
        id: 'rel_agent_prime_fs',
        source: 'agent_droid_prime',
        target: 'tool_fs_scoped',
        relationship_type: 'uses_tool',
        evidence_url: '/api/agents',
        confidence: 1.0,
        verified: true,
        description: 'AI Heaven Droid Prime is authorized to access scoped filesystem.'
      },
      {
        id: 'rel_agent_prime_terminal',
        source: 'agent_droid_prime',
        target: 'tool_terminal_sandbox',
        relationship_type: 'uses_tool',
        evidence_url: '/api/agents',
        confidence: 1.0,
        verified: true,
        description: 'AI Heaven Droid Prime is authorized to execute in sandboxed terminal.'
      },
      {
        id: 'rel_agent_prime_gemini',
        source: 'agent_droid_prime',
        target: 'gemini-api',
        relationship_type: 'accesses',
        evidence_url: 'https://ai.google.dev/gemini-api/docs',
        confidence: 1.0,
        verified: true,
        description: 'AI Heaven Droid Prime accesses Gemini API for multi-turn planning.'
      },
      {
        id: 'rel_tool_mcp_client_protocol',
        source: 'tool_mcp_client',
        target: 'model-context-protocol',
        relationship_type: 'integrates_with',
        evidence_url: 'https://modelcontextprotocol.io',
        confidence: 1.0,
        verified: true,
        description: 'AI Heaven MCP client implements the open Model Context Protocol specification.'
      }
    ];

      return { nodes, edges };
    });
  }

  // ==========================================
  // PHASE 1A: FOUNDATION CLIENT METHODS
  // ==========================================

  public async getCurrentUser(): Promise<User | null> {
    try {
      const res = await fetch(`${this.baseUrl}/users/current`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getProjects(): Promise<Project[]> {
    try {
      const res = await fetch(`${this.baseUrl}/projects`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async createProject(data: { name: string; description?: string; metadata?: Record<string, unknown> }): Promise<Project | null> {
    try {
      const res = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getWorkspaces(projectId?: string): Promise<Workspace[]> {
    try {
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await fetch(`${this.baseUrl}/workspaces${query}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async createWorkspace(data: { project_id: string; name: string; environment_variables?: Record<string, string> }): Promise<Workspace | null> {
    try {
      const res = await fetch(`${this.baseUrl}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getAgents(projectId?: string): Promise<AgentDefinition[]> {
    try {
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await fetch(`${this.baseUrl}/agents${query}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async createAgent(data: {
    project_id: string;
    workspace_id?: string;
    name: string;
    description?: string;
    permissions?: Record<string, unknown>;
  }): Promise<AgentDefinition | null> {
    try {
      const res = await fetch(`${this.baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getTools(): Promise<ToolDefinition[]> {
    return this.fetchWithCache('tools', 30000, async () => {
      try {
        const res = await fetch(`${this.baseUrl}/tools`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) return await res.json();
      } catch {
        // Fallback
      }
      return [];
    });
  }

  public async getAuditEvents(options?: { event_type?: string; project_id?: string; limit?: number }): Promise<AuditEvent[]> {
    try {
      const queryParams = new URLSearchParams();
      if (options?.event_type) queryParams.set('event_type', options.event_type);
      if (options?.project_id) queryParams.set('project_id', options.project_id);
      if (options?.limit) queryParams.set('limit', String(options.limit));

      const res = await fetch(`${this.baseUrl}/audit-events?${queryParams.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent | null> {
    try {
      const res = await fetch(`${this.baseUrl}/audit-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(event)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  // ==========================================
  // PHASE 1B: WORKSPACE FS & SANDBOX METHODS
  // ==========================================

  public async readWorkspaceFile(workspaceId: string, path: string): Promise<FsFileContent | null> {
    try {
      const res = await fetch(`${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/fs/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async writeWorkspaceFile(workspaceId: string, path: string, content: string): Promise<FsFileContent | null> {
    try {
      const res = await fetch(`${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/fs/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async listWorkspaceFiles(workspaceId: string, directoryPath?: string): Promise<FsNodeMetadata[]> {
    try {
      const res = await fetch(`${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/fs/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ directoryPath })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async deleteWorkspaceFile(workspaceId: string, path: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/fs/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ path })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async moveWorkspaceFile(workspaceId: string, sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/fs/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ sourcePath, targetPath })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async submitExecution(data: {
    agent_id: string;
    project_id: string;
    workspace_id: string;
    tool_id: string;
    command: string;
  }): Promise<ExecutionJob | null> {
    try {
      const res = await fetch(`${this.baseUrl}/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getExecutions(options?: { project_id?: string; workspace_id?: string }): Promise<ExecutionJob[]> {
    try {
      const params = new URLSearchParams();
      if (options?.project_id) params.set('project_id', options.project_id);
      if (options?.workspace_id) params.set('workspace_id', options.workspace_id);
      const res = await fetch(`${this.baseUrl}/executions?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async getExecution(executionId: string): Promise<ExecutionJob | null> {
    try {
      const res = await fetch(`${this.baseUrl}/executions/${encodeURIComponent(executionId)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async cancelExecution(executionId: string): Promise<ExecutionJob | null> {
    try {
      const res = await fetch(`${this.baseUrl}/executions/${encodeURIComponent(executionId)}/cancel`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getApprovals(options?: { project_id?: string; status?: string }): Promise<ExecutionApproval[]> {
    try {
      const params = new URLSearchParams();
      if (options?.project_id) params.set('project_id', options.project_id);
      if (options?.status) params.set('status', options.status);
      const res = await fetch(`${this.baseUrl}/approvals?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async decideApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    rejection_reason?: string
  ): Promise<{ approval: ExecutionApproval; job: ExecutionJob } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/approvals/${encodeURIComponent(approvalId)}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ decision, rejection_reason })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  // ==========================================
  // PHASE 1C: AGENT WORKER & TASK METHODS
  // ==========================================

  public async getWorkers(projectId?: string): Promise<AgentWorker[]> {
    try {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await fetch(`${this.baseUrl}/workers${q}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async getWorker(agentId: string): Promise<AgentWorker | null> {
    try {
      const res = await fetch(`${this.baseUrl}/workers/${encodeURIComponent(agentId)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async sendWorkerHeartbeat(agentId: string): Promise<AgentWorker | null> {
    try {
      const res = await fetch(`${this.baseUrl}/workers/${encodeURIComponent(agentId)}/heartbeat`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async createTask(data: {
    agent_id: string;
    project_id: string;
    workspace_id: string;
    goal: string;
    priority?: TaskPriority;
  }): Promise<AgentTask | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getTasks(options?: { project_id?: string; agent_id?: string }): Promise<AgentTask[]> {
    try {
      const params = new URLSearchParams();
      if (options?.project_id) params.set('project_id', options.project_id);
      if (options?.agent_id) params.set('agent_id', options.agent_id);
      const res = await fetch(`${this.baseUrl}/tasks?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async getTask(taskId: string): Promise<AgentTask | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async executeNextAction(taskId: string): Promise<AgentTask | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/execute-next`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async pauseTask(taskId: string): Promise<AgentTask | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/pause`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async resumeTask(taskId: string): Promise<AgentTask | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/resume`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async cancelTask(taskId: string): Promise<AgentTask | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/cancel`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getTaskMemory(taskId: string): Promise<AgentWorkingMemory | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/memory`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getKillSwitch(): Promise<KillSwitchStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/kill-switch`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { is_active: false, triggered_by: '', triggered_at: '', reason: '' };
  }

  public async triggerKillSwitch(scope: KillSwitchScope, targetId?: string, reason?: string): Promise<KillSwitchStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/kill-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ scope, target_id: targetId, reason })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { is_active: true, scope, target_id: targetId, triggered_by: 'local', triggered_at: new Date().toISOString(), reason: reason || '' };
  }

  public async resetKillSwitch(): Promise<KillSwitchStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/kill-switch/reset`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { is_active: false, triggered_by: '', triggered_at: '', reason: '' };
  }

  public async getEvents(options?: { since?: string; task_id?: string; agent_id?: string; limit?: number }): Promise<RuntimeEvent[]> {
    try {
      const params = new URLSearchParams();
      if (options?.since) params.set('since', options.since);
      if (options?.task_id) params.set('task_id', options.task_id);
      if (options?.agent_id) params.set('agent_id', options.agent_id);
      if (options?.limit) params.set('limit', String(options.limit));
      const res = await fetch(`${this.baseUrl}/events?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  public async getTaskReceipt(taskId: string): Promise<ExecutionReceipt | null> {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskId)}/receipt`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getDroidManifest(agentId: string): Promise<DroidManifest | null> {
    try {
      const res = await fetch(`${this.baseUrl}/droids/${encodeURIComponent(agentId)}/manifest`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async getManifests(): Promise<DroidManifest[]> {
    try {
      const res = await fetch(`${this.baseUrl}/manifests`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [];
  }

  // --- Operations & Autonomous Reliability Controls ---

  public async getOperationsOverview(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/operations/overview`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return null;
  }

  public async triggerStateRecovery(): Promise<{ success: boolean; recoveredTasks: number; recoveredWorkers: number }> {
    const res = await fetch(`${this.baseUrl}/operations/recover-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Recovery request failed with HTTP ${res.status}`);
    return await res.json();
  }

  public async resetWorker(agentId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/operations/workers/${encodeURIComponent(agentId)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Worker reset failed with HTTP ${res.status}`);
    return await res.json();
  }

  public async cleanupStaleApprovals(): Promise<{ success: boolean; expiredApprovalsCleaned: number }> {
    const res = await fetch(`${this.baseUrl}/operations/cleanup-stale-approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Cleanup failed with HTTP ${res.status}`);
    return await res.json();
  }

  // --- Review & Quality Assurance Center ---

  public async getReviewLatest(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/review/latest`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to fetch latest review (HTTP ${res.status})`);
    return await res.json();
  }

  public async runReview(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/review/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to trigger review execution (HTTP ${res.status})`);
    return await res.json();
  }

  public async getReviewReports(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/review/reports`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to fetch review reports (HTTP ${res.status})`);
    const data = await res.json();
    return data.reports || [];
  }

  public async getReviewReportById(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/review/reports/${encodeURIComponent(id)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to fetch review report ${id} (HTTP ${res.status})`);
    return await res.json();
  }

  public async getReviewFixes(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/review/fixes`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to fetch review fixes (HTTP ${res.status})`);
    const data = await res.json();
    return data.fixes || [];
  }

  public async applyReviewFix(fixId: string, confirmed: boolean = true): Promise<any> {
    const res = await fetch(`${this.baseUrl}/review/fixes/${encodeURIComponent(fixId)}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ confirmed })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Failed to apply fix ${fixId}`);
    }
    return await res.json();
  }

  public async runReviewTests(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/review/tests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to run automated test runner (HTTP ${res.status})`);
    return await res.json();
  }

  // --- Terminal & Isolated Workspace Execution ---

  public async executeTerminalCommand(data: {
    command: string;
    workspace_id?: string;
    timeout_seconds?: number;
    approved?: boolean;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Terminal execution failed with HTTP ${res.status}`);
    return await res.json();
  }

  public async cancelTerminalExecution(executionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/terminal/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ execution_id: executionId })
    });
    if (!res.ok) throw new Error(`Cancel request failed with HTTP ${res.status}`);
    return await res.json();
  }

  public async getTerminalHistory(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/terminal/history`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  }

  public async getWorkspaceFiles(workspaceId: string = 'ws_default_demo'): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/terminal/workspace/files?workspace_id=${encodeURIComponent(workspaceId)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to list workspace files`);
    const data = await res.json();
    return data.files || [];
  }

  public async readTerminalWorkspaceFile(workspaceId: string = 'ws_default_demo', path: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/terminal/workspace/file?workspace_id=${encodeURIComponent(workspaceId)}&path=${encodeURIComponent(path)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to read file ${path}`);
    return await res.json();
  }

  public async writeTerminalWorkspaceFile(workspaceId: string = 'ws_default_demo', path: string, content: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/terminal/workspace/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, path, content })
    });
    if (!res.ok) throw new Error(`Failed to write file ${path}`);
    return await res.json();
  }

  public async importRepoToWorkspace(owner: string, repo: string, workspaceId: string = 'ws_default_demo'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/terminal/workspace/import-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ owner, repo, workspace_id: workspaceId })
    });
    if (!res.ok) throw new Error(`Failed to import repo ${owner}/${repo}`);
    return await res.json();
  }

  // --- Universal Open-Source Discovery & Knowledge ---

  public async searchDiscovery(query: string = '', source: string = 'all', page: number = 1, perPage: number = 10): Promise<any> {
    const res = await fetch(
      `${this.baseUrl}/discovery/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}&page=${page}&per_page=${perPage}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`Discovery search failed with HTTP ${res.status}`);
    return await res.json();
  }

  public async getRepoDiscoveryDetails(owner: string, repo: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/discovery/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to fetch repo details for ${owner}/${repo}`);
    return await res.json();
  }

  public async getDiscoveryRateLimit(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/discovery/rate-limit`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  }

  public async getLearningGuide(slugOrName: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/learning/guide/${encodeURIComponent(slugOrName)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to fetch learning guide for ${slugOrName}`);
    return await res.json();
  }

  // --- Autonomous Evolution Engine ---

  public async getEvolutionState(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evolution/state`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  }

  public async getEvolutionCandidates(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/evolution/candidates`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates || [];
  }

  public async getEvolutionHistory(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/evolution/history`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  }

  public async runEvolutionExperiment(candidateId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evolution/experiments/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || 'Experiment execution failed');
    }
    return await res.json();
  }

  public async promoteEvolutionCandidate(candidateId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evolution/candidates/${encodeURIComponent(candidateId)}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || 'Promotion failed');
    }
    return await res.json();
  }

  public async rollbackEvolution(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evolution/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || 'Rollback failed');
    }
    return await res.json();
  }

  // --- Central Brain & Multi-Agent Orchestration ---
  public async getBrainModels(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/brain/models`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  public async getBrainDecisions(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/brain/decisions`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.decisions || [];
    } catch {
      return [];
    }
  }

  public async classifyRequest(query: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error(`Classification failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async orchestrateBrainPlan(goal: string, domain?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ goal, domain })
    });
    if (!res.ok) throw new Error(`Orchestration failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async getBrainPlan(planId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/plans/${encodeURIComponent(planId)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  }

  public async advanceBrainPlan(planId: string, subtaskId: string, output?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/plans/${encodeURIComponent(planId)}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ subtaskId, output })
    });
    if (!res.ok) throw new Error(`Advancing plan failed: HTTP ${res.status}`);
    return await res.json();
  }

  // --- Conversations & Persistent Memory ---
  public async getConversations(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/conversations`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch {
      return [];
    }
  }

  public async searchConversations(query: string): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/conversations/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch {
      return [];
    }
  }

  public async updateConversation(id: string, data: {
    title?: string;
    model?: string;
    projectId?: string;
    projectName?: string;
    isAutoRouting?: boolean;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Update conversation failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async deleteConversation(id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    return res.ok;
  }

  public async getProviderStatuses(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/providers/status`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.providers || [];
    } catch {
      return [];
    }
  }

  public async createConversation(title?: string, model?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ title, model })
    });
    if (!res.ok) throw new Error(`Failed to create conversation: HTTP ${res.status}`);
    return await res.json();
  }

  public async getConversationMessages(id: string): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(id)}/messages`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages || [];
    } catch {
      return [];
    }
  }

  public async sendConversationMessage(
    id: string,
    content: string,
    role: string = 'user',
    agentName?: string,
    modelUsed?: string
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ role, content, agentName, modelUsed })
    });
    if (!res.ok) throw new Error(`Failed to send message: HTTP ${res.status}`);
    return await res.json();
  }

  // --- Checkpoints & Resumption ---
  public async getCheckpoints(taskId?: string): Promise<any[]> {
    try {
      const url = taskId ? `${this.baseUrl}/checkpoints?task_id=${encodeURIComponent(taskId)}` : `${this.baseUrl}/checkpoints`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.checkpoints || [];
    } catch {
      return [];
    }
  }

  public async createCheckpoint(taskId: string, title: string, stepIndex: number = 0, snapshot: any = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ taskId, title, stepIndex, snapshot })
    });
    if (!res.ok) throw new Error(`Failed to create checkpoint: HTTP ${res.status}`);
    return await res.json();
  }

  public async restoreCheckpoint(checkpointId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/checkpoints/${encodeURIComponent(checkpointId)}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to restore checkpoint: HTTP ${res.status}`);
    return await res.json();
  }

  // --- Provider Quotas & Accounts ---
  public async getQuotas(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/quotas`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.quotas || [];
    } catch {
      return [];
    }
  }

  public async updateQuota(providerId: string, requests?: number, tokens?: number, hasError?: boolean): Promise<any> {
    const res = await fetch(`${this.baseUrl}/quotas/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ providerId, requests, tokens, hasError })
    });
    if (!res.ok) return null;
    return await res.json();
  }

  public async getGoogleAccounts(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/accounts/google`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return { activeAccount: 'developer-ai-studio@gmail.com', availableAccounts: [] };
      return await res.json();
    } catch {
      return { activeAccount: 'developer-ai-studio@gmail.com', availableAccounts: [] };
    }
  }

  public async switchGoogleAccount(email: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/accounts/google/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error(`Account switch failed: HTTP ${res.status}`);
    return await res.json();
  }
}

export const apiClient = new AIHeavenApiClient();
