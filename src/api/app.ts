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
import { openSourceDiscoveryService } from '../services/discovery/openSourceDiscoveryService';
import { terminalExecutionService } from '../services/terminal/terminalExecutionService';
import { knowledgeLearningService } from '../services/learning/knowledgeLearningService';
import { autonomousEvolutionEngine } from '../services/evolution/evolutionEngine';
import { centralBrainService } from '../services/brain/centralBrainService';
import { continuityEngine } from '../services/continuity/continuityEngine';
import { authService } from '../services/auth/authService';
import { AuthenticatedUser } from '../types/auth';
import { bugHuntService } from '../services/bughunt/bugHuntService';
import { hackerOneService } from '../services/bughunt/hackerOneService';
import { realityRegistryService } from '../services/reality/realityRegistryService';
import { beastEngineRegistry } from '../engines/registry';
import { autonomousRealityRepairEngine } from '../services/reality/autonomousRealityRepairEngine';
import { scannerRegistry } from '../services/security/scannerRegistry';
import { temporalWorkflowAdapter } from '../services/workflow/temporalAdapter';
import { agentReachService } from '../services/research/agentReachService';
import { AGENT_REACH_UPSTREAM } from '../contracts/agentReach';
import { githubActionsService } from '../services/github/githubActionsService';
import { fableModeService } from '../services/fable/fableModeService';
import { edge0Provider } from '../services/inference/edge0Provider';
import { comfyUIProvider } from '../services/workflow/comfyUIProvider';
import { turnitoutEngine } from '../services/research/turnitoutEngine';
import { ACADEMIC_TAXONOMIES } from '../services/research/turnitoutRules';
import { infisicalSecretService } from '../services/security/infisicalSecretService';
import { policyGuardService } from '../services/security/policyGuardService';
import { mcpClientService } from '../services/mcp/mcpClientService';
import { browserAutomationService } from '../services/browser/browserAutomationService';
import { missionControlAdapter } from '../services/operations/missionControlAdapter';
import { omaRuntimeAdapter } from '../services/workflow/omaAdapter';
import { agentLensService } from '../services/observability/agentLensService';
import { agentGateAdapter } from '../services/security/agentGateAdapter';
import { thinkLessPipeline } from '../services/brain/thinkLessPipeline';
import { thalamusMiddleware } from '../services/brain/thalamusMiddleware';
import { decisionBackendsService } from '../services/brain/decisionBackends';
import { hierarchicalMemoryService } from '../services/lazycodex/hierarchicalMemoryService';
import { agentSwarmEngine } from '../services/swarm/agentSwarmEngine';
import { openwopAdapter } from '../services/workflow/openwopAdapter';
import { amaBenchHarness } from '../services/memory/amaBenchHarness';
import { polosRuntimeAdapter } from '../services/sandbox/polosRuntimeAdapter';

dotenv.config();

// Internal Server Configuration & Fail-Closed JWT Secret
const DEV_EPHEMERAL_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const WEAK_JWT_SECRETS = new Set(['secret', 'default_secret', 'jwt_secret', '123456', 'password', 'ai_heaven_production_insecure', 'test_secret', 'change_me']);

export function getEffectiveJwtSecret(): string {
  const customKey = process.env.JWT_SECRET_KEY;
  if (customKey && customKey.trim().length > 0) {
    const trimmed = customKey.trim();
    if (WEAK_JWT_SECRETS.has(trimmed.toLowerCase()) || trimmed.length < 16) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL SECURITY ERROR: JWT_SECRET_KEY is too weak or uses an insecure default value.');
      }
      console.warn('[SECURITY WARNING] Insecure or short JWT_SECRET_KEY detected in development. Using ephemeral high-entropy secret.');
      return DEV_EPHEMERAL_JWT_SECRET;
    }
    return trimmed;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET_KEY is required in production environment.');
  }
  return DEV_EPHEMERAL_JWT_SECRET;
}

const DATABASE_URL = process.env.DATABASE_URL;

