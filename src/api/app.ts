/**
 * AI HEAVEN - Production Express API Application
 * Pure serverless-compatible API runtime with comprehensive security headers,
 * sensitive path blocking, PostgreSQL integration, and zero Vite build dependencies.
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { RESOURCES, PROVIDERS, RELATIONSHIPS } from '../data/database';
import {
  User,
  Project,
  Workspace,
  AgentDefinition,
  ToolDefinition,
  AuditEvent
} from '../types/foundation';
import { workspaceFilesystem } from '../services/sandbox/workspaceFs';
import { executionManager } from '../services/sandbox/executionManager';
import { agentRuntimeService } from '../services/sandbox/agentRuntimeService';
import { postgresManager } from '../db/postgres';
import { reviewService } from '../services/review/reviewService';

dotenv.config();

// Internal Server Configuration
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'ai_heaven_production_insecure_default_key_change_in_prod';
const DATABASE_URL = process.env.DATABASE_URL;

// HS256 JWT utilities
export function signJwt(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string, secret: string): Record<string, any> | null {
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

// In-memory runtime data cache
let currentResources = [...RESOURCES];
let currentRelationships = [...RELATIONSHIPS];

// Default platform engineering actor
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
        exit_code: { type: 'number' },
        duration_ms: { type: 'number' }
      }
    },
    permissions: ['sandbox:exec'],
    permission_requirements: ['sandbox:exec'],
    risk_level: 'medium',
    availability: 'ready',
    provenance: {
      source_provider: 'AI Heaven Core Runtime',
      author: 'Autonomous Systems Lab',
      verified: true,
      registered_at: '2026-09-01T00:00:00Z',
      spec_url: 'https://docs.aiheaven.org/runtime/sandbox'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 30,
      requires_confirmation: false,
      max_output_bytes: 1048576
    },
    is_enabled: true
  },
  {
    id: 'tool_fs_scoped',
    name: 'Scoped Virtual Filesystem',
    provider: 'prov_ai_heaven',
    description: 'Read and write project assets within tenant workspace boundary with directory traversal protection.',
    capability: 'filesystem',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['read', 'write', 'list', 'delete'] },
        path: { type: 'string', description: 'Relative path inside workspace' },
        content: { type: 'string', description: 'File content for write operations' }
      },
      required: ['action', 'path']
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        bytes: { type: 'number' }
      }
    },
    permissions: ['fs:read', 'fs:write'],
    permission_requirements: ['fs:read'],
    risk_level: 'low',
    availability: 'ready',
    provenance: {
      source_provider: 'AI Heaven Core Runtime',
      author: 'Autonomous Systems Lab',
      verified: true,
      registered_at: '2026-09-01T00:00:00Z',
      spec_url: 'https://docs.aiheaven.org/runtime/vfs'
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
    name: 'Model Context Protocol (MCP) Client',
    provider: 'prov_anthropic',
    description: 'Standardized context and tool invocation gateway supporting MCP server discovery and schema-driven execution.',
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
      timeout_seconds: 60,
      requires_confirmation: false,
      max_output_bytes: 5242880
    },
    is_enabled: true
  },
  {
    id: 'tool_github_sync',
    name: 'GitHub Repository Synchronizer',
    provider: 'prov_github',
    description: 'Fetches code repositories, commits, and pull requests via GitHub REST & GraphQL API.',
    capability: 'github',
    input_schema: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
        ref: { type: 'string', default: 'main' }
      },
      required: ['owner', 'repo']
    },
    output_schema: {
      type: 'object',
      properties: {
        commit_sha: { type: 'string' },
        tree: { type: 'array' }
      }
    },
    permissions: ['github:read', 'network:outbound'],
    permission_requirements: ['github:read'],
    risk_level: 'low',
    authentication_requirements: {
      type: 'bearer',
      required: false,
      header_or_param: 'Authorization',
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

  // If PostgreSQL is configured, persist asynchronously
  if (postgresManager.isConfigured()) {
    const pool = postgresManager.getPool();
    if (pool) {
      pool.query(
        `INSERT INTO aiheaven_audit_events 
          (id, correlation_id, event_type, actor_id, actor_type, project_id, workspace_id, action, status, metadata, error_message, resource, result, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          newEvent.id,
          newEvent.correlation_id,
          newEvent.event_type,
          newEvent.actor_id,
          newEvent.actor_type,
          newEvent.project_id || null,
          newEvent.workspace_id || null,
          newEvent.action,
          newEvent.status,
          JSON.stringify(newEvent.metadata || {}),
          newEvent.error_message || null,
          newEvent.resource || null,
          newEvent.result || null,
          newEvent.timestamp
        ]
      ).catch((err) => {
        console.error('[PostgreSQL Audit Write Warning]:', err.message);
      });
    }
  }

  return newEvent;
}

executionManager.setAuditLogger((event) => {
  logAuditEvent(event);
});
agentRuntimeService.setAuditLogger((event) => {
  logAuditEvent(event);
});

// Sensitive path regex for security blocking
const SENSITIVE_PATH_REGEX = /^\/(\.env.*|\.git.*|.*\.sql$|.*\.bak$|server-status.*|phpinfo.*)/i;

export function createExpressApp(): express.Express {
  const app = express();
  app.use(express.json());

  // 1. Sensitive Paths Blocker: Intercept any attempt to access internal credentials or backups
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cleanPath = req.path.toLowerCase();
    if (SENSITIVE_PATH_REGEX.test(cleanPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(404).send('Not Found');
    }
    next();
  });

  // 2. Comprehensive Security Headers & Request Tracing Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    res.setHeader('X-Request-Id', requestId);

    // Hardened Security Headers (CSP, Nosniff, Clickjacking, Permissions, Referrer)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

    // On API endpoints, provide X-Frame-Options: SAMEORIGIN for strict API security audits.
    // For document pages, omit X-Frame-Options so AI Studio iframe preview renders properly,
    // and rely on CSP frame-ancestors to permit authorized parent origins (*.google.com, *.run.app).
    if (req.path.startsWith('/api') || req.path === '/health' || !req.accepts('html')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app https://aistudio.google.com https://*.aistudio.google.com; object-src 'none'; base-uri 'self'; form-action 'self';"
    );

    // Controlled CORS for API routes
    const origin = req.headers.origin;
    const configuredOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
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
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Request-Id');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    const origEnd = res.end;
    res.end = function (...args: any[]) {
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
      }
      return origEnd.apply(this, args as any);
    };

    next();
  });

  // Create an API router so routes work identically at BOTH '/api/*' AND '/*'
  const apiRouter = express.Router();

  // 1. Health & Readiness check endpoint
  apiRouter.get('/health', async (req: Request, res: Response) => {
    let dbStatus = {
      configured: false,
      connected: false,
      mode: 'In-Memory Authoritative Store',
      message: 'DATABASE_URL is not configured. Running on authoritative in-memory store.'
    };

    if (postgresManager.isConfigured()) {
      const health = await postgresManager.checkHealth();
      dbStatus = {
        configured: true,
        connected: health.connected,
        mode: 'PostgreSQL',
        message: health.connected
          ? `Connected to PostgreSQL (${health.host}:${health.port}/${health.database})`
          : (health.error || 'Connection failed')
      };
    }

    const overallHealthy = !postgresManager.isConfigured() || dbStatus.connected;

    res.status(overallHealthy ? 200 : 503).json({
      status: overallHealthy ? 'healthy' : 'degraded',
      service: 'AI Heaven Full-Stack Engine',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      jwt_auth: {
        configured: Boolean(process.env.JWT_SECRET_KEY),
        algorithm: 'HS256'
      },
      allowed_origins_count: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').filter(Boolean).length : 4,
      resources_count: currentResources.length,
      relationships_count: currentRelationships.length,
      timestamp: new Date().toISOString()
    });
  });

  // 1a. Database diagnostic endpoint (does NOT expose credentials)
  apiRouter.get('/health/db', async (req: Request, res: Response) => {
    if (!postgresManager.isConfigured()) {
      return res.json({
        configured: false,
        status: 'UNCONFIGURED',
        message: 'DATABASE_URL is not configured in environment. Operating in authoritative in-memory mode.'
      });
    }

    const health = await postgresManager.checkHealth();
    if (health.connected) {
      res.json({
        configured: true,
        status: 'CONNECTED',
        scheme: health.scheme,
        host: health.host,
        port: health.port,
        database: health.database,
        latency_ms: health.latencyMs
      });
    } else {
      res.status(503).json({
        configured: true,
        status: 'CONNECTION_FAILED',
        scheme: health.scheme,
        host: health.host,
        port: health.port,
        database: health.database,
        error: health.error
      });
    }
  });

  // 2. JWT Authentication: Token Issuance
  apiRouter.post('/auth/token', (req: Request, res: Response) => {
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
      token,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: currentUser.id,
        email,
        role,
        full_name: currentUser.profile?.full_name
      }
    });
  });

  // 3. User verification
  apiRouter.get('/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyJwt(token, JWT_SECRET_KEY);
      if (decoded) {
        return res.json({
          authenticated: true,
          user: {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
          }
        });
      }
    }
    res.json({
      authenticated: true,
      user: currentUser
    });
  });

  // 4. Resources collection
  apiRouter.get('/resources', (req: Request, res: Response) => {
    const { query, category, provider, limit = '50', offset = '0' } = req.query;
    let items = [...currentResources];

    if (typeof query === 'string' && query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q)
      );
    }
    if (typeof category === 'string' && category.trim()) {
      items = items.filter((r) => r.categories?.includes(category) || r.resource_type === category);
    }
    if (typeof provider === 'string' && provider.trim()) {
      items = items.filter((r) => r.provider_id === provider || r.publisher?.toLowerCase() === provider.toLowerCase());
    }

    const total = items.length;
    const l = parseInt(String(limit), 10) || 50;
    const o = parseInt(String(offset), 10) || 0;
    const paginated = items.slice(o, o + l);

    res.json({
      items: paginated,
      total,
      limit: l,
      offset: o
    });
  });

  // 5. Resource detail
  apiRouter.get('/resources/:slug', (req: Request, res: Response) => {
    const resource = currentResources.find((r) => r.slug === req.params.slug);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  });

  // 6. Resource relationships
  apiRouter.get('/resources/:slug/relationships', (req: Request, res: Response) => {
    const slug = req.params.slug;
    const rels = currentRelationships.filter((r) => r.source_slug === slug || r.target_slug === slug);
    res.json(rels);
  });

  // 7. Providers collection
  apiRouter.get('/providers', (req: Request, res: Response) => {
    res.json(PROVIDERS);
  });

  // 8. Knowledge Graph endpoint (synthesized authoritative graph)
  apiRouter.get('/graph', (req: Request, res: Response) => {
    const nodes = [
      ...currentResources.map((r) => ({
        id: r.slug,
        label: r.name,
        type: 'resource' as const,
        group: r.resource_type,
        provenance: r.provenance,
        trust_score: r.trust_score
      })),
      ...PROVIDERS.map((p) => ({
        id: p.slug,
        label: p.name,
        type: 'provider' as const,
        group: 'provider',
        provenance: {
          source_provider: p.name,
          source_url: p.website_url,
          verified: true
        },
        trust_score: 95
      })),
      ...registeredTools.map((t) => ({
        id: t.id,
        label: t.name,
        type: 'tool' as const,
        group: 'tool',
        provenance: t.provenance,
        trust_score: 90
      }))
    ];

    const edges = currentRelationships.map((r) => ({
      id: r.id,
      source: r.source_slug,
      target: r.target_slug,
      type: r.relationship_type,
      confidence: r.confidence,
      verified: r.verified
    }));

    res.json({ nodes, edges });
  });

  // 9. Workers collection
  apiRouter.get('/workers', (req: Request, res: Response) => {
    const { project_id } = req.query;
    res.json(agentRuntimeService.listWorkers(typeof project_id === 'string' ? project_id : undefined));
  });

  // 10. Tools collection
  apiRouter.get('/tools', (req: Request, res: Response) => {
    res.json(registeredTools);
  });

  // 11. Droid Manifests
  apiRouter.get('/manifests', (req: Request, res: Response) => {
    const manifests = agents.map((a) => agentRuntimeService.getDroidManifest(a));
    res.json(manifests);
  });

  // 12. Tasks Creation (with planner, worker, and idempotency)
  apiRouter.post('/tasks', async (req: Request, res: Response) => {
    const { agent_id, project_id, workspace_id, goal, priority = 'medium', idempotency_key } = req.body;
    if (!agent_id || !project_id || !workspace_id || !goal) {
      return res.status(400).json({ error: 'agent_id, project_id, workspace_id, and goal are required' });
    }

    const agent = agents.find((a) => a.id === agent_id);
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

      // Persist to PostgreSQL if configured
      if (postgresManager.isConfigured()) {
        const pool = postgresManager.getPool();
        if (pool) {
          pool.query(
            `INSERT INTO aiheaven_tasks 
              (id, idempotency_key, correlation_id, owner_id, project_id, workspace_id, agent_id, goal, status, priority, plan, current_action_index, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, plan = EXCLUDED.plan`,
            [
              task.id,
              task.idempotency_key || null,
              task.correlation_id || null,
              task.owner_id,
              task.project_id,
              task.workspace_id,
              task.agent_id,
              task.goal,
              task.status,
              task.priority,
              JSON.stringify(task.plan),
              task.current_action_index,
              task.created_at
            ]
          ).catch((err) => {
            console.error('[PostgreSQL Task Persist Warning]:', err.message);
          });
        }
      }

      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 13. Tasks List
  apiRouter.get('/tasks', (req: Request, res: Response) => {
    const { project_id, agent_id } = req.query;
    res.json(
      agentRuntimeService.listTasks(
        typeof project_id === 'string' ? project_id : undefined,
        typeof agent_id === 'string' ? agent_id : undefined
      )
    );
  });

  // 14. Task detail & execution
  apiRouter.get('/tasks/:taskId', (req: Request, res: Response) => {
    const task = agentRuntimeService.getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  apiRouter.post('/tasks/:taskId/execute', async (req: Request, res: Response) => {
    const task = agentRuntimeService.getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const agent = agents.find((a) => a.id === task.agent_id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    try {
      const updated = await agentRuntimeService.executeNextAction(req.params.taskId, agent, registeredTools);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/tasks/:taskId/pause', (req: Request, res: Response) => {
    try {
      const updated = agentRuntimeService.pauseTask(req.params.taskId, currentUser.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/tasks/:taskId/resume', (req: Request, res: Response) => {
    try {
      const updated = agentRuntimeService.resumeTask(req.params.taskId, currentUser.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/tasks/:taskId/cancel', (req: Request, res: Response) => {
    try {
      const updated = agentRuntimeService.cancelTask(req.params.taskId, currentUser.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.get('/tasks/:taskId/receipt', (req: Request, res: Response) => {
    const task = agentRuntimeService.getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const receipt = agentRuntimeService.getReceipt(req.params.taskId) || task.receipt;
    if (!receipt) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        const generated = agentRuntimeService.generateReceipt(task, task.status as any);
        return res.json(generated);
      }
      return res.status(404).json({ error: 'Receipt not yet available for in-flight task' });
    }
    res.json(receipt);
  });

  // 15. Approvals queue
  apiRouter.get('/approvals', (req: Request, res: Response) => {
    const { project_id, status } = req.query;
    res.json(
      executionManager.listApprovals(
        typeof project_id === 'string' ? project_id : undefined,
        typeof status === 'string' ? (status as any) : undefined
      )
    );
  });

  apiRouter.post('/approvals/:approvalId/decide', async (req: Request, res: Response) => {
    const { decision, reason } = req.body;
    if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
    }
    try {
      const result = await executionManager.decideApproval(req.params.approvalId, decision, currentUser.id, reason);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 16. Kill switch endpoints
  apiRouter.get('/kill-switch', (req: Request, res: Response) => {
    res.json(agentRuntimeService.getKillSwitchStatus());
  });

  apiRouter.post('/kill-switch/trigger', (req: Request, res: Response) => {
    const { scope = 'global', target_id, reason = 'Operator triggered emergency kill switch' } = req.body || {};
    const status = agentRuntimeService.triggerKillSwitch(scope, target_id, currentUser.id, reason);
    res.json(status);
  });

  apiRouter.post('/kill-switch/reset', (req: Request, res: Response) => {
    const status = agentRuntimeService.resetKillSwitch(currentUser.id);
    res.json(status);
  });

  // 17. Runtime Events Stream
  apiRouter.get('/events', (req: Request, res: Response) => {
    const { since, task_id, agent_id, limit = '50' } = req.query;
    const events = agentRuntimeService.getEvents({
      since: typeof since === 'string' ? since : undefined,
      task_id: typeof task_id === 'string' ? task_id : undefined,
      agent_id: typeof agent_id === 'string' ? agent_id : undefined,
      limit: parseInt(String(limit), 10) || 50
    });
    res.json(events);
  });

  // 18. Audit Events Stream
  apiRouter.get('/audit', (req: Request, res: Response) => {
    const { project_id, limit = '50' } = req.query;
    let list = auditEvents;
    if (typeof project_id === 'string') {
      list = list.filter((e) => e.project_id === project_id);
    }
    const lim = parseInt(String(limit), 10) || 50;
    res.json(list.slice(0, lim));
  });

  // 19. Projects and Workspaces endpoints
  apiRouter.get('/projects', (req: Request, res: Response) => {
    res.json(projects);
  });

  apiRouter.post('/projects', (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const newProj: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      owner_id: currentUser.id,
      name,
      description: description || '',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    projects.push(newProj);
    res.status(201).json(newProj);
  });

  apiRouter.get('/workspaces', (req: Request, res: Response) => {
    const { project_id } = req.query;
    let list = workspaces;
    if (typeof project_id === 'string') {
      list = list.filter((w) => w.project_id === project_id);
    }
    res.json(list);
  });

  apiRouter.post('/workspaces', (req: Request, res: Response) => {
    const { project_id, name } = req.body;
    if (!project_id || !name) return res.status(400).json({ error: 'project_id and name are required' });
    const newWs: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      project_id,
      owner_id: currentUser.id,
      name,
      filesystem_ref: `/var/aiheaven/workspaces/${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    workspaceFilesystem.ensureWorkspaceInitialized(newWs.id);
    workspaces.push(newWs);
    res.status(201).json(newWs);
  });

  apiRouter.get('/agents', (req: Request, res: Response) => {
    res.json(agents);
  });

  // 20. Operational Visibility & Operator Control Endpoints
  apiRouter.get('/operations/overview', async (req: Request, res: Response) => {
    try {
      const dbHealth = await postgresManager.checkHealth();
      const metrics = agentRuntimeService.getMetrics();
      const approvals = executionManager.listApprovals();
      const allJobs = executionManager.listJobs();
      const failedJobs = allJobs.filter((j) => j.state === 'failed' || j.state === 'rejected');
      const memory = process.memoryUsage();

      res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        metrics,
        database: dbHealth,
        approvals: {
          pending: approvals.filter((a) => a.status === 'pending').length,
          expired: approvals.filter((a) => a.status === 'expired').length,
          total: approvals.length
        },
        jobs: {
          total: allJobs.length,
          failed: failedJobs.length,
          recentFailed: failedJobs.slice(0, 5).map((j) => ({
            id: j.id,
            toolId: j.tool_id,
            command: j.command,
            state: j.state,
            errorMessage: j.error_message || j.stderr || 'Execution failure',
            createdAt: j.created_at
          }))
        },
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          isServerless: Boolean(process.env.VERCEL),
          memoryMb: {
            rss: Math.round(memory.rss / (1024 * 1024)),
            heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
            heapTotal: Math.round(memory.heapTotal / (1024 * 1024))
          }
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/operations/recover-state', async (req: Request, res: Response) => {
    try {
      let result;
      if (postgresManager.isConfigured()) {
        result = await agentRuntimeService.syncFromPostgres();
      } else {
        result = agentRuntimeService.recoverState();
      }
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/operations/workers/:agentId/reset', (req: Request, res: Response) => {
    const updated = agentRuntimeService.resetWorkerState(req.params.agentId);
    if (!updated) return res.status(404).json({ error: `Worker for agent ${req.params.agentId} not found` });
    res.json({ success: true, worker: updated });
  });

  apiRouter.post('/operations/cleanup-stale-approvals', (req: Request, res: Response) => {
    const cleaned = executionManager.cleanupExpiredApprovals();
    res.json({ success: true, expiredApprovalsCleaned: cleaned });
  });

  // =========================================================================
  // REVIEW & QUALITY ASSURANCE CENTER ROUTES
  // =========================================================================
  apiRouter.get('/review/latest', async (req: Request, res: Response) => {
    try {
      let report = reviewService.getLatestReport();
      if (!report) {
        report = await reviewService.executeCompleteReview();
      }
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/review/run', async (req: Request, res: Response) => {
    try {
      const report = await reviewService.executeCompleteReview();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/review/reports', (req: Request, res: Response) => {
    const reports = reviewService.getReportsHistory();
    res.json({ reports });
  });

  apiRouter.get('/review/reports/:id', (req: Request, res: Response) => {
    const report = reviewService.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: `Review report ${req.params.id} not found` });
    res.json(report);
  });

  apiRouter.get('/review/fixes', (req: Request, res: Response) => {
    const fixes = reviewService.getAvailableFixes();
    res.json({ fixes });
  });

  apiRouter.post('/review/fixes/:fixId/apply', async (req: Request, res: Response) => {
    try {
      const confirmed = req.body?.confirmed === true;
      const result = await reviewService.applyFix(req.params.fixId, confirmed);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/review/tests/run', async (req: Request, res: Response) => {
    try {
      const report = await reviewService.executeCompleteReview();
      res.json({
        success: true,
        tests: report.metrics.tests,
        timestamp: report.timestamp
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount API router at BOTH '/api' AND root '/'
  // This guarantees that whether Vercel preserves '/api/health' or rewrites to '/health', it resolves correctly.
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // Root document preview handler (serves index.html with appropriate security headers)
  app.get('/', (req: Request, res: Response) => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send('<!doctype html><html><head><title>AI Heaven</title></head><body><div id="root"></div></body></html>');
  });

  // Fallback 404 handler for unknown API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Safe Error Handler: Log safely without leaking credentials, return 500 JSON
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = res.getHeader('X-Request-Id') || 'unknown';
    // Redact any secrets from the error message before logging
    const safeMessage = (err.message || 'Internal Server Error')
      .replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, 'password="[REDACTED]"')
      .replace(/postgres:\/\/[^@]+@/gi, 'postgres://[REDACTED]@')
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');

    console.error(`[API Error][${requestId}]`, safeMessage);

    res.status(500).json({
      error: 'Internal Server Error',
      request_id: requestId,
      message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : safeMessage
    });
  });

  return app;
}

export const app = createExpressApp();
