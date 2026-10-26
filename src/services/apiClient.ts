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
import {
  AgentReachDoctorReport,
  AgentReachResearchQuery,
  AgentReachResearchResult
} from '../contracts/agentReach';
import {
  GitHubActionsStatus,
  GitHubWorkflow,
  GitHubWorkflowRun,
  GitHubWorkflowJob,
  WorkflowDispatchPayload,
  WorkflowTriggerReceipt,
  GitHubJobLogsResult,
  GitHubRepositorySummary
} from '../contracts/githubActions';
import {
  TurnitoutStatus,
  TurnitoutProcessResult,
  TurnitoutAnalysisResult,
  TurnitoutProcessOptions
} from '../types/turnitout';
import { Capacitor } from '@capacitor/core';

export interface BackendStatus {
  connected: boolean;
  baseUrl: string;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

export const DEPLOYED_PRODUCTION_API_URL = 'https://ais-dev-3akprr5cwy775swhpvqbqo-355977231344.asia-southeast1.run.app/api';

export function resolveEffectiveApiBaseUrl(): string {
  // 1. Explicit Vite client-side environment variable (e.g. VITE_API_URL)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    const raw = String(import.meta.env.VITE_API_URL).trim();
    if (raw) {
      return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
    }
  }

  // 2. Window-injected configuration override
  if (typeof window !== 'undefined' && (window as any).__AI_HEAVEN_API_URL__) {
    const raw = String((window as any).__AI_HEAVEN_API_URL__).trim();
    if (raw) {
      return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
    }
  }

  // 3. Native Android / iOS container: NEVER use localhost on physical device
  const isNative = typeof window !== 'undefined' && (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.protocol === 'https:' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && Boolean((window as any)?.Capacitor?.isPluginAvailable))
  );

  if (isNative) {
    return DEPLOYED_PRODUCTION_API_URL;
  }

  // 4. In web browser environment: relative '/api' proxies to host
  return '/api';
}

