/**
 * AI HEAVEN - Full-Stack Express Server
 * Serves real REST API endpoints (/api/*) and mounts Vite SPA middlewares on port 3000.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { RESOURCES, PROVIDERS, RELATIONSHIPS } from './src/data/database.ts';
import { googleAISourceConnector } from './src/services/connectors/googleAIConnector.ts';
import { gitHubSourceConnector } from './src/services/connectors/githubConnector.ts';
import { mcpSourceConnector } from './src/services/connectors/mcpConnector.ts';
import {
  User,
  Project,
  Workspace,
  AgentDefinition,
  ToolDefinition,
  AuditEvent
} from './src/types/foundation.ts';
import { workspaceFilesystem } from './src/services/sandbox/workspaceFs.ts';
import { executionManager } from './src/services/sandbox/executionManager.ts';
import { agentRuntimeService } from './src/services/sandbox/agentRuntimeService.ts';

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

// Internal Server Configuration
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'ai_heaven_production_insecure_default_key_change_in_prod';
const DATABASE_URL = process.env.DATABASE_URL;

// HS256 JWT utilities for token issuance and validation
function signJwt(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string, secret: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// In-memory runtime database initialized with authoritative records
let currentResources = [...RESOURCES];
let currentRelationships = [...RELATIONSHIPS];

// Phase 1A Foundation State
const currentUser: User = {
  id: 'usr_dev_default_01',
  email: 'developer@aiheaven.local',
  role: 'admin',
  is_active: true,
  profile: {
    full_name: 'AI Heaven Platform Engineer',
    organization: 'AI Heaven Core',
    preferences: { theme: 'dark', terminal_font: 'JetBrains Mono' }
  },
  identities: [
    {
      provider: 'local',
      provider_user_id: 'usr_dev_default_01',
      email: 'developer@aiheaven.local',
      last_authenticated_at: new Date().toISOString()
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultProject: Project = {
  id: 'proj_ai_heaven_core',
  owner_id: currentUser.id,
  name: 'AI Heaven Core Platform',
  description: 'Primary platform engineering workspace for autonomous agent workflows and sandboxed execution.',
  status: 'active',
  metadata: { environment: 'sandbox', isolation_level: 'strict' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultWorkspace: Workspace = {
  id: 'ws_default_sandbox',
  project_id: defaultProject.id,
  owner_id: currentUser.id,
  name: 'Sandbox Runtime Alpha',
  filesystem_ref: '/var/aiheaven/workspaces/ws_default_sandbox',
  status: 'ready',
  environment_variables: { NODE_ENV: 'sandbox', AI_ISOLATION: 'active' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultAgent: AgentDefinition = {
  id: 'agent_droid_prime',
  owner_id: currentUser.id,
  project_id: defaultProject.id,
  workspace_id: defaultWorkspace.id,
  name: 'AI Heaven Droid Prime',
  description: 'Autonomous platform engineering worker equipped with sandboxed terminal, scoped filesystem, and MCP inspection capabilities.',
  status: 'idle',
  permissions: {
    allowed_tools: ['tool_terminal_sandbox', 'tool_fs_scoped', 'tool_mcp_client', 'tool_github_sync'],
    network_access: true,
    filesystem_scope: 'workspace_only',
    requires_approval_for_destructive: true
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

let projects: Project[] = [defaultProject];
let workspaces: Workspace[] = [defaultWorkspace];
let agents: AgentDefinition[] = [defaultAgent];

workspaceFilesystem.ensureWorkspaceInitialized(defaultWorkspace.id);
agentRuntimeService.setPersistencePath(path.resolve(process.cwd(), 'data', 'runtime-state.json'));
agentRuntimeService.registerWorker(defaultAgent);
const registeredTools: ToolDefinition[] = [
  {
    id: 'tool_terminal_sandbox',
    name: 'Sandboxed Terminal Execution',
    provider: 'prov_ai_heaven',
    description: 'Executes shell commands strictly inside isolated container environment with resource limits.',
    capability: 'terminal',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command string to execute in workspace root.' }
      },
      required: ['command']
    },
    output_schema: {
      type: 'object',
      properties: {
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        exit_code: { type: 'integer' }
      }
    },
    permissions: ['sandbox:exec', 'fs:workspace_write'],
    permission_requirements: ['sandbox:exec'],
    risk_level: 'medium',
    authentication_requirements: {
      type: 'none',
      required: false,
      description: 'Internal sandbox execution boundary'
    },
    availability: 'ready',
    provenance: {
      source_provider: 'AI Heaven Core Platform',
      author: 'Autonomous Systems Lab',
      verified: true,
      registered_at: '2026-09-01T00:00:00Z',
      spec_url: 'https://aiheaven.dev/docs/tools/terminal-sandbox'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 60,
      requires_confirmation: false,
      max_output_bytes: 1048576
    },
    is_enabled: true
  },
  {
    id: 'tool_fs_scoped',
    name: 'Scoped Filesystem Access',
    provider: 'prov_ai_heaven',
    description: 'Read/write operations restricted strictly to workspace root path without host traversal.',
    capability: 'filesystem',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path inside workspace directory' },
        content: { type: 'string', description: 'File content for write operations' }
      },
      required: ['path']
    },
    output_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        size_bytes: { type: 'integer' },
        content: { type: 'string' }
      }
    },
    permissions: ['fs:workspace_read', 'fs:workspace_write'],
    permission_requirements: ['fs:workspace_write'],
    risk_level: 'low',
    authentication_requirements: {
      type: 'none',
      required: false,
      description: 'Workspace scoped security boundary'
    },
    availability: 'ready',
    provenance: {
      source_provider: 'AI Heaven Core Platform',
      author: 'Autonomous Systems Lab',
      verified: true,
      registered_at: '2026-09-01T00:00:00Z',
      spec_url: 'https://aiheaven.dev/docs/tools/fs-scoped'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 15,
      requires_confirmation: false,
      max_output_bytes: 10485760
    },
    is_enabled: true
  },
  {
    id: 'tool_mcp_client',
    name: 'MCP Server Connector',
    provider: 'prov_github',
    description: 'JSON-RPC client for interacting with verified Model Context Protocol tools and servers.',
    capability: 'mcp',
    input_schema: {
      type: 'object',
      properties: {
        method: { type: 'string', description: 'MCP JSON-RPC method name' },
        params: { type: 'object', description: 'Method arguments' }
      },
      required: ['method']
    },
    output_schema: {
      type: 'object',
      properties: {
        result: { type: 'object' },
        error: { type: 'object' }
      }
    },
    permissions: ['mcp:call', 'network:outbound'],
    permission_requirements: ['mcp:call'],
    risk_level: 'medium',
    authentication_requirements: {
      type: 'bearer',
      required: false,
      header_or_param: 'Authorization',
      description: 'Optional server token'
    },
    availability: 'ready',
    provenance: {
      source_provider: 'Model Context Protocol Community',
      author: 'Anthropic & Contributors',
      verified: true,
      registered_at: '2026-09-15T00:00:00Z',
      spec_url: 'https://modelcontextprotocol.io'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 30,
      requires_confirmation: false,
      max_output_bytes: 2097152
    },
    is_enabled: true
  },
  {
    id: 'tool_github_sync',
    name: 'GitHub Repository Sync',
    provider: 'prov_github',
    description: 'Syncs metadata and code trees from verified GitHub repositories with read-only scope.',
    capability: 'github',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Owner/repo format string' },
        branch: { type: 'string', description: 'Branch or tag reference' }
      },
      required: ['repo']
    },
    output_schema: {
      type: 'object',
      properties: {
        commit_hash: { type: 'string' },
        files_synced: { type: 'integer' }
      }
    },
    permissions: ['git:read', 'network:outbound'],
    permission_requirements: ['git:read'],
    risk_level: 'low',
    authentication_requirements: {
      type: 'bearer',
      required: false,
      header_or_param: 'GITHUB_TOKEN',
      description: 'GitHub Personal Access Token for private repos'
    },
    availability: 'ready',
    provenance: {
      source_provider: 'GitHub Inc.',
      author: 'AI Heaven Integration Team',
      verified: true,
      registered_at: '2026-09-10T00:00:00Z',
      spec_url: 'https://docs.github.com/rest'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 45,
      requires_confirmation: false,
      max_output_bytes: 2097152
    },
    is_enabled: true
  }
];

let auditEvents: AuditEvent[] = [];

function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const newEvent: AuditEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    correlation_id: event.correlation_id || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  auditEvents.unshift(newEvent);
  return newEvent;
}

// Connect execution state machine to immutable audit log stream
executionManager.setAuditLogger((event) => {
  logAuditEvent(event);
});
agentRuntimeService.setAuditLogger((event) => {
  logAuditEvent(event);
});

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json());

  // Security headers middleware
  app.use((req: Request, res: Response, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Controlled CORS for API routes
    const origin = req.headers.origin;
    const configuredOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'https://ais-dev-zrhpytvpqxxvopx2vzwyfz-959964077611.asia-southeast1.run.app',
          'https://ais-pre-zrhpytvpqxxvopx2vzwyfz-959964077611.asia-southeast1.run.app'
        ];

    if (origin) {
      const isAllowed =
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production';

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 1. Health & Readiness check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    const dbConfigured = Boolean(DATABASE_URL && DATABASE_URL.trim());
    res.json({
      status: 'healthy',
      service: 'AI Heaven Full-Stack Engine',
      environment: process.env.NODE_ENV || 'development',
      database: {
        configured: dbConfigured,
        status: dbConfigured ? 'CONFIGURED' : 'UNVERIFIED',
        mode: dbConfigured ? 'PostgreSQL' : 'In-Memory Authoritative Store',
        message: dbConfigured
          ? 'PostgreSQL database URL configured'
          : 'DATABASE_URL is not configured in environment. Running on authoritative in-memory store.'
      },
      jwt_auth: {
        configured: Boolean(process.env.JWT_SECRET_KEY),
        algorithm: 'HS256'
      },
      allowed_origins_count: (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').filter(Boolean).length : 4),
      resources_count: currentResources.length,
      relationships_count: currentRelationships.length,
      timestamp: new Date().toISOString()
    });
  });

  // 1a. Database diagnostic endpoint (does NOT expose credentials)
  app.get('/api/health/db', (req: Request, res: Response) => {
    if (!DATABASE_URL || !DATABASE_URL.trim()) {
      return res.json({
        configured: false,
        status: 'UNVERIFIED',
        message: 'DATABASE_URL is not configured in environment. Operating in authoritative in-memory mode.'
      });
    }

    try {
      const parsed = new URL(DATABASE_URL);
      res.json({
        configured: true,
        status: 'CONFIGURED',
        scheme: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parsed.port || '5432',
        database: parsed.pathname.replace('/', ''),
        connection_test: 'UNVERIFIED (Requires live PostgreSQL daemon in host environment)'
      });
    } catch {
      res.status(400).json({
        configured: false,
        status: 'INVALID',
        message: 'DATABASE_URL format is invalid'
      });
    }
  });

  // 1b. JWT Authentication: Token Issuance
  app.post('/api/auth/token', (req: Request, res: Response) => {
    const { email = currentUser.email, role = currentUser.role } = req.body || {};
    const now = Math.floor(Date.now() / 1000);
    const token = signJwt(
      {
        sub: currentUser.id,
        email,
        role,
        iat: now,
        exp: now + 3600
      },
      JWT_SECRET_KEY
    );
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600
    });
  });

  // 1c. JWT Authentication: Token Verification
  app.get('/api/auth/verify', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ authenticated: false, error: 'Missing or malformed Authorization header' });
    }
    const token = authHeader.substring(7);
    const decoded = verifyJwt(token, JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ authenticated: false, error: 'Invalid or expired token' });
    }
    res.json({
      authenticated: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      }
    });
  });

  // 2. Resources endpoint with filtering, search, and pagination
  app.get('/api/resources', (req: Request, res: Response) => {
    const {
      q,
      type,
      provider,
      verified_only,
      include_demo = 'true',
      limit = '50',
      offset = '0'
    } = req.query;

    let filtered = [...currentResources];

    if (include_demo === 'false') {
      filtered = filtered.filter(r => !r.provenance.is_demo_data);
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(r => r.resource_type === type);
    }

    if (provider && provider !== 'all') {
      filtered = filtered.filter(r => r.provider_id === provider);
    }

    if (verified_only === 'true') {
      filtered = filtered.filter(r => r.verification_status === 'verified');
    }

    if (typeof q === 'string' && q.trim()) {
      const query = q.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.slug.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.publisher.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query)) ||
        r.capabilities.some(c => c.toLowerCase().includes(query))
      );
    }

    const total = filtered.length;
    const numOffset = Math.max(0, parseInt(String(offset), 10) || 0);
    const numLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const items = filtered.slice(numOffset, numOffset + numLimit);

    res.json({
      items,
      total,
      limit: numLimit,
      offset: numOffset
    });
  });

  // 3. Resource Detail by Slug
  app.get('/api/resources/:slug', (req: Request, res: Response) => {
    const { slug } = req.params;
    const resource = currentResources.find(r => r.slug === slug || r.id === slug);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  });

  // 4. Resource Relationships
  app.get('/api/resources/:slug/relationships', (req: Request, res: Response) => {
    const { slug } = req.params;
    const rels = currentRelationships.filter(
      r => r.source_slug === slug || r.target_slug === slug
    );
    res.json(rels);
  });

  // 5. Providers endpoint
  app.get('/api/providers', (req: Request, res: Response) => {
    res.json(PROVIDERS);
  });

  // 6. Knowledge Graph endpoint
  app.get('/api/graph', (req: Request, res: Response) => {
    // 1. Resource nodes
    const resourceNodes = currentResources.map(r => ({
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

    // 2. Provider nodes
    const providerNodes = PROVIDERS.map(p => ({
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

    // 3. Platform Tools
    const toolNodes = registeredTools.map(t => ({
      id: t.id,
      slug: t.id,
      name: t.name,
      resource_type: 'tool' as const,
      provider_id: 'prov_ai_heaven',
      trust_score: 99,
      verification_status: 'verified',
      is_demo_data: false,
      summary: t.description,
      description: t.description,
      capabilities: [t.capability],
      tags: ['sandbox_tool', t.capability],
      category: 'Agent Execution Tools',
      cluster: 'platform_tools'
    }));

    // 4. Agent Droids
    const agentNodes = agents.map(a => ({
      id: a.id,
      slug: a.id,
      name: a.name,
      resource_type: 'droid' as const,
      provider_id: 'prov_ai_heaven',
      trust_score: 98,
      verification_status: 'verified',
      is_demo_data: false,
      summary: a.description,
      description: a.description,
      capabilities: a.permissions?.allowed_tools || [],
      tags: ['autonomous_agent', 'droid', a.status],
      status: a.status,
      category: 'Autonomous Droids',
      cluster: 'droids'
    }));

    const nodes = [...providerNodes, ...resourceNodes, ...toolNodes, ...agentNodes];

    // Build complete set of real edges
    const edges = [
      // Direct resource-to-resource relationships
      ...currentRelationships.map(rel => ({
        id: rel.id,
        source: rel.source_slug,
        target: rel.target_slug,
        relationship_type: rel.relationship_type,
        evidence_url: rel.evidence_url,
        confidence: rel.confidence,
        verified: rel.verified,
        description: rel.description
      })),
      // Provider -> Resource relationships (genuine ownership & provisioning)
      ...currentResources.map(r => {
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
      }).filter(Boolean) as any[],
      // Droid -> Tools relationships (tool permissions)
      ...agents.flatMap(a => (a.permissions?.allowed_tools || []).map(toolId => ({
        id: `rel_agent_${a.id}_${toolId}`,
        source: a.id,
        target: toolId,
        relationship_type: 'uses_tool' as const,
        evidence_url: '/api/agents',
        confidence: 1.0,
        verified: true,
        description: `${a.name} is authorized to invoke ${toolId} within execution boundary.`
      }))),
      // Droid -> Gemini API relationship (model intelligence provider)
      ...agents.map(a => ({
        id: `rel_agent_${a.id}_gemini_api`,
        source: a.id,
        target: 'gemini-api',
        relationship_type: 'accesses' as const,
        evidence_url: 'https://ai.google.dev/gemini-api/docs',
        confidence: 1.0,
        verified: true,
        description: `${a.name} accesses Gemini API for multi-step reasoning and tool dispatch.`
      })),
      // Tool MCP Client -> Model Context Protocol relationship
      {
        id: 'rel_tool_mcp_client_protocol',
        source: 'tool_mcp_client',
        target: 'model-context-protocol',
        relationship_type: 'integrates_with' as const,
        evidence_url: 'https://modelcontextprotocol.io',
        confidence: 1.0,
        verified: true,
        description: 'AI Heaven MCP client implements the open Model Context Protocol specification.'
      }
    ];

    res.json({ nodes, edges });
  });

  // 7. Trigger Live Ingestion Sync for a specific connector
  app.post('/api/connectors/:id/sync', async (req: Request, res: Response) => {
    const { id } = req.params;
    let connector;

    if (id === 'conn_google_ai') connector = googleAISourceConnector;
    else if (id === 'conn_github') connector = gitHubSourceConnector;
    else if (id === 'conn_mcp') connector = mcpSourceConnector;
    else {
      return res.status(404).json({ error: 'Unknown connector' });
    }

    try {
      const result = await connector.sync();

      // Upsert synchronized resources into current state
      result.resources.forEach(newRes => {
        const idx = currentResources.findIndex(r => r.slug === newRes.slug);
        if (idx >= 0) {
          currentResources[idx] = newRes;
        } else {
          currentResources.push(newRes);
        }
      });

      // Upsert relationships
      result.relationships.forEach(newRel => {
        const exists = currentRelationships.some(
          r => r.source_slug === newRel.source_slug && r.target_slug === newRel.target_slug
        );
        if (!exists) {
          currentRelationships.push(newRel);
        }
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Connectors metadata list
  app.get('/api/connectors', (req: Request, res: Response) => {
    res.json([
      googleAISourceConnector.config,
      gitHubSourceConnector.config,
      mcpSourceConnector.config
    ]);
  });

  // ==========================================
  // PHASE 1A: FOUNDATION REST ENDPOINTS
  // ==========================================

  // 9. Current User Identity & Profile
  app.get('/api/users/current', (req: Request, res: Response) => {
    res.json(currentUser);
  });

  // 10. Projects (Isolated by User Owner)
  app.get('/api/projects', (req: Request, res: Response) => {
    const userProjects = projects.filter(p => p.owner_id === currentUser.id);
    res.json(userProjects);
  });

  app.post('/api/projects', (req: Request, res: Response) => {
    const { name, description = '', metadata = {} } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      owner_id: currentUser.id,
      name: name.trim(),
      description: description.trim(),
      status: 'active',
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    projects.push(newProject);

    logAuditEvent({
      event_type: 'project_action',
      actor_id: currentUser.id,
      actor_type: 'user',
      project_id: newProject.id,
      action: 'create_project',
      status: 'success',
      metadata: { name: newProject.name }
    });

    res.status(201).json(newProject);
  });

  // 11. Workspaces (Isolated by Project and User)
  app.get('/api/workspaces', (req: Request, res: Response) => {
    const { project_id } = req.query;
    let filtered = workspaces.filter(w => w.owner_id === currentUser.id);
    if (typeof project_id === 'string' && project_id) {
      filtered = filtered.filter(w => w.project_id === project_id);
    }
    res.json(filtered);
  });

  app.post('/api/workspaces', (req: Request, res: Response) => {
    const { project_id, name, environment_variables = {} } = req.body;
    if (!project_id || !name) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    // Security boundary: verify project exists and belongs to current user
    const project = projects.find(p => p.id === project_id && p.owner_id === currentUser.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const wsId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newWorkspace: Workspace = {
      id: wsId,
      project_id,
      owner_id: currentUser.id,
      name: String(name).trim(),
      filesystem_ref: `/var/aiheaven/workspaces/${wsId}`,
      status: 'ready',
      environment_variables,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    workspaces.push(newWorkspace);

    logAuditEvent({
      event_type: 'workspace_action',
      actor_id: currentUser.id,
      actor_type: 'user',
      project_id,
      workspace_id: wsId,
      action: 'create_workspace',
      status: 'success',
      metadata: { name: newWorkspace.name }
    });

    res.status(201).json(newWorkspace);
  });

  // 12. Agent Foundation (Droids definition and explicit permissions)
  app.get('/api/agents', (req: Request, res: Response) => {
    const { project_id } = req.query;
    let filtered = agents.filter(a => a.owner_id === currentUser.id);
    if (typeof project_id === 'string' && project_id) {
      filtered = filtered.filter(a => a.project_id === project_id);
    }
    res.json(filtered);
  });

  app.post('/api/agents', (req: Request, res: Response) => {
    const { project_id, workspace_id, name, description = '', permissions = {} } = req.body;
    if (!project_id || !name) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    const project = projects.find(p => p.id === project_id && p.owner_id === currentUser.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const newAgent: AgentDefinition = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      owner_id: currentUser.id,
      project_id,
      workspace_id,
      name: String(name).trim(),
      description: String(description).trim(),
      status: 'idle',
      permissions: {
        allowed_tools: Array.isArray(permissions.allowed_tools) ? permissions.allowed_tools : [],
        network_access: Boolean(permissions.network_access),
        filesystem_scope: permissions.filesystem_scope || 'workspace_only',
        requires_approval_for_destructive: permissions.requires_approval_for_destructive !== false
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    agents.push(newAgent);

    logAuditEvent({
      event_type: 'agent_action',
      actor_id: currentUser.id,
      actor_type: 'user',
      project_id,
      workspace_id,
      action: 'create_agent',
      status: 'success',
      metadata: { name: newAgent.name }
    });

    res.status(201).json(newAgent);
  });

  // 13. Tools Registry Foundation
  app.get('/api/tools', (req: Request, res: Response) => {
    res.json(registeredTools);
  });

  // 14. Audit System Foundation
  app.get('/api/audit-events', (req: Request, res: Response) => {
    const { event_type, project_id, limit = '50' } = req.query;
    let filtered = [...auditEvents];

    if (typeof event_type === 'string' && event_type) {
      filtered = filtered.filter(e => e.event_type === event_type);
    }
    if (typeof project_id === 'string' && project_id) {
      filtered = filtered.filter(e => e.project_id === project_id);
    }

    const numLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    res.json(filtered.slice(0, numLimit));
  });

  app.post('/api/audit-events', (req: Request, res: Response) => {
    const { event_type, action, project_id, workspace_id, status = 'success', metadata = {}, error_message } = req.body;
    if (!event_type || !action) {
      return res.status(400).json({ error: 'event_type and action are required' });
    }

    const recorded = logAuditEvent({
      event_type,
      actor_id: currentUser.id,
      actor_type: 'user',
      project_id,
      workspace_id,
      action,
      status,
      metadata,
      error_message
    });

    res.status(201).json(recorded);
  });

  // ==========================================
  // PHASE 1B: WORKSPACE FS & SANDBOX EXECUTION
  // ==========================================

  // Helper middleware/check for workspace ownership
  const verifyWorkspaceAccess = (workspaceId: string) => {
    return workspaces.some(w => w.id === workspaceId && w.owner_id === currentUser.id);
  };

  // 15. Workspace Virtual Filesystem: Read
  app.post('/api/workspaces/:workspaceId/fs/read', async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { path: filePath } = req.body;
    if (!verifyWorkspaceAccess(workspaceId)) {
      return res.status(403).json({ error: 'Unauthorized or workspace not found' });
    }
    try {
      const file = await workspaceFilesystem.readFile(workspaceId, filePath);
      res.json(file);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 16. Workspace Virtual Filesystem: Write
  app.post('/api/workspaces/:workspaceId/fs/write', async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { path: filePath, content = '' } = req.body;
    if (!verifyWorkspaceAccess(workspaceId)) {
      return res.status(403).json({ error: 'Unauthorized or workspace not found' });
    }
    try {
      const file = await workspaceFilesystem.writeFile(workspaceId, filePath, content);
      logAuditEvent({
        event_type: 'workspace_action',
        actor_id: currentUser.id,
        actor_type: 'user',
        workspace_id: workspaceId,
        action: 'fs_write_file',
        status: 'success',
        metadata: { path: file.path, size_bytes: file.size_bytes }
      });
      res.json(file);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 17. Workspace Virtual Filesystem: List
  app.post('/api/workspaces/:workspaceId/fs/list', async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { directoryPath } = req.body;
    if (!verifyWorkspaceAccess(workspaceId)) {
      return res.status(403).json({ error: 'Unauthorized or workspace not found' });
    }
    try {
      const files = await workspaceFilesystem.listFiles(workspaceId, directoryPath);
      res.json(files);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 18. Workspace Virtual Filesystem: Delete
  app.post('/api/workspaces/:workspaceId/fs/delete', async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { path: filePath } = req.body;
    if (!verifyWorkspaceAccess(workspaceId)) {
      return res.status(403).json({ error: 'Unauthorized or workspace not found' });
    }
    try {
      await workspaceFilesystem.deleteFile(workspaceId, filePath);
      logAuditEvent({
        event_type: 'workspace_action',
        actor_id: currentUser.id,
        actor_type: 'user',
        workspace_id: workspaceId,
        action: 'fs_delete_file',
        status: 'success',
        metadata: { path: filePath }
      });
      res.json({ success: true, path: filePath });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 19. Workspace Virtual Filesystem: Move
  app.post('/api/workspaces/:workspaceId/fs/move', async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { sourcePath, targetPath } = req.body;
    if (!verifyWorkspaceAccess(workspaceId)) {
      return res.status(403).json({ error: 'Unauthorized or workspace not found' });
    }
    try {
      await workspaceFilesystem.moveFile(workspaceId, sourcePath, targetPath);
      logAuditEvent({
        event_type: 'workspace_action',
        actor_id: currentUser.id,
        actor_type: 'user',
        workspace_id: workspaceId,
        action: 'fs_move_file',
        status: 'success',
        metadata: { sourcePath, targetPath }
      });
      res.json({ success: true, sourcePath, targetPath });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 20. Execution State Machine: Submit / Plan Execution
  app.post('/api/executions', async (req: Request, res: Response) => {
    const { agent_id, project_id, workspace_id, tool_id, command } = req.body;

    if (!agent_id || !project_id || !workspace_id || !tool_id || !command) {
      return res.status(400).json({
        error: 'agent_id, project_id, workspace_id, tool_id, and command are required'
      });
    }

    const agent = agents.find(a => a.id === agent_id && a.owner_id === currentUser.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found or unauthorized' });
    }

    const tool = registeredTools.find(t => t.id === tool_id);
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found in registry' });
    }

    if (!verifyWorkspaceAccess(workspace_id)) {
      return res.status(403).json({ error: 'Unauthorized workspace access' });
    }

    try {
      const job = await executionManager.submitJob(
        { agent_id, project_id, workspace_id, tool_id, command },
        agent,
        tool
      );
      res.status(201).json(job);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21. Execution State Machine: List Jobs
  app.get('/api/executions', (req: Request, res: Response) => {
    const { project_id, workspace_id } = req.query;
    const jobs = executionManager.listJobs(
      typeof project_id === 'string' ? project_id : undefined,
      typeof workspace_id === 'string' ? workspace_id : undefined
    );
    res.json(jobs);
  });

  // 22. Execution State Machine: Get Job Details
  app.get('/api/executions/:executionId', (req: Request, res: Response) => {
    const { executionId } = req.params;
    const job = executionManager.getJob(executionId);
    if (!job) {
      return res.status(404).json({ error: 'Execution job not found' });
    }
    res.json(job);
  });

  // 23. Execution State Machine: Cancel Job
  app.post('/api/executions/:executionId/cancel', (req: Request, res: Response) => {
    const { executionId } = req.params;
    try {
      const cancelled = executionManager.cancelJob(executionId, currentUser.id);
      res.json(cancelled);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 24. Human Approval: List Pending Approvals
  app.get('/api/approvals', (req: Request, res: Response) => {
    const { project_id, status } = req.query;
    const approvals = executionManager.listApprovals(
      typeof project_id === 'string' ? project_id : undefined,
      typeof status === 'string' ? (status as any) : undefined
    );
    res.json(approvals);
  });

  // 25. Human Approval: Decide Approval (Approve / Reject)
  app.post('/api/approvals/:approvalId/decide', async (req: Request, res: Response) => {
    const { approvalId } = req.params;
    const { decision, rejection_reason } = req.body;

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
    }

    const approval = executionManager.getApproval(approvalId);
    if (!approval) {
      return res.status(404).json({ error: 'Approval record not found' });
    }

    const job = executionManager.getJob(approval.execution_id);
    const agent = job ? agents.find(a => a.id === job.agent_id) : undefined;
    const tool = job ? registeredTools.find(t => t.id === job.tool_id) : undefined;

    try {
      const result = await executionManager.decideApproval(
        approvalId,
        decision,
        currentUser.id,
        rejection_reason,
        agent,
        tool
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // PHASE 1C: AGENT RUNTIME & TASK PLANNER
  // ==========================================

  // 26. Workers List & Details
  app.get('/api/workers', (req: Request, res: Response) => {
    const { project_id } = req.query;
    res.json(agentRuntimeService.listWorkers(typeof project_id === 'string' ? project_id : undefined));
  });

  app.get('/api/workers/:agentId', (req: Request, res: Response) => {
    const { agentId } = req.params;
    const worker = agentRuntimeService.getWorker(agentId);
    if (!worker) {
      // Auto-register worker if agent exists
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        return res.json(agentRuntimeService.registerWorker(agent));
      }
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(worker);
  });

  app.post('/api/workers/:agentId/heartbeat', (req: Request, res: Response) => {
    const { agentId } = req.params;
    try {
      const worker = agentRuntimeService.updateHeartbeat(agentId);
      res.json(worker);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // 27. Task Creation with Planner
  app.post('/api/tasks', (req: Request, res: Response) => {
    const { agent_id, project_id, workspace_id, goal, priority = 'medium', idempotency_key } = req.body;
    if (!agent_id || !project_id || !workspace_id || !goal) {
      return res.status(400).json({ error: 'agent_id, project_id, workspace_id, and goal are required' });
    }

    const agent = agents.find(a => a.id === agent_id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    try {
      const task = agentRuntimeService.createTask(
        currentUser.id,
        project_id,
        workspace_id,
        agent,
        goal,
        priority,
        registeredTools,
        idempotency_key
      );
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 28. Task Listing & Detail
  app.get('/api/tasks', (req: Request, res: Response) => {
    const { project_id, agent_id } = req.query;
    res.json(
      agentRuntimeService.listTasks(
        typeof project_id === 'string' ? project_id : undefined,
        typeof agent_id === 'string' ? agent_id : undefined
      )
    );
  });

  app.get('/api/tasks/:taskId', (req: Request, res: Response) => {
    const { taskId } = req.params;
    const task = agentRuntimeService.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  // 29. Task Action Advancement
  app.post('/api/tasks/:taskId/execute-next', async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const task = agentRuntimeService.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const agent = agents.find(a => a.id === task.agent_id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    try {
      const updated = await agentRuntimeService.executeNextAction(taskId, agent, registeredTools);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 30. Task Lifecycle: Pause / Resume / Cancel
  app.post('/api/tasks/:taskId/pause', (req: Request, res: Response) => {
    const { taskId } = req.params;
    try {
      const updated = agentRuntimeService.pauseTask(taskId, currentUser.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/tasks/:taskId/resume', (req: Request, res: Response) => {
    const { taskId } = req.params;
    try {
      const updated = agentRuntimeService.resumeTask(taskId, currentUser.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/tasks/:taskId/cancel', (req: Request, res: Response) => {
    const { taskId } = req.params;
    try {
      const updated = agentRuntimeService.cancelTask(taskId, currentUser.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 31. Working Memory Inspection
  app.get('/api/tasks/:taskId/memory', (req: Request, res: Response) => {
    const { taskId } = req.params;
    const task = agentRuntimeService.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const memory = agentRuntimeService.getWorkingMemory(
      task.project_id,
      task.workspace_id,
      task.agent_id,
      task.id
    );
    res.json(memory || null);
  });

  // 31a. Structured Execution Receipts (Phase 1D)
  app.get('/api/tasks/:taskId/receipt', (req: Request, res: Response) => {
    const { taskId } = req.params;
    const task = agentRuntimeService.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const receipt = agentRuntimeService.getReceipt(taskId) || task.receipt;
    if (!receipt) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        const generated = agentRuntimeService.generateReceipt(task, task.status as any);
        return res.json(generated);
      }
      return res.status(404).json({ error: 'Receipt not yet generated (task in progress)' });
    }
    res.json(receipt);
  });

  // 31b. Droid Machine-Readable Capability Manifest (Phase 1D)
  app.get('/api/agents/:agentId/manifest', (req: Request, res: Response) => {
    const { agentId } = req.params;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agentRuntimeService.getDroidManifest(agent));
  });

  app.get('/api/droids/:agentId/manifest', (req: Request, res: Response) => {
    const { agentId } = req.params;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Droid not found' });
    res.json(agentRuntimeService.getDroidManifest(agent));
  });

  app.get('/api/manifests', (req: Request, res: Response) => {
    const manifests = agents.map(a => agentRuntimeService.getDroidManifest(a));
    res.json(manifests);
  });

  // 32. Emergency Kill Switch
  app.get('/api/kill-switch', (req: Request, res: Response) => {
    res.json(agentRuntimeService.getKillSwitchStatus());
  });

  app.post('/api/kill-switch', (req: Request, res: Response) => {
    const { scope = 'global', target_id, reason = 'Operator triggered emergency kill switch' } = req.body;
    const status = agentRuntimeService.triggerKillSwitch(scope, target_id, currentUser.id, reason);
    res.json(status);
  });

  app.post('/api/kill-switch/reset', (req: Request, res: Response) => {
    const status = agentRuntimeService.resetKillSwitch(currentUser.id);
    res.json(status);
  });

  // 33. Runtime Event Stream (Polling fallback)
  app.get('/api/events', (req: Request, res: Response) => {
    const { since, task_id, agent_id, limit = '50' } = req.query;
    const events = agentRuntimeService.getEvents({
      since: typeof since === 'string' ? since : undefined,
      task_id: typeof task_id === 'string' ? task_id : undefined,
      agent_id: typeof agent_id === 'string' ? agent_id : undefined,
      limit: parseInt(String(limit), 10) || 50
    });
    res.json(events);
  });

  return app;
}

export const apiApp = createApiApp();

async function startServer() {
  const app = createApiApp();

  // Mount Vite development middlewares for SPA hot-reloading
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[AI Heaven] Full-stack engine running on http://${HOST}:${PORT}`);
  });
}

const isMainModule = Boolean(process.argv[1] && (
  process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')
));

if (isMainModule && !process.env.VERCEL) {
  startServer().catch(err => {
    console.error('[AI Heaven] Server startup error:', err);
    process.exit(1);
  });
}