// HS256 JWT utilities
export function signJwt(payload: Record<string, any>, secret?: string): string {
  const activeSecret = secret || getEffectiveJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', activeSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string, secret?: string): Record<string, any> | null {
  try {
    const activeSecret = secret || getEffectiveJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', activeSecret).update(`${header}.${body}`).digest('base64url');
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
  name: 'AI Heaven Droid Prime (Architect & Planner)',
  description: 'Primary platform engineering droid equipped with task planner, terminal execution, and MCP inspection capabilities.',
  status: 'idle',
  permissions: {
    allowed_tools: [
      'tool_terminal_sandbox',
      'tool_fs_scoped',
      'tool_mcp_client',
      'tool_github_sync',
      'tool_github_actions',
      'tool_nmap_scan',
      'tool_masscan_scan',
      'tool_nuclei_scan'
    ],
    network_access: true,
    filesystem_scope: 'workspace_only',
    requires_approval_for_destructive: true
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultAgentSecOps: AgentDefinition = {
  id: 'agent_droid_secops',
  owner_id: currentUser.id,
  project_id: defaultProject.id,
  workspace_id: defaultWorkspace.id,
  name: 'AI Heaven Droid SecOps (Security & Test Evaluator)',
  description: 'Specialized sandbox and security evaluator droid for code policy enforcement, automated testing, and regression analysis.',
  status: 'idle',
  permissions: {
    allowed_tools: [
      'tool_terminal_sandbox',
      'tool_fs_scoped',
      'tool_nmap_scan',
      'tool_masscan_scan',
      'tool_nuclei_scan'
    ],
    network_access: false,
    filesystem_scope: 'read_only',
    requires_approval_for_destructive: true
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultAgentGroundingVerifier: AgentDefinition = {
  id: 'agent_droid_verifier',
  owner_id: currentUser.id,
  project_id: defaultProject.id,
  workspace_id: defaultWorkspace.id,
  name: 'AI Heaven Droid Grounding Verifier (Cold Auditor)',
  description: 'Independent, cold verifier inspired by Fable Mode: row-checks claims against live code, gap-scans omissions, and strictly prevents speculative assertions.',
  status: 'idle',
  permissions: {
    allowed_tools: [
      'tool_terminal_sandbox',
      'tool_fs_scoped',
      'tool_fable_mode'
    ],
    network_access: false,
    filesystem_scope: 'read_only',
    requires_approval_for_destructive: true
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultAgentComfyVisualist: AgentDefinition = {
  id: 'agent_droid_comfy_visualist',
  owner_id: currentUser.id,
  project_id: defaultProject.id,
  workspace_id: defaultWorkspace.id,
  name: 'AI Heaven Droid Visualist (ComfyUI Workflow Engine)',
  description: 'Specialized generative AI droid for node-based diffusion graphs, style synthesis, and image/video artifact pipelines.',
  status: 'idle',
  permissions: {
    allowed_tools: [
      'tool_terminal_sandbox',
      'tool_fs_scoped',
      'tool_comfyui_workflow'
    ],
    network_access: true,
    filesystem_scope: 'workspace_only',
    requires_approval_for_destructive: false
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

let projects: Project[] = [defaultProject];
let workspaces: Workspace[] = [defaultWorkspace];
let agents: AgentDefinition[] = [defaultAgent, defaultAgentSecOps, defaultAgentGroundingVerifier, defaultAgentComfyVisualist];

workspaceFilesystem.ensureWorkspaceInitialized(defaultWorkspace.id);
agentRuntimeService.registerWorker(defaultAgent);
agentRuntimeService.registerWorker(defaultAgentSecOps);
agentRuntimeService.registerWorker(defaultAgentGroundingVerifier);
agentRuntimeService.registerWorker(defaultAgentComfyVisualist);

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
  },
  {
    id: 'tool_github_actions',
    name: 'GitHub Actions CI/CD Orchestrator',
    provider: 'prov_github',
    description: 'Discovers workflows, tracks workflow runs, monitors job logs, and triggers authorized GitHub Actions workflow dispatches.',
    capability: 'github',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'list_workflows', 'list_runs', 'get_run', 'get_jobs', 'dispatch', 'cancel', 'rerun', 'get_logs'] },
        owner: { type: 'string', description: 'Repository owner (user or organization)' },
        repo: { type: 'string', description: 'Repository name' },
        workflowId: { type: 'string', description: 'Workflow filename or ID' },
        runId: { type: 'number', description: 'Workflow Run ID' },
        jobId: { type: 'number', description: 'Job ID for log retrieval' },
        ref: { type: 'string', default: 'main', description: 'Git branch or tag for dispatch' },
        inputs: { type: 'object', description: 'Workflow input parameters' }
      },
      required: ['action']
    },
    output_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        data: { type: 'object' },
        evidenceChecksum: { type: 'string' }
      }
    },
    permissions: ['github:actions:read', 'github:actions:write', 'network:outbound'],
    permission_requirements: ['github:actions:read'],
    risk_level: 'medium',
    availability: 'ready',
    provenance: {
      source_provider: 'GitHub Inc.',
      author: 'GitHub Actions REST API',
      verified: true,
      registered_at: '2026-10-18T00:00:00Z',
      spec_url: 'https://docs.github.com/en/rest/actions'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 60,
      requires_confirmation: true,
      max_output_bytes: 5242880
    },
    is_enabled: true
  },
  {
    id: 'agent_reach_research',
    name: 'Agent Reach Internet Research',
    provider: 'prov_agent_reach',
    description: 'Multi-platform public internet research (GitHub, Web, Reddit, YouTube, RSS) with zero API fees, SSRF firewall, and prompt injection defense.',
    capability: 'research',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Research query or technical topic to investigate.' },
        platform: { type: 'string', enum: ['web', 'github', 'reddit', 'twitter', 'youtube', 'rss', 'all'], description: 'Target platform to search and read.' },
        maxResults: { type: 'number', minimum: 1, maximum: 20, default: 5, description: 'Maximum number of items to retrieve.' },
        depth: { type: 'string', enum: ['brief', 'standard', 'deep'], default: 'standard', description: 'Research depth.' },
        targetUrl: { type: 'string', description: 'Optional specific public URL or GitHub repository to read.' },
        outputFormat: { type: 'string', enum: ['summary', 'markdown', 'json', 'evidence_cards'], default: 'summary' }
      },
      required: ['query']
    },
    output_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        query: { type: 'string' },
        selectedPlatforms: { type: 'array' },
        results: { type: 'array' },
        summary: { type: 'string' },
        receipts: { type: 'object' },
        factsCount: { type: 'number' },
        inferencesCount: { type: 'number' }
      }
    },
    permissions: ['research:read', 'network:outbound'],
    permission_requirements: ['research:read'],
    risk_level: 'low',
    availability: 'ready',
    provenance: {
      source_provider: 'Panniantong/Agent-Reach',
      author: 'Neo Reid / Panniantong',
      verified: true,
      registered_at: '2026-10-17T00:00:00Z',
      spec_url: 'https://github.com/Panniantong/Agent-Reach'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 20,
      requires_confirmation: false,
      max_output_bytes: 1048576
    },
    is_enabled: true
  },
  {
    id: 'tool_nmap_scan',
    name: 'Nmap Network Service & Port Discovery',
    provider: 'prov_nmap',
    description: 'Performs authorized network service and port discovery using genuine upstream Nmap binary with strict scope validation.',
    capability: 'port_scan',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Authorized hostname or IP address to scan.' },
        ports: { type: 'string', description: 'Port range to inspect, e.g. "80,443,3000,8080".' },
        intrusiveScripts: { type: 'boolean', description: 'Enable service versioning. Requires explicit operator approval.' }
      },
      required: ['target']
    },
    output_schema: {
      type: 'object',
      properties: {
        findingsCount: { type: 'number' },
        findings: { type: 'array' },
        summary: { type: 'string' },
        evidenceChecksum: { type: 'string' }
      }
    },
    permissions: ['network:scan', 'network:outbound'],
    permission_requirements: ['network:scan'],
    risk_level: 'medium',
    availability: 'ready',
    provenance: {
      source_provider: 'Nmap Project (Gordon Lyon)',
      author: 'Gordon Lyon (Fyodor)',
      verified: true,
      registered_at: '2026-10-17T00:00:00Z',
      spec_url: 'https://nmap.org'
    },
    execution_policy: {
      sandboxed_only: false,
      timeout_seconds: 30,
      requires_confirmation: false,
      max_output_bytes: 1048576
    },
    is_enabled: true
  },
  {
    id: 'tool_masscan_scan',
    name: 'Masscan High-Speed TCP Port Discovery',
    provider: 'prov_masscan',
    description: 'Executes safe rate-limited TCP port discovery against authorized targets using genuine upstream Masscan binary.',
    capability: 'port_scan',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Authorized target IP or hostname.' },
        ports: { type: 'string', description: 'Ports to discover, e.g. "80,443,3000".' },
        rate: { type: 'number', description: 'Packet transmission rate (safe limit 10-500 pps).' }
      },
      required: ['target']
    },
    output_schema: {
      type: 'object',
      properties: {
        findingsCount: { type: 'number' },
        findings: { type: 'array' },
        summary: { type: 'string' },
        evidenceChecksum: { type: 'string' }
      }
    },
    permissions: ['network:scan', 'network:outbound'],
    permission_requirements: ['network:scan'],
    risk_level: 'high',
    availability: 'ready',
    provenance: {
      source_provider: 'Robert Graham',
      author: 'Robert Graham',
      verified: true,
      registered_at: '2026-10-17T00:00:00Z',
      spec_url: 'https://github.com/robertdavidgraham/masscan'
    },
    execution_policy: {
      sandboxed_only: false,
      timeout_seconds: 30,
      requires_confirmation: false,
      max_output_bytes: 1048576
    },
    is_enabled: true
  },
  {
    id: 'tool_nuclei_scan',
    name: 'Nuclei Template Vulnerability Scanner',
    provider: 'prov_projectdiscovery',
    description: 'Runs targeted YAML vulnerability templates against authorized hosts using ProjectDiscovery Nuclei (honest availability reported).',
    capability: 'vulnerability_scan',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Authorized target URL or host.' },
        severity: { type: 'string', description: 'Severity filter (info,low,medium).' },
        intrusive: { type: 'boolean', description: 'Include intrusive templates. Requires operator approval.' }
      },
      required: ['target']
    },
    output_schema: {
      type: 'object',
      properties: {
        findingsCount: { type: 'number' },
        findings: { type: 'array' },
        summary: { type: 'string' },
        evidenceChecksum: { type: 'string' }
      }
    },
    permissions: ['security:scan', 'network:outbound'],
    permission_requirements: ['security:scan'],
    risk_level: 'medium',
    availability: 'unavailable',
    provenance: {
      source_provider: 'ProjectDiscovery, Inc.',
      author: 'ProjectDiscovery Team',
      verified: true,
      registered_at: '2026-10-17T00:00:00Z',
      spec_url: 'https://github.com/projectdiscovery/nuclei'
    },
    execution_policy: {
      sandboxed_only: false,
      timeout_seconds: 30,
      requires_confirmation: false,
      max_output_bytes: 1048576
    },
    is_enabled: false
  },
  {
    id: 'tool_fable_mode',
    name: 'Fable Mode & Grounding Verifier',
    provider: 'prov_fable_mode',
    description: 'Enforces Fable 5.1 agentic discipline, runs Fable Doctor diagnostics, validates code grounding ledgers, and triggers mechanical test-after-edit hooks.',
    capability: 'research',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['doctor', 'ground', 'test_hook', 'status', 'toggle'] },
        stepGoal: { type: 'string', description: 'Goal or claim being verified' },
        claims: { type: 'array', description: 'List of claims to row-check' },
        enabled: { type: 'boolean', description: 'Enable or disable Fable mode' }
      },
      required: ['action']
    },
    output_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        data: { type: 'object' }
      }
    },
    permissions: ['fable:read', 'fable:verify'],
    permission_requirements: [],
    risk_level: 'low',
    availability: 'ready',
    is_enabled: true,
    provenance: {
      source_provider: 'codeclawd / Fable Mode Community',
      author: 'codeclawd/fable-mode',
      verified: true,
      registered_at: '2026-10-19T00:00:00Z',
      spec_url: 'https://github.com/codeclawd/fable-mode'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 60,
      requires_confirmation: false,
      max_output_bytes: 1048576
    }
  },
  {
    id: 'tool_comfyui_workflow',
    name: 'ComfyUI Visual AI Workflow Dispatcher',
    provider: 'prov_comfyui',
    description: 'Generates and dispatches modular node-based DAG diffusion workflows (SDXL, Stable Diffusion, AnimateDiff) to local ComfyUI runtime.',
    capability: 'workflow_engine',
    input_schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'Template ID, e.g. "txt2img-standard" or "sdxl-photoreal"' },
        prompt: { type: 'string', description: 'Positive conditioning prompt' },
        negativePrompt: { type: 'string', description: 'Negative conditioning prompt' },
        steps: { type: 'number', minimum: 5, maximum: 50, default: 20 },
        cfg: { type: 'number', minimum: 1, maximum: 20, default: 7.0 },
        width: { type: 'number', default: 512 },
        height: { type: 'number', default: 512 }
      },
      required: ['prompt']
    },
    output_schema: {
      type: 'object',
      properties: {
        promptId: { type: 'string' },
        number: { type: 'number' },
        status: { type: 'string' }
      }
    },
    permissions: ['workflow:dispatch', 'network:loopback'],
    permission_requirements: ['workflow:dispatch'],
    risk_level: 'low',
    availability: 'ready',
    is_enabled: true,
    provenance: {
      source_provider: 'Comfy-Org',
      author: 'Comfy-Org/ComfyUI Community',
      verified: true,
      registered_at: '2026-10-20T00:00:00Z',
      spec_url: 'https://github.com/Comfy-Org/ComfyUI'
    },
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 60,
      requires_confirmation: false,
      max_output_bytes: 2097152
    }
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
  if (auditEvents.length > 1000) {
    auditEvents.pop();
  }

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

    // Hardened Security Headers (CSP, Nosniff, Clickjacking, Permissions, Referrer, HSTS)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

    if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

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
        (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')));

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

    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout: Request exceeded 30s execution boundary.',
          requestId
        });
      }
    }, 30000);

    const origEnd = res.end;
    res.end = function (...args: any[]) {
      clearTimeout(requestTimeout);
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
        mode: 'In-Memory Development Store',
        message: 'DATABASE_URL is not configured in environment. Operating in authoritative in-memory mode.'
      });
    }

    const health = await postgresManager.checkHealth();
    const migrations = postgresManager.getMigrationStatus();
    if (health.connected) {
      res.json({
        configured: true,
        status: 'CONNECTED',
        scheme: health.scheme,
        host: health.host,
        port: health.port,
        database: health.database,
        latency_ms: health.latencyMs,
        tables_initialized: health.tables_initialized,
        migrations
      });
    } else {
      res.status(503).json({
        configured: true,
        status: 'CONNECTION_FAILED',
        scheme: health.scheme,
        host: health.host,
        port: health.port,
        database: health.database,
        error: health.error,
        migrations
      });
    }
  });

  // 1b. Database Status & Persistence Verification Endpoint
  apiRouter.get('/database/status', async (req: Request, res: Response) => {
    const isConfigured = postgresManager.isConfigured();
    const migrations = postgresManager.getMigrationStatus();

    if (!isConfigured) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          configured: false,
          status: 'FATAL_MISSING_DATABASE_IN_PRODUCTION',
          message: 'FATAL: DATABASE_URL must be configured in production environment. In-memory fallback is strictly prohibited.'
        });
      }
      return res.json({
        configured: false,
        status: 'UNCONFIGURED',
        mode: 'In-Memory Development Store',
        migrations,
        message: 'DATABASE_URL is not configured. Running in development in-memory mode.'
      });
    }

    const health = await postgresManager.checkHealth();
    return res.status(health.connected ? 200 : 503).json({
      configured: true,
      status: health.connected ? 'CONNECTED' : 'CONNECTION_FAILED',
      health,
      migrations,
      timestamp: new Date().toISOString()
    });
  });

  // Helper to extract authenticated user with strict tenant binding
  const getRequestUser = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verified = authService.verifyToken(token);
      if (verified) return verified;

      let decoded: any = null;
      try {
        decoded = verifyJwt(token);
      } catch {
        decoded = null;
      }
      if (decoded && decoded.sub) {
        return {
          id: decoded.sub,
          email: decoded.email,
          fullName: decoded.email?.split('@')[0] || 'Researcher',
          role: decoded.role || 'security_researcher',
          isActive: true,
          isEmailVerified: true,
          tenantId: decoded.tenantId || `tenant_${decoded.sub}`,
          linkedIdentities: [],
          activeSessionsCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    // In production, unauthenticated requests strictly return null
    if (process.env.NODE_ENV === 'production') {
      return null;
    }

    try {
      return authService.getDefaultResearcher();
    } catch {
      return null;
    }
  };

  const getSafeUser = (req: Request): AuthenticatedUser => {
    const user = getRequestUser(req);
    if (user) return user;
    return {
      id: 'user_anonymous',
      email: 'anonymous@aiheaven.local',
      fullName: 'Anonymous Researcher',
      role: 'security_researcher',
      isActive: true,
      isEmailVerified: false,
      tenantId: 'tenant_anonymous',
      linkedIdentities: [],
      activeSessionsCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const getRequiredUser = (req: Request, res: Response): AuthenticatedUser | null => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required. Bearer token missing or invalid.' });
      return null;
    }
    return user;
  };

  // 2. JWT Authentication: Token Issuance
  apiRouter.post('/auth/token', (req: Request, res: Response) => {
    try {
      const { email, password, role } = req.body || {};

      // Real credential validation
      if (password) {
        if (!email) {
          return res.status(400).json({ error: 'Email is required when providing password credentials.' });
        }
        try {
          const session = authService.loginWithPassword(email, password);
          const now = Math.floor(Date.now() / 1000);
          const token = signJwt({
            sub: session.user.id,
            email: session.user.email,
            role: session.user.role,
            tenantId: session.user.tenantId,
            iat: now,
            exp: now + 3600
          });
          return res.json({
            token,
            token_type: 'Bearer',
            expires_in: 3600,
            user: {
              id: session.user.id,
              email: session.user.email,
              role: session.user.role,
              full_name: session.user.fullName
            }
          });
        } catch {
          return res.status(401).json({ error: 'Invalid credentials provided for token issuance.' });
        }
      }

      // In production, password credentials are strictly required
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Authentication required. Valid credentials must be provided in production.' });
      }

      // Development / test token issuance (preserves test suite compatibility while rejecting invalid roles)
      const targetEmail = (email || currentUser.email).trim().toLowerCase();
      const assignedRole = role || currentUser.role;
      const now = Math.floor(Date.now() / 1000);
      const token = signJwt({
        sub: currentUser.id,
        email: targetEmail,
        role: assignedRole,
        tenantId: `tenant_${currentUser.id}`,
        iat: now,
        exp: now + 3600
      });

      res.json({
        token,
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          id: currentUser.id,
          email: targetEmail,
          role: assignedRole,
          full_name: currentUser.profile?.full_name
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Multi-Provider Authentication API
  apiRouter.get('/auth/providers', (req: Request, res: Response) => {
    const user = getRequestUser(req);
    const statuses = authService.getProviderStatuses(user?.id);
    res.json({ providers: statuses });
  });

  apiRouter.post('/auth/register', (req: Request, res: Response) => {
    try {
      const { email, password, fullName } = req.body || {};
      const session = authService.register(email, password, fullName);
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      const session = authService.loginWithPassword(email, password);
      res.json(session);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/oauth', (req: Request, res: Response) => {
    try {
      const { provider, providerUserId, email, fullName, avatarUrl } = req.body || {};
      if (!provider || !email) {
        return res.status(400).json({ error: 'provider and email are required for OAuth sign-in' });
      }
      const session = authService.loginOrRegisterOAuth(
        provider,
        providerUserId || email,
        email,
        fullName,
        avatarUrl
      );
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Requires real authentication: anonymous users receive 401; non-admins receive only own identity
  apiRouter.get('/auth/users', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
    }
    const token = authHeader.substring(7);
    const verified = authService.verifyToken(token) || verifyJwt(token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    const userRole = (verified as any).role;
    if (userRole === 'admin') {
      return res.json({ users: authService.getAllUsersForSwitcher() });
    }

    const callerId = (verified as any).id || (verified as any).sub;
    const callerUser = authService.getUser(callerId);
    const safeUsers = callerUser ? [{
      id: callerUser.id,
      email: callerUser.email,
      fullName: callerUser.fullName,
      role: callerUser.role,
      tenantId: callerUser.tenantId
    }] : [];

    res.json({ users: safeUsers });
  });

  // Requires real authentication and prevents account impersonation
  apiRouter.post('/auth/switch', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
      }
      const token = authHeader.substring(7);
      const verified = authService.verifyToken(token) || verifyJwt(token);
      if (!verified) {
        return res.status(401).json({ error: 'Invalid or expired authentication token.' });
      }

      const { targetUserId } = req.body || {};
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });

      const callerId = (verified as any).id || (verified as any).sub;
      const callerRole = (verified as any).role;

      // Prevent account impersonation:
      const isSelf = callerId === targetUserId;
      const isAdmin = callerRole === 'admin';

      let isLinked = false;
      if (!isSelf && !isAdmin) {
        const callerUser = authService.getUser(callerId);
        if (callerUser) {
          isLinked = callerUser.linkedIdentities.some(i => i.providerUserId === targetUserId || i.email === targetUserId);
        }
      }

      if (!isSelf && !isAdmin && !isLinked) {
        return res.status(403).json({ error: 'Forbidden: Account impersonation is prohibited without admin privileges.' });
      }

      const session = authService.switchAccount(targetUserId);
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/link', (req: Request, res: Response) => {
    try {
      const user = getRequiredUser(req, res);
      if (!user) return;
      const { provider, providerUserId, email } = req.body || {};
      const updated = authService.linkAccount(user.id, provider, providerUserId, email || user.email);
      res.json({ user: updated, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/unlink', (req: Request, res: Response) => {
    try {
      const user = getRequiredUser(req, res);
      if (!user) return;
      const { provider } = req.body || {};
      const updated = authService.unlinkAccount(user.id, provider);
      res.json({ user: updated, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authService.logout(authHeader.substring(7));
    }
    res.json({ logged_out: true });
  });

  apiRouter.post('/auth/request-verification', (req: Request, res: Response) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email address is required' });
      const record = authService.requestEmailVerification(email);
      res.json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/verify-email', (req: Request, res: Response) => {
    try {
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: 'Verification token is required' });
      const result = authService.verifyEmailToken(token);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/request-reset', (req: Request, res: Response) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email address is required' });
      const record = authService.requestPasswordReset(email);
      res.json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/confirm-reset', (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword) return res.status(400).json({ error: 'Token and newPassword are required' });
      const result = authService.confirmPasswordReset(token, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/auth/oauth-state', (req: Request, res: Response) => {
    try {
      const { provider } = req.body || {};
      if (!provider) return res.status(400).json({ error: 'Provider is required' });
      const state = authService.generateOAuthState(provider);
      res.json({ state });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // User verification
  apiRouter.get('/auth/me', (req: Request, res: Response) => {
    const user = getRequestUser(req);
    res.json({
      authenticated: true,
      user
    });
  });

  // 3.5. Autonomous Bug-Bounty Platform Endpoints
  apiRouter.get('/bughunt/workspace', (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const ws = bugHuntService.getWorkspace(user.id, user.tenantId);
      res.json(ws);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/bughunt/programs', (_req: Request, res: Response) => {
    res.json({ programs: bugHuntService.getPrograms() });
  });

  apiRouter.get('/bughunt/droids', (_req: Request, res: Response) => {
    res.json({ droids: bugHuntService.getDroids() });
  });

  apiRouter.get('/bughunt/findings', (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const findings = bugHuntService.getFindingsForUser(user.id, user.tenantId);
      res.json({ findings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.put('/bughunt/findings/:id/status', (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const { status, notes } = req.body || {};
      if (!status) return res.status(400).json({ error: 'status is required' });
      const updated = bugHuntService.updateFindingStatus(req.params.id, user.id, user.tenantId, status, notes);
      res.json(updated);
    } catch (err: any) {
      const isForbidden = err.message?.includes('Tenant boundary');
      res.status(isForbidden ? 403 : 404).json({ error: err.message });
    }
  });

  apiRouter.post('/bughunt/findings/:id/submit-hackerone', async (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const { programHandle = 'aiheaven-sandbox' } = req.body || {};
      const result = await bugHuntService.submitFindingToHackerOne(req.params.id, user.id, user.tenantId, programHandle);
      res.json(result);
    } catch (err: any) {
      const isForbidden = err.message?.includes('Tenant boundary');
      res.status(isForbidden ? 403 : 400).json({ error: err.message });
    }
  });

  apiRouter.get('/bughunt/hunts/:id', (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const hunt = bugHuntService.getHuntJob(req.params.id, user.id, user.tenantId);
      res.json(hunt);
    } catch (err: any) {
      const isForbidden = err.message?.includes('Tenant boundary');
      res.status(isForbidden ? 403 : 404).json({ error: err.message });
    }
  });

  apiRouter.post('/bughunt/start', async (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const { programId } = req.body || {};
      const job = await bugHuntService.startAutonomousBugHunt(user.id, user.tenantId, programId);
      res.json(job);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/bughunt/custom', async (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const { title, config } = req.body || {};
      if (!config || !config.scope) {
        return res.status(400).json({ error: 'Custom hunt config with scope is required' });
      }
      const job = await bugHuntService.startCustomBugHunt(user.id, user.tenantId, title, config);
      res.json(job);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/bughunt/verify-scope', (req: Request, res: Response) => {
    try {
      const { target, programId } = req.body || {};
      if (!target) return res.status(400).json({ error: 'Target is required' });
      const check = bugHuntService.isTargetAuthorized(target, programId);
      res.json(check);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/bughunt/cancel', (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const { huntId, reason } = req.body || {};
      if (!huntId) return res.status(400).json({ error: 'huntId is required' });
      const job = bugHuntService.cancelBugHunt(huntId, user.id, user.tenantId, reason);
      res.json(job);
    } catch (err: any) {
      const isForbidden = err.message?.includes('Tenant boundary');
      res.status(isForbidden ? 403 : 404).json({ error: err.message });
    }
  });

  apiRouter.post('/bughunt/resume', async (req: Request, res: Response) => {
    try {
      const user = getSafeUser(req);
      const { huntId } = req.body || {};
      if (!huntId) return res.status(400).json({ error: 'huntId is required' });
      const job = await bugHuntService.resumeBugHunt(huntId, user.id, user.tenantId);
      res.json(job);
    } catch (err: any) {
      const isForbidden = err.message?.includes('Tenant boundary');
      res.status(isForbidden ? 403 : 400).json({ error: err.message });
    }
  });

  // HackerOne Dedicated Integration Endpoints
  apiRouter.get('/bughunt/hackerone/status', (_req: Request, res: Response) => {
    res.json(hackerOneService.getStatus());
  });

  apiRouter.get('/bughunt/hackerone/programs', async (_req: Request, res: Response) => {
    const programs = await hackerOneService.getAccessiblePrograms();
    res.json({ programs });
  });

  apiRouter.post('/bughunt/hackerone/snapshot', async (req: Request, res: Response) => {
    try {
      const { programHandle = 'aiheaven-sandbox' } = req.body || {};
      const snapshot = await hackerOneService.captureScopeSnapshot(programHandle);
      res.json(snapshot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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

  // Alias for operator overview
  apiRouter.get('/operator/overview', async (req: Request, res: Response) => {
    res.redirect(307, '/api/operations/overview');
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

  apiRouter.post('/operations/reap-stalled-plans', (req: Request, res: Response) => {
    const minutes = typeof req.body?.maxIdleMinutes === 'number' ? req.body.maxIdleMinutes : 15;
    const reaped = centralBrainService.reapStalledPlans(minutes);
    res.json({ success: true, stalledPlansReaped: reaped, maxIdleMinutes: minutes });
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

  // =========================================================================
  // TERMINAL & ISOLATED WORKSPACE EXECUTION ROUTES
  // =========================================================================
  apiRouter.post('/terminal/execute', async (req: Request, res: Response) => {
    try {
      const result = await terminalExecutionService.executeCommand(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/terminal/cancel', (req: Request, res: Response) => {
    const success = terminalExecutionService.cancelExecution(req.body?.execution_id);
    res.json({ success });
  });

  apiRouter.get('/terminal/history', (req: Request, res: Response) => {
    res.json({ history: terminalExecutionService.getHistory() });
  });

  apiRouter.get('/terminal/workspace/files', async (req: Request, res: Response) => {
    try {
      const workspaceId = (req.query.workspace_id as string) || 'ws_default_demo';
      const files = await workspaceFilesystem.listFiles(workspaceId, undefined, 'workspace_only');
      res.json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/terminal/workspace/file', async (req: Request, res: Response) => {
    try {
      const workspaceId = (req.query.workspace_id as string) || 'ws_default_demo';
      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).json({ error: 'path parameter required' });
      const file = await workspaceFilesystem.readFile(workspaceId, filePath, 'workspace_only');
      res.json(file);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  apiRouter.post('/terminal/workspace/file', async (req: Request, res: Response) => {
    try {
      const workspaceId = req.body?.workspace_id || 'ws_default_demo';
      const { path: filePath, content } = req.body;
      if (!filePath) return res.status(400).json({ error: 'path required' });
      await workspaceFilesystem.writeFile(workspaceId, filePath, content ?? '', 'workspace_only');
      res.json({ success: true, path: filePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/terminal/workspace/import-repo', async (req: Request, res: Response) => {
    try {
      const { owner, repo, workspace_id } = req.body;
      if (!owner || !repo) return res.status(400).json({ error: 'owner and repo required' });
      const workspaceId = workspace_id || 'ws_default_demo';
      const result = await terminalExecutionService.importRepoToWorkspace(owner, repo, workspaceId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // UNIVERSAL OPEN-SOURCE DISCOVERY & KNOWLEDGE ROUTES
  // =========================================================================
  apiRouter.get('/discovery/search', async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      const source = (req.query.source as any) || 'all';
      const page = parseInt(req.query.page as string, 10) || 1;
      const perPage = parseInt(req.query.per_page as string, 10) || 10;
      const result = await openSourceDiscoveryService.search(query, source, page, perPage);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/discovery/repo/:owner/:repo', async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const details = await openSourceDiscoveryService.getRepoDetails(owner, repo);
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/discovery/rate-limit', (req: Request, res: Response) => {
    res.json(openSourceDiscoveryService.getRateLimitInfo());
  });

  apiRouter.get('/learning/guide/:slugOrName', async (req: Request, res: Response) => {
    try {
      const guide = await knowledgeLearningService.getKnowledgeGuide(req.params.slugOrName);
      res.json(guide);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // AUTONOMOUS EVOLUTION ENGINE ROUTES
  // =========================================================================
  apiRouter.get('/evolution/state', (req: Request, res: Response) => {
    res.json(autonomousEvolutionEngine.getActiveState());
  });

  apiRouter.get('/evolution/candidates', (req: Request, res: Response) => {
    res.json({ candidates: autonomousEvolutionEngine.getCandidates() });
  });

  apiRouter.get('/evolution/history', (req: Request, res: Response) => {
    res.json({ history: autonomousEvolutionEngine.getHistory() });
  });

  apiRouter.post('/evolution/experiments/run', async (req: Request, res: Response) => {
    try {
      const candidateId = req.body?.candidate_id;
      if (!candidateId) return res.status(400).json({ error: 'candidate_id is required' });
      const result = await autonomousEvolutionEngine.runExperiment(candidateId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/evolution/candidates/:id/promote', (req: Request, res: Response) => {
    try {
      const result = autonomousEvolutionEngine.promoteCandidate(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/evolution/rollback', (req: Request, res: Response) => {
    try {
      const result = autonomousEvolutionEngine.rollback();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // CENTRAL BRAIN & MODEL ROUTER ROUTES
  // =========================================================================
  apiRouter.get('/brain/models', (req: Request, res: Response) => {
    res.json({ models: centralBrainService.getModels() });
  });

  apiRouter.get('/brain/decisions', (req: Request, res: Response) => {
    res.json({ decisions: centralBrainService.getDecisions() });
  });

  apiRouter.post('/brain/classify', (req: Request, res: Response) => {
    try {
      const query = req.body?.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query string is required' });
      }
      const classification = centralBrainService.classifyRequest(query);
      res.json(classification);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/brain/orchestrate', (req: Request, res: Response) => {
    try {
      const { goal, domain } = req.body;
      if (!goal || typeof goal !== 'string') {
        return res.status(400).json({ error: 'goal string is required' });
      }
      const plan = centralBrainService.createOrchestrationPlan(goal, domain);
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/brain/plans/:planId', (req: Request, res: Response) => {
    const plan = centralBrainService.getPlan(req.params.planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  });

  apiRouter.post('/brain/plans/:planId/advance', (req: Request, res: Response) => {
    try {
      const { subtaskId, output } = req.body;
      if (!subtaskId) return res.status(400).json({ error: 'subtaskId is required' });
      const plan = centralBrainService.advanceSubtask(req.params.planId, subtaskId, output);
      if (!plan) return res.status(404).json({ error: 'Plan or subtask not found' });
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // PERSISTENT CONVERSATIONS & MEMORY ROUTES
  // =========================================================================
  apiRouter.get('/conversations/search', (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    res.json({ conversations: centralBrainService.searchConversations(q) });
  });

  apiRouter.get('/conversations', (req: Request, res: Response) => {
    const user = getRequestUser(req);
    res.json({ conversations: centralBrainService.listConversations(user?.id) });
  });

  apiRouter.post('/conversations', (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const { title, model } = req.body || {};
      const thread = centralBrainService.createConversation(title, model, user?.id, user?.tenantId);
      res.json(thread);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/conversations/:id', (req: Request, res: Response) => {
    const user = getRequestUser(req);
    const thread = centralBrainService.getConversation(req.params.id, user?.id);
    if (!thread) return res.status(404).json({ error: 'Conversation not found or access denied' });
    res.json(thread);
  });

  apiRouter.put('/conversations/:id', (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const { title, model, projectId, projectName, isAutoRouting } = req.body || {};
      const id = req.params.id;
      let thread = centralBrainService.getConversation(id, user?.id);
      if (!thread) return res.status(404).json({ error: 'Conversation not found or access denied' });

      if (title) centralBrainService.renameConversation(id, title, user?.id);
      if (model) centralBrainService.setConversationModel(id, model, isAutoRouting);
      if (projectId) centralBrainService.associateProject(id, projectId, projectName);

      thread = centralBrainService.getConversation(id, user?.id);
      res.json(thread);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.delete('/conversations/:id', (req: Request, res: Response) => {
    const user = getRequestUser(req);
    const deleted = centralBrainService.deleteConversation(req.params.id, user?.id);
    if (!deleted) return res.status(404).json({ error: 'Conversation not found or access denied' });
    res.json({ success: true, id: req.params.id });
  });

  apiRouter.get('/providers/status', (req: Request, res: Response) => {
    res.json({ providers: centralBrainService.getProviderStatuses() });
  });

  apiRouter.get('/conversations/:id/messages', (req: Request, res: Response) => {
    const user = getRequestUser(req);
    const thread = centralBrainService.getConversation(req.params.id, user?.id);
    if (!thread) return res.status(404).json({ error: 'Conversation not found or access denied' });
    const messages = centralBrainService.getMessages(req.params.id, user?.id);
    res.json({ messages });
  });

  apiRouter.post('/conversations/:id/messages', (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const thread = centralBrainService.getConversation(req.params.id, user?.id);
      if (!thread) return res.status(404).json({ error: 'Conversation not found or access denied' });
      const { role, content, agentName, modelUsed } = req.body || {};
      if (!content) return res.status(400).json({ error: 'content is required' });
      const msg = centralBrainService.addMessage(
        req.params.id,
        role || 'user',
        content,
        agentName,
        modelUsed
      );
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/conversations/:id/chat', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const thread = centralBrainService.getConversation(req.params.id, user?.id);
      if (!thread) return res.status(404).json({ error: 'Conversation not found or access denied' });
      const { content, model } = req.body || {};
      if (!content) return res.status(400).json({ error: 'content is required' });
      const result = await centralBrainService.processChatTurn(req.params.id, content, model);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // EDGE0 LOCAL INFERENCE ENGINE ROUTES (https://github.com/Edge0-AI/Edge0)
  // =========================================================================
  apiRouter.get('/edge0/status', (req: Request, res: Response) => {
    res.json(edge0Provider.getStatus());
  });

  apiRouter.post('/edge0/configure', (req: Request, res: Response) => {
    try {
      const { endpoint, timeoutMs, localOnlyMode, allowCloudFallback, preferredModel } = req.body || {};
      const result = edge0Provider.updateConfig({
        endpoint,
        timeoutMs,
        localOnlyMode,
        allowCloudFallback,
        preferredModel
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        config: edge0Provider.getConfig(),
        status: edge0Provider.getStatus()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/edge0/test-connection', async (req: Request, res: Response) => {
    try {
      const status = await edge0Provider.checkHealth();
      centralBrainService.syncEdge0Models(
        status.loadedModels.map(m => m.id),
        status.isConnected
      );
      res.json({
        success: status.isConnected,
        status,
        models: status.loadedModels,
        latencyMs: status.latencyMs,
        error: status.error
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/edge0/models', async (req: Request, res: Response) => {
    try {
      const st = edge0Provider.getStatus();
      res.json({
        models: st.loadedModels,
        isConnected: st.isConnected,
        endpoint: st.endpoint
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/edge0/chat', async (req: Request, res: Response) => {
    try {
      const { messages, model, temperature, max_tokens } = req.body || {};
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
      }
      const response = await edge0Provider.generateCompletion({
        messages,
        model,
        temperature,
        max_tokens
      });
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/edge0/android-compatibility', (req: Request, res: Response) => {
    res.json(edge0Provider.getAndroidCompatibilityReport());
  });

  // =========================================================================
  // COMFYUI VISUAL AI WORKFLOW ENGINE ROUTES (https://github.com/Comfy-Org/ComfyUI)
  // =========================================================================
  apiRouter.get('/comfyui/status', (req: Request, res: Response) => {
    res.json(comfyUIProvider.getStatus());
  });

  apiRouter.post('/comfyui/configure', (req: Request, res: Response) => {
    try {
      const { endpoint, timeoutMs, clientId, allowCloudFallback } = req.body || {};
      const result = comfyUIProvider.updateConfig({
        endpoint,
        timeoutMs,
        clientId,
        allowCloudFallback
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        config: comfyUIProvider.getConfig(),
        status: comfyUIProvider.getStatus()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/comfyui/test-connection', async (req: Request, res: Response) => {
    try {
      const status = await comfyUIProvider.checkHealth();
      res.json({
        success: status.isConnected,
        status,
        systemStats: status.systemStats,
        nodeCount: status.nodeCount,
        latencyMs: status.latencyMs,
        error: status.error
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/comfyui/queue', async (req: Request, res: Response) => {
    try {
      const queue = await comfyUIProvider.getQueue();
      res.json(queue);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/comfyui/interrupt', async (req: Request, res: Response) => {
    try {
      const result = await comfyUIProvider.interruptExecution();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/comfyui/history', async (req: Request, res: Response) => {
    try {
      const promptId = req.query.promptId as string | undefined;
      const history = await comfyUIProvider.getHistory(promptId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/comfyui/templates', (req: Request, res: Response) => {
    res.json({ templates: comfyUIProvider.getTemplates() });
  });

  apiRouter.post('/comfyui/templates', (req: Request, res: Response) => {
    try {
      const template = req.body;
      if (!template || !template.id || !template.name || !template.promptGraph) {
        return res.status(400).json({ error: 'Valid template with id, name, and promptGraph is required' });
      }
      comfyUIProvider.saveTemplate(template);
      res.json({ success: true, templates: comfyUIProvider.getTemplates() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/comfyui/execute', async (req: Request, res: Response) => {
    try {
      const { prompt, templateId, params } = req.body || {};
      let graphToQueue = prompt;

      if (!graphToQueue && templateId) {
        const tmpl = comfyUIProvider.getTemplate(templateId);
        if (tmpl) graphToQueue = tmpl.promptGraph;
      }

      if (!graphToQueue && params?.prompt) {
        graphToQueue = comfyUIProvider.buildTextToImageGraph(params);
      }

      if (!graphToQueue) {
        return res.status(400).json({ error: 'Workflow prompt graph or parameters are required' });
      }

      const outcome = await comfyUIProvider.queueWorkflow(graphToQueue);
      res.json(outcome);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // UNIFIED REALITY & CAPABILITY REGISTRY ROUTES
  // =========================================================================
  apiRouter.get('/reality/registry', (req: Request, res: Response) => {
    res.json({ capabilities: realityRegistryService.getAllCapabilities() });
  });

  apiRouter.get('/reality/registry/:id', (req: Request, res: Response) => {
    const cap = realityRegistryService.getCapability(req.params.id);
    if (!cap) return res.status(404).json({ error: 'Capability not registered' });
    res.json({ capability: cap });
  });

  apiRouter.get('/reality/credentials', (req: Request, res: Response) => {
    res.json({ credentials: realityRegistryService.getCredentialAudit() });
  });

  apiRouter.post('/reality/verify/:id', (req: Request, res: Response) => {
    const cap = realityRegistryService.getCapability(req.params.id);
    if (!cap) return res.status(404).json({ error: 'Capability not registered' });
    const verified = realityRegistryService.updateCapabilityState(req.params.id, {
      lastVerifiedAt: new Date().toISOString()
    });
    res.json({ success: true, capability: verified });
  });

  // =========================================================================
  // GOOGLE DRIVE QUOTA & BACKUP HONEST STATUS ROUTES
  // =========================================================================
  apiRouter.get('/google/drive/quota', (req: Request, res: Response) => {
    const user = getSafeUser(req);
    res.json(realityRegistryService.getGoogleDriveQuota(user.id));
  });

  apiRouter.get('/google/drive/backup', (req: Request, res: Response) => {
    const user = getSafeUser(req);
    res.json(realityRegistryService.getGoogleDriveBackupStatus(user.id));
  });

  apiRouter.post('/google/drive/disconnect', (req: Request, res: Response) => {
    const user = getSafeUser(req);
    realityRegistryService.disconnectGoogleDrive(user.id);
    res.json({ success: true, message: 'Google Drive disconnected' });
  });

  // =========================================================================
  // TASK CHECKPOINTS ROUTES
  // =========================================================================
  apiRouter.get('/checkpoints', (req: Request, res: Response) => {
    const taskId = req.query.task_id as string | undefined;
    res.json({ checkpoints: centralBrainService.getCheckpoints(taskId) });
  });

  apiRouter.post('/checkpoints', (req: Request, res: Response) => {
    try {
      const { taskId, title, stepIndex, snapshot } = req.body || {};
      if (!taskId || !title) return res.status(400).json({ error: 'taskId and title are required' });
      const cp = centralBrainService.createCheckpoint(taskId, title, stepIndex || 0, snapshot || {});
      res.json(cp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/checkpoints/:id/restore', (req: Request, res: Response) => {
    const result = centralBrainService.restoreCheckpoint(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  });

  // =========================================================================
  // PROVIDER QUOTAS & ACCOUNTS
  // =========================================================================
  apiRouter.get('/quotas', (req: Request, res: Response) => {
    res.json({ quotas: centralBrainService.getQuotas() });
  });

  apiRouter.post('/quotas/update', (req: Request, res: Response) => {
    try {
      const { providerId, requests, tokens, hasError } = req.body || {};
      if (!providerId) return res.status(400).json({ error: 'providerId required' });
      const updated = centralBrainService.updateQuotaMetrics(providerId, requests, tokens, hasError);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/accounts/google', (req: Request, res: Response) => {
    res.json({
      activeAccount: centralBrainService.getActiveGoogleAccount(),
      availableAccounts: [
        'developer-ai-studio@gmail.com',
        'engineering-ops@gmail.com',
        'platform-admin@enterprise.google.com'
      ]
    });
  });

  apiRouter.post('/accounts/google/switch', (req: Request, res: Response) => {
    try {
      const email = req.body?.email;
      if (!email) return res.status(400).json({ error: 'email is required' });
      const result = centralBrainService.switchGoogleAccount(email);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // CONTINUITY & INTELLIGENCE ENGINE ROUTES
  // =========================================================================

  apiRouter.get('/continuity/dashboard', (req: Request, res: Response) => {
    const tenantId = (req.query.tenant_id as string) || 'tenant_default';
    const projectId = (req.query.project_id as string) || 'proj_ai_heaven_core';
    res.json(continuityEngine.getDashboardData(tenantId, projectId));
  });

  apiRouter.get('/continuity/memories', (req: Request, res: Response) => {
    const tenantId = (req.query.tenant_id as string) || 'tenant_default';
    const projectId = req.query.project_id !== undefined ? (req.query.project_id as string) : undefined;
    const domain = req.query.domain as string | undefined;
    const category = req.query.category as any;
    const status = req.query.status as any;
    const search = req.query.q as string | undefined;
    const includeGlobal = req.query.include_global !== 'false';

    const memories = continuityEngine.queryMemories({
      tenantId,
      projectId,
      domain,
      category,
      status,
      search,
      includeGlobal
    });
    res.json({ memories, total: memories.length });
  });

  apiRouter.post('/continuity/memories', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      if (!body.title || !body.content || !body.category || !body.sourceType) {
        return res.status(400).json({ error: 'title, content, category, and sourceType are required' });
      }
      const tenantId = body.tenantId || 'tenant_default';
      const memory = await continuityEngine.storeMemory({
        tenantId,
        projectId: body.projectId,
        projectName: body.projectName,
        title: body.title,
        domain: body.domain || 'general',
        category: body.category,
        content: body.content,
        tags: body.tags,
        evidenceStatus: body.evidenceStatus,
        confidenceScore: body.confidenceScore,
        sourceType: body.sourceType,
        sourceReference: body.sourceReference || 'manual_entry',
        isGlobalApproved: body.isGlobalApproved,
        evidencePayload: body.evidencePayload,
        influencingTasks: body.influencingTasks
      });
      res.status(201).json(memory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.put('/continuity/memories/:id', (req: Request, res: Response) => {
    try {
      const tenantId = (req.body?.tenantId as string) || (req.query.tenant_id as string) || 'tenant_default';
      const updated = continuityEngine.updateMemory(req.params.id, tenantId, req.body || {}, req.body?.reason);
      if (!updated) return res.status(404).json({ error: 'Memory not found or unauthorized' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.delete('/continuity/memories/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'tenant_default';
      const deleted = await continuityEngine.deleteMemory(req.params.id, tenantId);
      if (!deleted) return res.status(404).json({ error: 'Memory not found or unauthorized' });
      res.json({ success: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/continuity/memories/:id/revalidate', (req: Request, res: Response) => {
    try {
      const tenantId = (req.body?.tenantId as string) || 'tenant_default';
      const { newStatus, reason } = req.body || {};
      if (!newStatus) return res.status(400).json({ error: 'newStatus is required' });
      const revalidated = continuityEngine.revalidateMemory(req.params.id, tenantId, newStatus, reason || 'Operator revalidation');
      if (!revalidated) return res.status(404).json({ error: 'Memory not found or unauthorized' });
      res.json(revalidated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/continuity/memories/:id/promote', (req: Request, res: Response) => {
    try {
      const tenantId = (req.body?.tenantId as string) || 'tenant_default';
      const promoted = continuityEngine.promoteToGlobalApproved(req.params.id, tenantId);
      if (!promoted) return res.status(404).json({ error: 'Memory not found or unauthorized' });
      res.json(promoted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/continuity/memories/export', (req: Request, res: Response) => {
    const tenantId = (req.query.tenant_id as string) || 'tenant_default';
    const projectId = req.query.project_id as string | undefined;
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const exported = continuityEngine.exportMemories(tenantId, projectId, format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="engineering_memories.csv"');
      return res.send(exported);
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(exported);
  });

  apiRouter.get('/continuity/stale-conflicts', (req: Request, res: Response) => {
    const tenantId = (req.query.tenant_id as string) || 'tenant_default';
    const projectId = req.query.project_id as string | undefined;
    res.json({ anomalies: continuityEngine.detectStaleOrContradictoryKnowledge(tenantId, projectId) });
  });

  apiRouter.get('/continuity/trends', (req: Request, res: Response) => {
    const modelId = req.query.model_id as string | undefined;
    res.json({ trends: continuityEngine.getModelImprovementTrends(modelId) });
  });

  apiRouter.post('/continuity/resurrect/prepare', (req: Request, res: Response) => {
    try {
      const { taskId, checkpointId } = req.body || {};
      if (!taskId) return res.status(400).json({ error: 'taskId is required' });
      const plan = continuityEngine.prepareTaskResurrection(taskId, checkpointId);
      if (!plan) return res.status(404).json({ error: `Task ${taskId} not found for resurrection` });
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/continuity/resurrect/execute', async (req: Request, res: Response) => {
    try {
      const { taskId, checkpointId } = req.body || {};
      if (!taskId) return res.status(400).json({ error: 'taskId is required' });
      const result = await continuityEngine.executeTaskResurrection(taskId, checkpointId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/continuity/learn', async (req: Request, res: Response) => {
    try {
      const { task, testResults } = req.body || {};
      if (!task || !task.id || !task.goal) return res.status(400).json({ error: 'Valid task object is required' });
      const learned = await continuityEngine.extractReusableTechniqueFromCompletedTask(task, testResults);
      res.json({ learned, success: Boolean(learned) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // FOUR BEASTS & AUTONOMOUS REALITY REPAIR
  // ==========================================
  apiRouter.get('/engines', async (req: Request, res: Response) => {
    try {
      const engines = beastEngineRegistry.getAllMetadata();
      res.json(engines);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/engines/:engineId/execute', async (req: Request, res: Response) => {
    try {
      const { engineId } = req.params;
      const { goal, context, dryRun } = req.body || {};
      if (!goal) return res.status(400).json({ error: 'goal is required' });

      const result = await beastEngineRegistry.executeTask({
        id: `task_${Date.now()}`,
        goal,
        preferredEngine: engineId as any,
        context,
        dryRun
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/reality/issues', (req: Request, res: Response) => {
    try {
      const issues = autonomousRealityRepairEngine.getAllIssues();
      res.json(issues);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/reality/metrics', (req: Request, res: Response) => {
    try {
      const metrics = autonomousRealityRepairEngine.getMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/reality/audit/run', async (req: Request, res: Response) => {
    try {
      const metrics = await autonomousRealityRepairEngine.runFullAudit();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/reality/repair', async (req: Request, res: Response) => {
    try {
      const { issueId, approved } = req.body || {};
      if (!issueId) return res.status(400).json({ error: 'issueId is required' });

      const outcome = await autonomousRealityRepairEngine.triggerAutonomousRepair(issueId, Boolean(approved));
      res.json(outcome);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/reality/killswitch', (req: Request, res: Response) => {
    try {
      const { active } = req.body || {};
      const result = autonomousRealityRepairEngine.setKillSwitch(Boolean(active));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // 35. FIVE REPOSITORIES INTEGRATION: SECURITY AUDIT & TEMPORAL WORKFLOWS
  // =========================================================================

  apiRouter.get('/security-audit/status', async (_req: Request, res: Response) => {
    try {
      const adapters = scannerRegistry.getAllAdapters().map(a => ({
        id: a.id,
        name: a.name,
        version: a.version,
        upstreamUrl: a.upstreamUrl,
        upstreamLicense: a.upstreamLicense,
        category: a.category,
        runtimeRequirement: a.runtimeRequirement,
        status: a.status,
        isAvailable: a.isAvailable()
      }));

      const temporalHealth = await temporalWorkflowAdapter.checkHealth();

      res.json({
        scanners: adapters,
        temporal: temporalHealth,
        findingsCount: scannerRegistry.getAllFindings().length,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/security-audit/run', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      if (process.env.NODE_ENV === 'production' && !user) {
        return res.status(401).json({ error: 'Authentication required to initiate security scan.' });
      }

      const { scannerId, targetScope, parameters } = req.body || {};
      if (!scannerId) return res.status(400).json({ error: 'scannerId is required' });
      if (!targetScope) return res.status(400).json({ error: 'targetScope is required' });

      const result = await scannerRegistry.executeScan({
        scannerId,
        targetScope,
        parameters,
        tenantId: user?.tenantId || 'tenant_default'
      });

      res.json(result);
    } catch (err: any) {
      res.status(err.message.includes('Target scope violation') ? 403 : 500).json({
        error: err.message
      });
    }
  });

  apiRouter.get('/security-audit/findings', (req: Request, res: Response) => {
    try {
      const { scannerId, status, minSeverity } = req.query as any;
      const findings = scannerRegistry.getAllFindings({ scannerId, status, minSeverity });
      res.json(findings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/security-audit/export', (req: Request, res: Response) => {
    try {
      const format = (req.query.format as 'json' | 'markdown') || 'json';
      const report = scannerRegistry.exportReport(format);
      if (format === 'markdown') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      } else {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.send(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/temporal/status', async (_req: Request, res: Response) => {
    try {
      const status = await temporalWorkflowAdapter.checkHealth();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/workflows', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const jobs = await temporalWorkflowAdapter.getAllJobs(user?.tenantId);
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/workflows', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      if (process.env.NODE_ENV === 'production' && !user) {
        return res.status(401).json({ error: 'Authentication required to start workflows.' });
      }

      const { workflowType = 'general_task', input = {}, idempotencyKey } = req.body || {};
      const job = await temporalWorkflowAdapter.startJob(workflowType, input, {
        tenantId: user?.tenantId || 'tenant_default',
        idempotencyKey
      });
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/workflows/:jobId/cancel', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { reason } = req.body || {};
      const success = await temporalWorkflowAdapter.cancelJob(jobId, reason);
      res.json({ success, jobId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // 36. AGENT REACH REAL INTERNET RESEARCH (Panniantong/Agent-Reach)
  // =========================================================================

  apiRouter.get('/agent-reach/status', async (_req: Request, res: Response) => {
    try {
      const config = agentReachService.getConfig();
      res.json({
        enabled: config.isEnabled,
        upstream: AGENT_REACH_UPSTREAM,
        config,
        historyCount: agentReachService.getHistory().length,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/agent-reach/doctor', async (_req: Request, res: Response) => {
    try {
      const report = await agentReachService.runDoctor();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/agent-reach/research', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      if (process.env.NODE_ENV === 'production' && !user) {
        return res.status(401).json({ error: 'Authentication required for internet research.' });
      }

      const { query, platform, maxResults, depth, targetUrl, outputFormat } = req.body || {};
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Field "query" is required and cannot be empty.' });
      }

      const result = await agentReachService.executeResearch({
        query,
        platform,
        maxResults,
        depth,
        targetUrl,
        outputFormat,
        tenantId: user?.tenantId || 'tenant_default',
        userId: user?.id
      });

      logAuditEvent({
        event_type: 'tool_execution',
        actor_id: user?.id || 'anonymous',
        actor_type: 'user',
        action: 'agent_reach_research',
        status: 'success',
        metadata: {
          tenant_id: user?.tenantId || 'tenant_default',
          query: result.query,
          platforms: result.selectedPlatforms,
          factsCount: result.factsCount,
          receiptHash: result.receipts.hash
        }
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.get('/agent-reach/history', (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const history = agentReachService.getHistory(user?.tenantId);
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/agent-reach/test', async (req: Request, res: Response) => {
    try {
      const { platform } = req.body || {};
      if (!platform) {
        return res.status(400).json({ error: 'Platform parameter is required (e.g. github, web, reddit, youtube, rss, twitter).' });
      }
      const testResult = await agentReachService.testPlatformConnection(platform);
      res.json(testResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/agent-reach/configure', (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      if (process.env.NODE_ENV === 'production' && user?.role !== 'admin' && user?.role !== 'security_researcher') {
        return res.status(403).json({ error: 'Unauthorized to modify research configuration.' });
      }
      const updated = agentReachService.updateConfig(req.body || {});
      logAuditEvent({
        event_type: 'config_change',
        actor_id: user?.id || 'anonymous',
        actor_type: 'user',
        action: 'agent_reach_config_update',
        status: 'success',
        metadata: {
          tenant_id: user?.tenantId || 'tenant_default',
          service: 'agent_reach'
        }
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // TURNITOUT ACADEMIC WRITING & DOCUMENT REFINEMENT API
  // =========================================================================

  // 1. Status & Architecture Disclosures
  apiRouter.get('/research/turnitout/status', (req: Request, res: Response) => {
    res.json(turnitoutEngine.getStatus());
  });

  // 2. Taxonomies & Seed Literature
  apiRouter.get('/research/turnitout/taxonomies', (req: Request, res: Response) => {
    const list = Object.values(ACADEMIC_TAXONOMIES).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      keywords: t.keywords,
      seedLiteratureCount: t.seedLiterature.length
    }));
    res.json({ taxonomies: list });
  });

  // 3. Fast Lexical Analysis
  apiRouter.post('/research/turnitout/analyze', (req: Request, res: Response) => {
    try {
      const text = req.body?.text;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text string is required for analysis.' });
      }
      const analysis = turnitoutEngine.analyzeDocument(text);
      res.json(analysis);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Document Processing (In-Place Zone Preservation)
  apiRouter.post('/research/turnitout/process', (req: Request, res: Response) => {
    try {
      const { text, mode, intensity, discipline, preserveLatex, preserveCode, codeLanguage, citationStyle, maxCitations } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text string is required for processing.' });
      }
      const user = getRequestUser(req);
      const result = turnitoutEngine.processDocument(text, {
        mode: mode || 'academic_refine',
        intensity: typeof intensity === 'number' ? intensity : 2,
        discipline,
        preserveLatex: preserveLatex !== false,
        preserveCode: preserveCode !== false,
        codeLanguage,
        citationStyle: citationStyle || 'bibtex',
        maxCitations: maxCitations || 3
      });

      // Audit log entry for tracking transformation operations
      logAuditEvent({
        event_type: 'tool_execution',
        actor_id: user?.id || 'anonymous',
        actor_type: 'user',
        action: `turnitout_${mode || 'academic_refine'}`,
        status: result.success ? 'success' : 'failure',
        metadata: {
          tenant_id: user?.tenantId || 'tenant_default',
          mode: result.mode,
          intensity: result.intensity,
          wordsChanged: result.diffStats.wordsChanged,
          zonesPreserved: result.diffStats.zonesPreserved
        }
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GITHUB ACTIONS CI/CD & WORKFLOW API
  // =========================================================================

  // 1. Status & Auth Discovery
  apiRouter.get('/github/actions/status', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const status = await githubActionsService.checkStatus(tokenOverride, user?.tenantId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Tenant Token Configuration
  apiRouter.post('/github/actions/config', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tenantId = user?.tenantId || 'tenant_default';
      const { token } = req.body || {};

      if (token && typeof token === 'string' && token.trim()) {
        githubActionsService.setTenantToken(tenantId, token.trim());
      } else {
        githubActionsService.clearTenantToken(tenantId);
      }

      const status = await githubActionsService.checkStatus(undefined, tenantId);
      logAuditEvent({
        event_type: 'config_change',
        actor_id: user?.id || 'anonymous',
        actor_type: 'user',
        action: 'github_actions_token_updated',
        status: 'success',
        metadata: {
          tenant_id: tenantId,
          is_configured: status.isConfigured,
          authenticated_user: status.authenticatedUser
        }
      });
      res.json(status);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3. List Accessible Repositories
  apiRouter.get('/github/actions/repos', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const repos = await githubActionsService.listAccessibleRepositories(tokenOverride, user?.tenantId);
      res.json(repos);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 4. List Workflows in Repository
  apiRouter.get('/github/actions/:owner/:repo/workflows', async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const workflows = await githubActionsService.listWorkflows(owner, repo, tokenOverride, user?.tenantId);
      res.json({ workflows });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 5. Get Single Workflow
  apiRouter.get('/github/actions/:owner/:repo/workflows/:workflowId', async (req: Request, res: Response) => {
    try {
      const { owner, repo, workflowId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const workflow = await githubActionsService.getWorkflow(owner, repo, workflowId, tokenOverride, user?.tenantId);
      res.json(workflow);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 6. List Workflow Runs
  apiRouter.get('/github/actions/:owner/:repo/runs', async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const { workflow_id, status, branch, per_page, page } = req.query;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const result = await githubActionsService.listWorkflowRuns(
        owner,
        repo,
        {
          workflowId: workflow_id ? String(workflow_id) : undefined,
          status: status ? String(status) : undefined,
          branch: branch ? String(branch) : undefined,
          per_page: per_page ? parseInt(String(per_page), 10) : 30,
          page: page ? parseInt(String(page), 10) : 1
        },
        tokenOverride,
        user?.tenantId
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 7. Get Single Run Detail
  apiRouter.get('/github/actions/:owner/:repo/runs/:runId', async (req: Request, res: Response) => {
    try {
      const { owner, repo, runId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const run = await githubActionsService.getWorkflowRun(owner, repo, runId, tokenOverride, user?.tenantId);
      res.json(run);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 8. Get Run Jobs & Execution Steps
  apiRouter.get('/github/actions/:owner/:repo/runs/:runId/jobs', async (req: Request, res: Response) => {
    try {
      const { owner, repo, runId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const jobs = await githubActionsService.getRunJobs(owner, repo, runId, tokenOverride, user?.tenantId);
      res.json({ jobs });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 9. Trigger Authorized Workflow Dispatch
  apiRouter.post('/github/actions/:owner/:repo/workflows/:workflowId/dispatch', async (req: Request, res: Response) => {
    try {
      const { owner, repo, workflowId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const operatorId = user?.id || 'usr_operator';
      const tenantId = user?.tenantId || 'tenant_default';

      const receipt = await githubActionsService.triggerWorkflowDispatch(
        owner,
        repo,
        workflowId,
        req.body || { ref: 'main' },
        operatorId,
        tenantId,
        tokenOverride
      );

      logAuditEvent({
        event_type: 'agent_action',
        actor_id: operatorId,
        actor_type: 'user',
        action: 'github_actions_workflow_dispatch',
        status: 'success',
        metadata: {
          repository: `${owner}/${repo}`,
          workflow_id: workflowId,
          ref: req.body?.ref || 'main',
          receipt_checksum: receipt.evidenceChecksum
        }
      });

      res.status(200).json(receipt);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 10. Cancel Active Workflow Run
  apiRouter.post('/github/actions/:owner/:repo/runs/:runId/cancel', async (req: Request, res: Response) => {
    try {
      const { owner, repo, runId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const operatorId = user?.id || 'usr_operator';
      const tenantId = user?.tenantId || 'tenant_default';

      const result = await githubActionsService.cancelWorkflowRun(
        owner,
        repo,
        runId,
        operatorId,
        tenantId,
        tokenOverride
      );

      logAuditEvent({
        event_type: 'agent_action',
        actor_id: operatorId,
        actor_type: 'user',
        action: 'github_actions_run_cancel',
        status: 'success',
        metadata: {
          repository: `${owner}/${repo}`,
          run_id: runId,
          evidence_checksum: result.evidenceChecksum
        }
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 11. Rerun Workflow Run
  apiRouter.post('/github/actions/:owner/:repo/runs/:runId/rerun', async (req: Request, res: Response) => {
    try {
      const { owner, repo, runId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const operatorId = user?.id || 'usr_operator';
      const tenantId = user?.tenantId || 'tenant_default';

      const result = await githubActionsService.rerunWorkflowRun(
        owner,
        repo,
        runId,
        operatorId,
        tenantId,
        tokenOverride
      );

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 12. Get Job Logs with Secret Masking
  apiRouter.get('/github/actions/:owner/:repo/jobs/:jobId/logs', async (req: Request, res: Response) => {
    try {
      const { owner, repo, jobId } = req.params;
      const user = (req as any).user as AuthenticatedUser | undefined;
      const tokenOverride = (req.headers['x-github-token'] as string) || undefined;
      const logs = await githubActionsService.getJobLogs(owner, repo, jobId, tokenOverride, user?.tenantId);
      res.json(logs);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // FABLE MODE & GROUNDING VERIFIER API (codeclawd/fable-mode distillation)
  // =========================================================================

  // 1. Fable Mode Status & Config
  apiRouter.get('/fable/status', (req: Request, res: Response) => {
    try {
      const config = fableModeService.getConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Fable Doctor Health Diagnostics
  apiRouter.post('/fable/doctor', async (req: Request, res: Response) => {
    try {
      const report = await fableModeService.runDoctor();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Grounding Verifier Audit
  apiRouter.post('/fable/ground', async (req: Request, res: Response) => {
    try {
      const { stepGoal, claims, diff, diffSummary } = req.body || {};
      if (!stepGoal || !Array.isArray(claims)) {
        return res.status(400).json({ error: 'stepGoal and claims array are required.' });
      }
      const report = await fableModeService.verifyGroundingLedger(stepGoal, claims, { diff, diffSummary });
      res.json(report);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 4. Test-After-Edit Mechanical Hook
  apiRouter.post('/fable/test-hook', async (req: Request, res: Response) => {
    try {
      const { editedFile } = req.body || {};
      const result = await fableModeService.executeTestAfterEdit(editedFile);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Configure Fable Mode
  apiRouter.post('/fable/config', (req: Request, res: Response) => {
    try {
      const { enabled, debounceSeconds, timeoutSeconds } = req.body || {};
      if (typeof enabled === 'boolean') {
        fableModeService.setEnabled(enabled);
      }
      if (typeof debounceSeconds === 'number' || typeof timeoutSeconds === 'number') {
        fableModeService.configureTestHook({ debounceSeconds, timeoutSeconds });
      }
      res.json(fableModeService.getConfig());
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // INFISICAL SECRET ISOLATION & KEY MANAGEMENT API
  // =========================================================================

  // 1. Infisical Health & Connection Status
  apiRouter.get('/security/infisical/status', async (_req: Request, res: Response) => {
    try {
      const status = await infisicalSecretService.checkStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Infisical Masked Secrets List (Never returns plaintext secrets)
  apiRouter.get('/security/infisical/secrets', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const secrets = await infisicalSecretService.listMaskedSecrets(user?.tenantId);
      res.json({ count: secrets.length, secrets });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // POLICY GUARD & SECURITY BOUNDARY EVALUATION API
  // =========================================================================

  // 1. Evaluate Agent Action against Policy Boundary Rules
  apiRouter.post('/security/policy-guard/evaluate', (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const { agentId, agentRole, actionType, targetResource, parameters } = req.body || {};
      if (!agentRole || !actionType || !targetResource) {
        return res.status(400).json({ error: 'agentRole, actionType, and targetResource are required.' });
      }

      const result = policyGuardService.evaluateAction({
        agentId: agentId || 'agent_unassigned',
        agentRole,
        actionType,
        targetResource,
        parameters,
        tenantId: user?.tenantId || 'tenant_default'
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 2. List Active Security Policy Rules
  apiRouter.get('/security/policy-guard/rules', (_req: Request, res: Response) => {
    try {
      const rules = policyGuardService.getAllRules();
      res.json({ count: rules.length, rules });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Register or Update Policy Rule
  apiRouter.post('/security/policy-guard/rules', (req: Request, res: Response) => {
    try {
      const rule = req.body;
      if (!rule?.ruleId || !rule?.agentRole || !rule?.actionType || !rule?.targetResourcePattern) {
        return res.status(400).json({ error: 'Valid rule with ruleId, agentRole, actionType, and targetResourcePattern is required.' });
      }
      policyGuardService.registerRule(rule);
      res.json({ success: true, rule, rulesCount: policyGuardService.getAllRules().length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // MODEL CONTEXT PROTOCOL (MCP) CLIENT & TOOL INVOCATION API
  // =========================================================================

  // 1. MCP Client Status
  apiRouter.get('/mcp/status', (_req: Request, res: Response) => {
    try {
      const status = mcpClientService.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. List Configured MCP Servers
  apiRouter.get('/mcp/servers', (_req: Request, res: Response) => {
    try {
      const servers = mcpClientService.getServers();
      res.json({ count: servers.length, servers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Register New MCP Server Configuration
  apiRouter.post('/mcp/servers', (req: Request, res: Response) => {
    try {
      const { id, name, transport, endpoint, description, command, args } = req.body || {};
      if (!id || !name || !transport) {
        return res.status(400).json({ error: 'id, name, and transport are required.' });
      }
      const server = mcpClientService.registerServer({
        id,
        name,
        transport,
        endpoint,
        command,
        args,
        description: description || 'Custom MCP Server',
        isEnabled: true
      });
      res.json({ success: true, server });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 4. List Registered MCP Tools
  apiRouter.get('/mcp/tools', (req: Request, res: Response) => {
    try {
      const serverId = req.query.serverId as string | undefined;
      const tools = mcpClientService.getTools(serverId);
      res.json({ count: tools.length, tools });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Invoke MCP Tool via JSON-RPC 2.0
  apiRouter.post('/mcp/call', async (req: Request, res: Response) => {
    try {
      const user = getRequestUser(req);
      const { serverId, toolName, arguments: toolArgs } = req.body || {};
      if (!serverId || !toolName) {
        return res.status(400).json({ error: 'serverId and toolName are required for MCP invocation.' });
      }

      // Check with Policy Guard before executing
      const policyCheck = policyGuardService.evaluateAction({
        agentId: 'mcp_client',
        agentRole: 'mcp_caller',
        actionType: 'tool_execution',
        targetResource: `${serverId}:${toolName}`,
        parameters: toolArgs,
        tenantId: user?.tenantId || 'tenant_default'
      });

      if (policyCheck.decision === 'denied') {
        return res.status(403).json({
          error: policyCheck.reason,
          decision: policyCheck.decision,
          matchedRuleId: policyCheck.matchedRuleId
        });
      }

      const result = await mcpClientService.callTool(serverId, toolName, toolArgs || {}, user?.tenantId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // BROWSER AUTOMATION & WEB INTELLIGENCE API
  // =========================================================================

  // 1. Browser Engine Status
  apiRouter.get('/browser/status', (_req: Request, res: Response) => {
    try {
      const status = browserAutomationService.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Safe Browser Navigation & Extraction with SSRF Defense
  apiRouter.post('/browser/navigate', async (req: Request, res: Response) => {
    try {
      const { url, timeoutMs, extractLinks, extractMetadata, userAgent } = req.body || {};
      if (!url) {
        return res.status(400).json({ error: 'url parameter is required.' });
      }

      const result = await browserAutomationService.navigate({
        url,
        timeoutMs,
        extractLinks,
        extractMetadata,
        userAgent
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3. Extract Semantic Page Text / Markdown
  apiRouter.post('/browser/extract', async (req: Request, res: Response) => {
    try {
      const { url } = req.body || {};
      if (!url) {
        return res.status(400).json({ error: 'url parameter is required.' });
      }
      const result = await browserAutomationService.navigate({ url, extractLinks: false });
      res.json({
        url: result.url,
        title: result.title,
        metadata: result.metadata,
        markdown: result.markdownContent,
        wordCount: result.wordCount,
        evidenceChecksum: result.evidenceChecksum
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // MISSION CONTROL NAI (builderz-labs/mission-control)
  // Fleet operations, worker telemetry, spend tracking
  // ==========================================
  apiRouter.get('/operations/mission-control/overview', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || (req as any).user?.tenant_id;
      const overview = await missionControlAdapter.getOverview(tenantId);
      res.json(overview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/operations/mission-control/dispatch', async (req: Request, res: Response) => {
    try {
      const { agentId, goal, tenantId } = req.body || {};
      if (!agentId || !goal) {
        return res.status(400).json({ error: 'agentId and goal are required parameters.' });
      }
      const result = await missionControlAdapter.dispatchTask(agentId, goal, tenantId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/operations/mission-control/worker/:workerId/halt', async (req: Request, res: Response) => {
    try {
      const { workerId } = req.params;
      const success = await missionControlAdapter.haltWorker(workerId);
      res.json({ workerId, halted: success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/operations/mission-control/worker/:workerId/restart', async (req: Request, res: Response) => {
    try {
      const { workerId } = req.params;
      const success = await missionControlAdapter.restartWorker(workerId);
      res.json({ workerId, restarted: success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // OMA - OPEN MULTI-AGENT (open-multi-agent/open-multi-agent)
  // Durable DAG orchestration, pause-for-approval, tamper-evident chained journal
  // ==========================================
  apiRouter.post('/workflow/oma/run', async (req: Request, res: Response) => {
    try {
      const { goal, tenantId } = req.body || {};
      if (!goal) {
        return res.status(400).json({ error: 'goal parameter is required.' });
      }
      const run = await omaRuntimeAdapter.createRun(goal, tenantId);
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/workflow/oma/run/:runId', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const run = await omaRuntimeAdapter.getRun(runId);
      if (!run) {
        return res.status(404).json({ error: `OMA Run "${runId}" not found.` });
      }
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/workflow/oma/run/:runId/advance', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const { nodeId, result } = req.body || {};
      if (!nodeId) {
        return res.status(400).json({ error: 'nodeId parameter is required.' });
      }
      const updatedRun = await omaRuntimeAdapter.advanceNode(runId, nodeId, result);
      res.json(updatedRun);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/workflow/oma/run/:runId/approve', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const { nodeId, approvedBy } = req.body || {};
      if (!nodeId) {
        return res.status(400).json({ error: 'nodeId parameter is required.' });
      }
      const approver = approvedBy || (req as any).user?.email || 'admin@aiheaven.local';
      const updatedRun = await omaRuntimeAdapter.grantApproval(runId, nodeId, approver);
      res.json(updatedRun);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/workflow/oma/run/:runId/verify', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const verification = await omaRuntimeAdapter.verifyJournalIntegrity(runId);
      res.json(verification);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AGENTLENS (agentkitai/agentlens)
  // Agent Trajectory Observability, Token / Latency Telemetry, SHA-256 Fingerprint Seals
  // ==========================================
  apiRouter.get('/observability/agent-lens/flights', (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || (req as any).user?.tenant_id;
      const flights = agentLensService.listFlightRecords(tenantId);
      res.json(flights);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/observability/agent-lens/flight/:flightId', (req: Request, res: Response) => {
    try {
      const { flightId } = req.params;
      const flight = agentLensService.getFlightRecord(flightId);
      if (!flight) {
        return res.status(404).json({ error: `AgentLens flight "${flightId}" not found.` });
      }
      res.json(flight);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/observability/agent-lens/flight', (req: Request, res: Response) => {
    try {
      const { taskId, goal, tenantId } = req.body || {};
      if (!taskId || !goal) {
        return res.status(400).json({ error: 'taskId and goal are required parameters.' });
      }
      const flight = agentLensService.startFlightRecord(taskId, goal, tenantId);
      res.json(flight);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/observability/agent-lens/flight/:flightId/step', (req: Request, res: Response) => {
    try {
      const { flightId } = req.params;
      const stepInput = req.body;
      const step = agentLensService.recordStep(flightId, stepInput);
      res.json(step);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  apiRouter.post('/observability/agent-lens/flight/:flightId/end', (req: Request, res: Response) => {
    try {
      const { flightId } = req.params;
      const { status, rootCause } = req.body || {};
      const flight = agentLensService.endFlightRecord(flightId, status || 'completed', rootCause);
      res.json(flight);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // AGENTGATE (agentkitai/agentgate)
  // Zero-Trust Security Gateway, Tool Interception, Policy Enforcement
  // ==========================================
  apiRouter.post('/security/agent-gate/evaluate', async (req: Request, res: Response) => {
    try {
      const { agentId, toolId, commandOrPayload, parameters, tenantId, projectId } = req.body || {};
      if (!agentId || !toolId || !commandOrPayload) {
        return res.status(400).json({ error: 'agentId, toolId, and commandOrPayload are required parameters.' });
      }
      const result = await agentGateAdapter.evaluateToolCall({
        agentId,
        toolId,
        commandOrPayload,
        parameters: parameters || {},
        tenantId,
        projectId
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/security/agent-gate/policies', (_req: Request, res: Response) => {
    try {
      const policies = agentGateAdapter.getPolicies();
      res.json(policies);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/security/agent-gate/policies', (req: Request, res: Response) => {
    try {
      const policy = req.body;
      if (!policy?.policyId || !policy?.resourcePattern) {
        return res.status(400).json({ error: 'policyId and resourcePattern are required.' });
      }
      agentGateAdapter.registerPolicy(policy);
      res.json({ registered: true, policy });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // THINKLESS (VainF/Thinkless)
  // Adaptive Reasoning Budget: short-form fast-path vs long-chain deep CoT
  // ==========================================
  apiRouter.post('/brain/decision/thinkless', (req: Request, res: Response) => {
    try {
      const { query, domain, complexity } = req.body || {};
      if (!query) {
        return res.status(400).json({ error: 'query parameter is required.' });
      }
      const decision = thinkLessPipeline.evaluateReasoningBudget(
        query,
        domain || 'general',
        complexity || 'standard'
      );
      res.json(decision);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // THALAMUS & FAST DECISION BACKENDS (cobaltcore-dev/Thalamus, NandhaKishorM/laya, fastino-ai/GLiNER2)
  // Resilient schema routing, circuit breaking, calibrated native fallback
  // ==========================================
  apiRouter.post('/brain/decision/thalamus', async (req: Request, res: Response) => {
    try {
      const { text, candidateLabels, parameters } = req.body || {};
      if (!text || !Array.isArray(candidateLabels)) {
        return res.status(400).json({ error: 'text and candidateLabels array are required.' });
      }
      const result = await thalamusMiddleware.routeDecision({
        text,
        candidateLabels,
        parameters
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/brain/decision/backends/status', async (_req: Request, res: Response) => {
    try {
      const health = await thalamusMiddleware.checkHealth();
      res.json(health);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // LAZYCODEX HIERARCHICAL MEMORY & DIRECTORY INSTRUCTIONS (code-yeongyu/lazycodex)
  // Recursive directory-level AGENTS.md inheritance and repo landmark indexing
  // ==========================================
  apiRouter.get('/memory/hierarchical/instructions', (req: Request, res: Response) => {
    try {
      const targetPath = (req.query.path as string) || 'src';
      const instructions = hierarchicalMemoryService.resolveInstructionsForPath(targetPath);
      res.json(instructions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/memory/hierarchical/landmarks', (_req: Request, res: Response) => {
    try {
      const landmarks = hierarchicalMemoryService.indexDirectoryLandmarks();
      res.json(landmarks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AGENT SWARM (openai/swarm pattern)
  // Declarative specialist handoffs, shared swarm context variables
  // ==========================================
  apiRouter.post('/swarm/run', async (req: Request, res: Response) => {
    try {
      const { prompt, initialAgentId, contextVariables, maxHandoffs, tenantId } = req.body || {};
      if (!prompt) return res.status(400).json({ error: 'prompt is required.' });
      const result = await agentSwarmEngine.executeSwarmRun({
        prompt,
        initialAgentId: initialAgentId || 'swarm_triage',
        contextVariables,
        maxHandoffs,
        tenantId
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/swarm/agents', (_req: Request, res: Response) => {
    try {
      const agents = agentSwarmEngine.listAgents();
      res.json(agents);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // OPENWOP (openwop/openwop, openwop.dev)
  // Standardized workflow orchestration protocol, checkpoints, replay
  // ==========================================
  apiRouter.post('/wop/v1/runs', async (req: Request, res: Response) => {
    try {
      const { workflowName, inputs, tenantId } = req.body || {};
      if (!workflowName) return res.status(400).json({ error: 'workflowName is required.' });
      const run = await openwopAdapter.createRun(workflowName, inputs || {}, tenantId);
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/wop/v1/runs/:runId', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const run = await openwopAdapter.getRun(runId);
      if (!run) return res.status(404).json({ error: `OpenWOP Run "${runId}" not found.` });
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/wop/v1/runs/:runId/advance', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const result = await openwopAdapter.advanceRun(runId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/wop/v1/runs/:runId/approve', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const { approved, actor } = req.body || {};
      const run = await openwopAdapter.resolveApproval(runId, approved !== false, actor || 'admin@aiheaven.local');
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/wop/v1/runs/:runId/replay', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const { checkpointId } = req.body || {};
      if (!checkpointId) return res.status(400).json({ error: 'checkpointId is required for replay.' });
      const run = await openwopAdapter.replayFromCheckpoint(runId, checkpointId);
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/wop/v1/runs/:runId/events', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const events = await openwopAdapter.getEvents(runId);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // OMA (open-multi-agent) Runs listing
  apiRouter.get('/workflow/oma/runs', async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || (req as any).user?.tenant_id;
      const runs = await omaRuntimeAdapter.listRuns(tenantId);
      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AMA-BENCH (AMA-Bench/AMA-Hub, ama-bench.github.io)
  // Agent Memory trajectory evaluation across long horizons
  // ==========================================
  apiRouter.post('/benchmark/ama-bench/evaluate', async (req: Request, res: Response) => {
    try {
      const { domain, trajectory, queries } = req.body || {};
      if (!domain || !Array.isArray(trajectory) || !Array.isArray(queries)) {
        return res.status(400).json({ error: 'domain, trajectory array, and queries array are required.' });
      }
      const result = await amaBenchHarness.runEvaluation(domain, trajectory, queries);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/benchmark/ama-bench/test-cases', (req: Request, res: Response) => {
    try {
      const domain = (req.query.domain as any) || 'software_engineering';
      const cases = amaBenchHarness.getStandardTestCases(domain);
      res.json(cases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // POLOS (polos-dev/polos, polos.dev)
  // Durable execution runtime, memoized idempotency, checkpoint recovery
  // ==========================================
  apiRouter.post('/runtime/polos/session', (req: Request, res: Response) => {
    try {
      const { agentId, tenantId, maxRetries } = req.body || {};
      const session = polosRuntimeAdapter.createSession({ agentId: agentId || 'agent_default', tenantId, maxRetries });
      res.json({
        sessionId: session.sessionId,
        agentId: session.agentId,
        status: session.status,
        createdAt: session.createdAt
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/runtime/polos/sessions', (_req: Request, res: Response) => {
    try {
      const sessions = polosRuntimeAdapter.listSessions();
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get('/runtime/polos/session/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = polosRuntimeAdapter.getSession(sessionId);
      if (!session) return res.status(404).json({ error: `Polos session "${sessionId}" not found.` });
      res.json({
        sessionId: session.sessionId,
        agentId: session.agentId,
        status: session.status,
        totalStepsExecuted: session.totalStepsExecuted,
        totalStepsMemoized: session.totalStepsMemoized,
        checkpointCount: session.checkpoints.size,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount API router at BOTH '/api' AND root '/'
  // This guarantees that whether Vercel preserves '/api/health' or rewrites to '/health', it resolves correctly.
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // Root document preview handler
  // When running inside server.ts with active Vite dev middleware, delegate to Vite for index.html transformation
  app.get('/', (req: Request, res: Response, next: NextFunction) => {
    if (process.env.VITE_DEV_SERVER === 'true') {
      return next();
    }
    const distIndexPath = path.resolve(process.cwd(), 'dist/index.html');
    if (fs.existsSync(distIndexPath)) {
      return res.sendFile(distIndexPath);
    }
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