const API_BASE_URL = resolveEffectiveApiBaseUrl();

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
    this.baseUrl = resolveEffectiveApiBaseUrl().replace(/\/$/, '');
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

  public async getDatabaseStatus(): Promise<{
    configured: boolean;
    status: string;
    mode?: string;
    health?: any;
    migrations?: any;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/database/status`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      return await response.json();
    } catch (err: any) {
      return {
        configured: false,
        status: 'UNREACHABLE',
        message: err.message || 'Database status endpoint unreachable'
      };
    }
  }

  // --- Infisical Secret Manager ---
  public async getInfisicalStatus(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/security/infisical/status`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'unreachable', error: err.message };
    }
  }

  public async getInfisicalSecrets(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/security/infisical/secrets`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' }),
        signal: AbortSignal.timeout(4000)
      });
      return await res.json();
    } catch (err: any) {
      return { count: 0, secrets: [], error: err.message };
    }
  }

  // --- Policy Guard ---
  public async evaluatePolicyGuard(request: {
    agentId?: string;
    agentRole: string;
    actionType: string;
    targetResource: string;
    parameters?: Record<string, any>;
  }): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/security/policy-guard/evaluate`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(4000)
      });
      return await res.json();
    } catch (err: any) {
      return { decision: 'denied', reason: err.message, isCompliant: false };
    }
  }

  public async getPolicyGuardRules(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/security/policy-guard/rules`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      const data = await res.json();
      return data.rules || [];
    } catch {
      return [];
    }
  }

  // --- Model Context Protocol (MCP) ---
  public async getMCPStatus(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/mcp/status`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'unreachable', error: err.message };
    }
  }

  public async getMCPServers(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/mcp/servers`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      const data = await res.json();
      return data.servers || [];
    } catch {
      return [];
    }
  }

  public async getMCPTools(serverId?: string): Promise<any[]> {
    try {
      const url = serverId ? `${this.baseUrl}/mcp/tools?serverId=${encodeURIComponent(serverId)}` : `${this.baseUrl}/mcp/tools`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      const data = await res.json();
      return data.tools || [];
    } catch {
      return [];
    }
  }

  public async callMCPTool(serverId: string, toolName: string, args: Record<string, any> = {}): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/mcp/call`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ serverId, toolName, arguments: args }),
        signal: AbortSignal.timeout(10000)
      });
      return await res.json();
    } catch (err: any) {
      return { isError: true, content: [{ type: 'text', text: err.message }] };
    }
  }

  // --- Browser Automation ---
  public async getBrowserStatus(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/browser/status`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      return await res.json();
    } catch (err: any) {
      return { status: 'unreachable', error: err.message };
    }
  }

  public async navigateBrowser(options: { url: string; timeoutMs?: number; extractLinks?: boolean; extractMetadata?: boolean }): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/browser/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
        signal: AbortSignal.timeout(options.timeoutMs || 12000)
      });
      return await res.json();
    } catch (err: any) {
      return { error: err.message };
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

  public async getBrainProviderStatuses(): Promise<any[]> {
    return this.getProviderStatuses();
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

  public async chatInConversation(id: string, content: string, model?: string): Promise<{
    userMessage: any;
    assistantMessage: any;
    decision: any;
    isLiveProvider: boolean;
  }> {
    const res = await fetch(`${this.baseUrl}/conversations/${encodeURIComponent(id)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ content, model })
    });
    if (!res.ok) throw new Error(`Chat processing failed: HTTP ${res.status}`);
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

  // --- Continuity & Intelligence Engine ---
  public async getContinuityDashboard(tenantId?: string, projectId?: string): Promise<any> {
    try {
      const q = new URLSearchParams();
      if (tenantId) q.set('tenant_id', tenantId);
      if (projectId) q.set('project_id', projectId);
      const res = await fetch(`${this.baseUrl}/continuity/dashboard?${q.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async queryEngineeringMemories(params: {
    tenantId?: string;
    projectId?: string | null;
    domain?: string;
    category?: string;
    status?: string;
    search?: string;
    includeGlobal?: boolean;
  } = {}): Promise<any[]> {
    try {
      const q = new URLSearchParams();
      if (params.tenantId) q.set('tenant_id', params.tenantId);
      if (params.projectId !== undefined && params.projectId !== null) q.set('project_id', params.projectId);
      if (params.domain) q.set('domain', params.domain);
      if (params.category) q.set('category', params.category);
      if (params.status) q.set('status', params.status);
      if (params.search) q.set('q', params.search);
      if (params.includeGlobal === false) q.set('include_global', 'false');

      const res = await fetch(`${this.baseUrl}/continuity/memories?${q.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.memories || [];
    } catch {
      return [];
    }
  }

  public async createEngineeringMemory(memory: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(memory)
    });
    if (!res.ok) throw new Error(`Failed to store memory: HTTP ${res.status}`);
    return await res.json();
  }

  public async updateEngineeringMemory(id: string, updates: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/memories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Failed to update memory: HTTP ${res.status}`);
    return await res.json();
  }

  public async deleteEngineeringMemory(id: string, tenantId?: string): Promise<boolean> {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    const res = await fetch(`${this.baseUrl}/continuity/memories/${encodeURIComponent(id)}${q}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    return res.ok;
  }

  public async revalidateEngineeringMemory(id: string, newStatus: string, reason: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/memories/${encodeURIComponent(id)}/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ newStatus, reason })
    });
    if (!res.ok) throw new Error(`Failed to revalidate memory: HTTP ${res.status}`);
    return await res.json();
  }

  public async promoteMemoryToGlobal(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/memories/${encodeURIComponent(id)}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Failed to promote memory: HTTP ${res.status}`);
    return await res.json();
  }

  public async getStaleAndConflictingKnowledge(projectId?: string): Promise<any[]> {
    try {
      const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
      const res = await fetch(`${this.baseUrl}/continuity/stale-conflicts${q}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.anomalies || [];
    } catch {
      return [];
    }
  }

  public async getModelTrends(modelId?: string): Promise<any[]> {
    try {
      const q = modelId ? `?model_id=${encodeURIComponent(modelId)}` : '';
      const res = await fetch(`${this.baseUrl}/continuity/trends${q}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.trends || [];
    } catch {
      return [];
    }
  }

  public async prepareTaskResurrection(taskId: string, checkpointId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/resurrect/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ taskId, checkpointId })
    });
    if (!res.ok) throw new Error(`Failed to prepare resurrection: HTTP ${res.status}`);
    return await res.json();
  }

  public async executeTaskResurrection(taskId: string, checkpointId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/resurrect/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ taskId, checkpointId })
    });
    if (!res.ok) throw new Error(`Failed to execute resurrection: HTTP ${res.status}`);
    return await res.json();
  }

  public async learnFromCompletedTask(task: any, testResults?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/continuity/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ task, testResults })
    });
    if (!res.ok) return null;
    return await res.json();
  }

  // ==========================================
  // AUTHENTICATION & MULTI-PROVIDER METHODS
  // ==========================================

  private authToken: string | null = null;

  public setAuthToken(token: string | null): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('aiheaven_auth_token', token);
      else localStorage.removeItem('aiheaven_auth_token');
    }
  }

  public getAuthToken(): string | null {
    if (!this.authToken && typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('aiheaven_auth_token');
    }
    return this.authToken;
  }

  private getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = this.getAuthToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  }

  public async getAuthProviders(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/providers`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.providers || [];
    } catch {
      return [];
    }
  }

  public async registerAccount(email: string, password: string, fullName: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    if (data.accessToken) this.setAuthToken(data.accessToken);
    return data;
  }

  public async loginWithPassword(email: string, password: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    if (data.accessToken) this.setAuthToken(data.accessToken);
    return data;
  }

  public async loginWithOAuth(
    provider: string,
    providerUserId: string,
    email: string,
    fullName?: string,
    avatarUrl?: string
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ provider, providerUserId, email, fullName, avatarUrl })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OAuth sign-in failed');
    if (data.accessToken) this.setAuthToken(data.accessToken);
    return data;
  }

  public async getAuthCurrentUser(): Promise<any> {
    const token = this.getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.baseUrl}/auth/me`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async getAllUsersForSwitcher(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/users`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.users || [];
    } catch {
      return [];
    }
  }

  public async switchAccount(targetUserId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/switch`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ targetUserId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Account switch failed');
    if (data.accessToken) this.setAuthToken(data.accessToken);
    return data;
  }

  public async linkAccount(provider: string, providerUserId: string, email?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/link`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ provider, providerUserId, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Account linking failed');
    return data;
  }

  public async unlinkAccount(provider: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/unlink`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ provider })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Account unlinking failed');
    return data;
  }

  public async logoutAuth(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
    } catch {
      // Best effort
    }
    this.setAuthToken(null);
  }

  // ==========================================
  // UNIFIED SECURITY CENTER METHODS (DRAUGR, DEFECTDOJO, SCORECARD)
  // ==========================================

  public async getSecurityPosture(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-center/posture`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Failed to load security posture: HTTP ${res.status}`);
    return await res.json();
  }

  public async getScorecardReport(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-center/scorecard`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Failed to load scorecard: HTTP ${res.status}`);
    return await res.json();
  }

  public async runSecurityCenterScan(scannerId: string, targetScope: any, parameters?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-center/scan`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ scannerId, targetScope, parameters })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Scan failed: HTTP ${res.status}`);
    return data;
  }

  public async updateFindingRemediation(
    findingId: string,
    status: string,
    metadata?: { justification?: string; rationale?: string; expiresAt?: string }
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-center/findings/${findingId}/remediate`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ status, ...metadata })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Update failed: HTTP ${res.status}`);
    return data;
  }

  public async exportSecuritySarif(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-center/draugr/sarif`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Export SARIF failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async exportDefectDojoPayload(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-center/defectdojo/export`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Export DefectDojo failed: HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // AUTONOMOUS BUG-BOUNTY PLATFORM METHODS
  // ==========================================

  public async getBugHuntWorkspace(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/workspace`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Failed to load bug hunt workspace: HTTP ${res.status}`);
    return await res.json();
  }

  public async getBugHuntPrograms(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/bughunt/programs`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.programs || [];
    } catch {
      return [];
    }
  }

  public async getBugHuntDroids(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/bughunt/droids`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.droids || [];
    } catch {
      return [];
    }
  }

  public async getBugHuntFindings(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/bughunt/findings`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.findings || [];
    } catch {
      return [];
    }
  }

  public async updateFindingStatus(findingId: string, status: string, notes?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/findings/${encodeURIComponent(findingId)}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ status, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update finding status');
    return data;
  }

  public async submitFindingToHackerOne(findingId: string, programHandle?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/findings/${encodeURIComponent(findingId)}/submit-hackerone`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ programHandle })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit finding to HackerOne');
    return data;
  }

  public async getBugHuntJob(huntId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/hunts/${encodeURIComponent(huntId)}`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to load hunt job: HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async startAutonomousBugHunt(programId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/start`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ programId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start autonomous bug hunt');
    return data;
  }

  public async startCustomBugHunt(title: string, config: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/custom`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ title, config })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start custom bug hunt');
    return data;
  }

  public async verifyTargetScope(target: string, programId?: string): Promise<{ authorized: boolean; reason?: string }> {
    const res = await fetch(`${this.baseUrl}/bughunt/verify-scope`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ target, programId })
    });
    if (!res.ok) return { authorized: false, reason: 'Failed to verify scope' };
    return await res.json();
  }

  public async cancelBugHunt(huntId: string, reason?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ huntId, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel bug hunt');
    return data;
  }

  public async resumeBugHunt(huntId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/resume`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ huntId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resume bug hunt');
    return data;
  }

  public async getHackerOneStatus(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/bughunt/hackerone/status`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async getHackerOnePrograms(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/bughunt/hackerone/programs`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.programs || [];
    } catch {
      return [];
    }
  }

  public async captureScopeSnapshot(programHandle?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/bughunt/hackerone/snapshot`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ programHandle })
    });
    if (!res.ok) throw new Error('Failed to capture scope snapshot');
    return await res.json();
  }

  public async requestEmailVerification(email: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/request-verification`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request verification');
    return data;
  }

  public async verifyEmail(token: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email verification failed');
    return data;
  }

  public async requestPasswordReset(email: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/request-reset`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
    return data;
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/confirm-reset`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password reset failed');
    return data;
  }

  public async generateOAuthState(provider: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/oauth-state`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ provider })
    });
    const data = await res.json();
    return data.state;
  }

  // --- Unified Reality & Capability Registry ---
  public async getRealityRegistry(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/reality/registry`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.capabilities || [];
    } catch {
      return [];
    }
  }

  public async getCredentialAudit(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/reality/credentials`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.credentials || [];
    } catch {
      return [];
    }
  }

  public async verifyCapability(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/reality/verify/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Verification failed: HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // FOUR BEASTS & AUTONOMOUS REALITY REPAIR
  // ==========================================
  public async getEngines(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/engines`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  public async executeEngineTask(engineId: string, goal: string, context?: any, dryRun?: boolean): Promise<any> {
    const res = await fetch(`${this.baseUrl}/engines/${encodeURIComponent(engineId)}/execute`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ goal, context, dryRun })
    });
    if (!res.ok) throw new Error(`Engine execution failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async getRealityIssues(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/reality/issues`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  public async getRealityMetrics(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/reality/metrics`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async runRealityAudit(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/reality/audit/run`, {
      method: 'POST',
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Audit failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async repairRealityIssue(issueId: string, approved?: boolean): Promise<any> {
    const res = await fetch(`${this.baseUrl}/reality/repair`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ issueId, approved })
    });
    if (!res.ok) throw new Error(`Repair failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async setRealityKillSwitch(active: boolean): Promise<any> {
    const res = await fetch(`${this.baseUrl}/reality/killswitch`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ active })
    });
    if (!res.ok) throw new Error(`Kill switch update failed: HTTP ${res.status}`);
    return await res.json();
  }

  // =========================================================================
  // 35. FIVE REPOSITORIES INTEGRATION: SECURITY AUDIT & TEMPORAL
  // =========================================================================

  public async getSecurityAuditStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-audit/status`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async runSecurityScan(scannerId: string, targetScope: any, parameters?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security-audit/run`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ scannerId, targetScope, parameters })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Scan failed: HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async getSecurityFindings(filter?: { scannerId?: string; status?: string; minSeverity?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filter?.scannerId) params.append('scannerId', filter.scannerId);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.minSeverity) params.append('minSeverity', filter.minSeverity);

    const res = await fetch(`${this.baseUrl}/security-audit/findings?${params.toString()}`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async exportSecurityReport(format: 'json' | 'markdown' = 'json'): Promise<string> {
    const res = await fetch(`${this.baseUrl}/security-audit/export?format=${format}`, {
      headers: this.getAuthHeaders({ Accept: format === 'markdown' ? 'text/markdown' : 'application/json' })
    });
    if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
    return await res.text();
  }

  public async getTemporalStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/temporal/status`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getWorkflows(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/workflows`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async startWorkflow(workflowType: string, input: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/workflows`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ workflowType, input })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // =========================================================================
  // AGENT REACH INTERNET RESEARCH METHODS
  // =========================================================================

  public async getAgentReachStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/agent-reach/status`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getAgentReachDoctor(): Promise<AgentReachDoctorReport> {
    const res = await fetch(`${this.baseUrl}/agent-reach/doctor`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async executeAgentReachResearch(params: AgentReachResearchQuery): Promise<AgentReachResearchResult> {
    const res = await fetch(`${this.baseUrl}/agent-reach/research`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async getAgentReachHistory(): Promise<{ history: AgentReachResearchResult[] }> {
    const res = await fetch(`${this.baseUrl}/agent-reach/history`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async testAgentReachPlatform(platform: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const res = await fetch(`${this.baseUrl}/agent-reach/test`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ platform })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async configureAgentReach(configPatch: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/agent-reach/configure`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(configPatch)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // =========================================================================
  // Turnitout Document Refiner Client Methods
  // =========================================================================

  public async getTurnitoutStatus(): Promise<TurnitoutStatus> {
    const res = await fetch(`${this.baseUrl}/research/turnitout/status`, {
      headers: this.getAuthHeaders({ Accept: 'application/json' })
    });
    if (!res.ok) throw new Error(`Turnitout status failed: HTTP ${res.status}`);
    return await res.json();
  }

  public async getTurnitoutTaxonomies(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/research/turnitout/taxonomies`, {
        headers: this.getAuthHeaders({ Accept: 'application/json' })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.taxonomies || [];
    } catch {
      return [];
    }
  }

  public async analyzeTurnitoutDocument(text: string): Promise<TurnitoutAnalysisResult> {
    const res = await fetch(`${this.baseUrl}/research/turnitout/analyze`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Analysis failed: HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async processTurnitoutDocument(options: TurnitoutProcessOptions & { text: string }): Promise<TurnitoutProcessResult> {
    const res = await fetch(`${this.baseUrl}/research/turnitout/process`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(options)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Processing failed: HTTP ${res.status}`);
    }
    return await res.json();
  }

  // =========================================================================
  // GitHub Actions Client Methods
  // =========================================================================

  public async getGitHubActionsStatus(tokenOverride?: string): Promise<GitHubActionsStatus> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(`${this.baseUrl}/github/actions/status`, {
      headers: this.getAuthHeaders(headers)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async configureGitHubActionsToken(token: string): Promise<GitHubActionsStatus> {
    const res = await fetch(`${this.baseUrl}/github/actions/config`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ token })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async listGitHubAccessibleRepos(tokenOverride?: string): Promise<GitHubRepositorySummary[]> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(`${this.baseUrl}/github/actions/repos`, {
      headers: this.getAuthHeaders(headers)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async listGitHubWorkflows(owner: string, repo: string, tokenOverride?: string): Promise<GitHubWorkflow[]> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(`${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/workflows`, {
      headers: this.getAuthHeaders(headers)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data.workflows) ? data.workflows : [];
  }

  public async getGitHubWorkflowRuns(
    owner: string,
    repo: string,
    query?: { workflowId?: string | number; status?: string; branch?: string; per_page?: number; page?: number },
    tokenOverride?: string
  ): Promise<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const params = new URLSearchParams();
    if (query?.workflowId) params.set('workflow_id', String(query.workflowId));
    if (query?.status) params.set('status', query.status);
    if (query?.branch) params.set('branch', query.branch);
    if (query?.per_page) params.set('per_page', String(query.per_page));
    if (query?.page) params.set('page', String(query.page));

    const res = await fetch(`${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/runs?${params.toString()}`, {
      headers: this.getAuthHeaders(headers)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async getGitHubWorkflowRun(
    owner: string,
    repo: string,
    runId: number | string,
    tokenOverride?: string
  ): Promise<GitHubWorkflowRun> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(`${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/runs/${encodeURIComponent(String(runId))}`, {
      headers: this.getAuthHeaders(headers)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getGitHubRunJobs(
    owner: string,
    repo: string,
    runId: number | string,
    tokenOverride?: string
  ): Promise<GitHubWorkflowJob[]> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(`${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/runs/${encodeURIComponent(String(runId))}/jobs`, {
      headers: this.getAuthHeaders(headers)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.jobs) ? data.jobs : [];
  }

  public async triggerGitHubWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: string | number,
    payload: WorkflowDispatchPayload,
    tokenOverride?: string
  ): Promise<WorkflowTriggerReceipt> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(
      `${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/workflows/${encodeURIComponent(String(workflowId))}/dispatch`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(headers),
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async cancelGitHubWorkflowRun(
    owner: string,
    repo: string,
    runId: number | string,
    tokenOverride?: string
  ): Promise<{ success: boolean; message: string; evidenceChecksum: string }> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(
      `${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/runs/${encodeURIComponent(String(runId))}/cancel`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(headers)
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async rerunGitHubWorkflowRun(
    owner: string,
    repo: string,
    runId: number | string,
    tokenOverride?: string
  ): Promise<{ success: boolean; message: string; evidenceChecksum: string }> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(
      `${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/runs/${encodeURIComponent(String(runId))}/rerun`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(headers)
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async getGitHubJobLogs(
    owner: string,
    repo: string,
    jobId: number | string,
    tokenOverride?: string
  ): Promise<GitHubJobLogsResult> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokenOverride) headers['x-github-token'] = tokenOverride;
    const res = await fetch(
      `${this.baseUrl}/github/actions/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/jobs/${encodeURIComponent(String(jobId))}/logs`,
      {
        headers: this.getAuthHeaders(headers)
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  // --- Edge0 Local Inference Engine ---
  public async getEdge0Status(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/edge0/status`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async configureEdge0(params: {
    endpoint?: string;
    timeoutMs?: number;
    localOnlyMode?: boolean;
    allowCloudFallback?: boolean;
    preferredModel?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/edge0/configure`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async testEdge0Connection(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/edge0/test-connection`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async getEdge0Models(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/edge0/models`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getEdge0AndroidCompatibility(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/edge0/android-compatibility`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // --- ComfyUI Visual AI Workflow Engine ---
  public async getComfyUIStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/status`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async configureComfyUI(params: {
    endpoint?: string;
    timeoutMs?: number;
    clientId?: string;
    allowCloudFallback?: boolean;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/configure`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async testComfyUIConnection(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/test-connection`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async getComfyUIQueue(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/queue`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async interruptComfyUI(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/interrupt`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getComfyUIHistory(promptId?: string): Promise<any> {
    const q = promptId ? `?promptId=${encodeURIComponent(promptId)}` : '';
    const res = await fetch(`${this.baseUrl}/comfyui/history${q}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getComfyUITemplates(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/templates`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async saveComfyUITemplate(template: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/templates`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(template)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async executeComfyUIWorkflow(params: {
    prompt?: any;
    templateId?: string;
    params?: any;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/comfyui/execute`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  // ==========================================
  // MISSION CONTROL NAI (builderz-labs/mission-control)
  // ==========================================
  public async getMissionControlOverview(tenantId?: string): Promise<any> {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const res = await fetch(`${this.baseUrl}/operations/mission-control/overview${q}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async dispatchMissionControlTask(agentId: string, goal: string, tenantId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/operations/mission-control/dispatch`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ agentId, goal, tenantId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // OMA - OPEN MULTI-AGENT (open-multi-agent/open-multi-agent)
  // ==========================================
  public async createOMARun(goal: string, tenantId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/workflow/oma/run`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ goal, tenantId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getOMARun(runId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/workflow/oma/run/${encodeURIComponent(runId)}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async advanceOMANode(runId: string, nodeId: string, result?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/workflow/oma/run/${encodeURIComponent(runId)}/advance`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ nodeId, result })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async approveOMANode(runId: string, nodeId: string, approvedBy?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/workflow/oma/run/${encodeURIComponent(runId)}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ nodeId, approvedBy })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async verifyOMARun(runId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/workflow/oma/run/${encodeURIComponent(runId)}/verify`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // AGENTLENS (agentkitai/agentlens)
  // ==========================================
  public async getAgentLensFlights(tenantId?: string): Promise<any> {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const res = await fetch(`${this.baseUrl}/observability/agent-lens/flights${q}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getAgentLensFlight(flightId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/observability/agent-lens/flight/${encodeURIComponent(flightId)}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async startAgentLensFlight(taskId: string, goal: string, tenantId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/observability/agent-lens/flight`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ taskId, goal, tenantId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // AGENTGATE (agentkitai/agentgate)
  // ==========================================
  public async evaluateAgentGate(payload: {
    agentId: string;
    toolId: string;
    commandOrPayload: string;
    parameters?: Record<string, unknown>;
    tenantId?: string;
    projectId?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security/agent-gate/evaluate`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getAgentGatePolicies(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/security/agent-gate/policies`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // THINKLESS (VainF/Thinkless)
  // ==========================================
  public async evaluateThinkLessBudget(query: string, domain?: string, complexity?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/decision/thinkless`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ query, domain, complexity })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // THALAMUS & DECISION BACKENDS (cobaltcore-dev/Thalamus, NandhaKishorM/laya, fastino-ai/GLiNER2)
  // ==========================================
  public async routeThalamusDecision(text: string, candidateLabels: string[], parameters?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/decision/thalamus`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, candidateLabels, parameters })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getDecisionBackendsStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/brain/decision/backends/status`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // LAZYCODEX HIERARCHICAL MEMORY (code-yeongyu/lazycodex)
  // ==========================================
  public async getHierarchicalInstructions(path?: string): Promise<any> {
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    const res = await fetch(`${this.baseUrl}/memory/hierarchical/instructions${q}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getHierarchicalLandmarks(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/memory/hierarchical/landmarks`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // AGENT SWARM (openai/swarm pattern)
  // ==========================================
  public async executeSwarmRun(payload: {
    prompt: string;
    initialAgentId?: string;
    contextVariables?: Record<string, unknown>;
    maxHandoffs?: number;
    tenantId?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/swarm/run`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getSwarmAgents(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/swarm/agents`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // OPENWOP (openwop/openwop, openwop.dev)
  // ==========================================
  public async createOpenWOPRun(workflowName: string, inputs?: Record<string, unknown>, tenantId?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wop/v1/runs`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ workflowName, inputs, tenantId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getOpenWOPRun(runId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wop/v1/runs/${encodeURIComponent(runId)}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async advanceOpenWOPRun(runId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wop/v1/runs/${encodeURIComponent(runId)}/advance`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async approveOpenWOPRun(runId: string, approved: boolean, actor?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wop/v1/runs/${encodeURIComponent(runId)}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ approved, actor })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async replayOpenWOPRun(runId: string, checkpointId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wop/v1/runs/${encodeURIComponent(runId)}/replay`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ checkpointId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getOpenWOPEvents(runId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wop/v1/runs/${encodeURIComponent(runId)}/events`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // OMA (open-multi-agent) LIST RUNS
  // ==========================================
  public async listOMARuns(tenantId?: string): Promise<any> {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const res = await fetch(`${this.baseUrl}/workflow/oma/runs${q}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // AMA-BENCH (AMA-Bench/AMA-Hub)
  // ==========================================
  public async evaluateAMABench(payload: { domain: string; trajectory: any[]; queries: any[] }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/benchmark/ama-bench/evaluate`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getAMABenchTestCases(domain?: string): Promise<any> {
    const q = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    const res = await fetch(`${this.baseUrl}/benchmark/ama-bench/test-cases${q}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // ==========================================
  // POLOS (polos-dev/polos)
  // ==========================================
  public async createPolosSession(options: { agentId?: string; tenantId?: string; maxRetries?: number }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/runtime/polos/session`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(options)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async listPolosSessions(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/runtime/polos/sessions`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getPolosSession(sessionId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/runtime/polos/session/${encodeURIComponent(sessionId)}`, {
      headers: this.getAuthHeaders({ 'Accept': 'application/json' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
}

export const apiClient = new AIHeavenApiClient();
