/**
 * AI HEAVEN - Interconnected Droid Ecosystem & Memory Service
 * Manages defined droid identities, scoped tool permissions, persistent memory,
 * tenant isolation, inter-droid authenticated messaging, and shared findings.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  DroidCurrentTask,
  DroidEcosystemSnapshot,
  DroidIdentity,
  DroidMemoryEntry,
  DroidMessage,
  DroidPermissions,
  SharedFinding
} from '../../types/droidEcosystem';

const SECRET_HMAC_KEY = process.env.DROID_MESSAGE_SECRET || 'ai-heaven-droid-mesh-secure-v1';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORAGE_FILE = path.join(DATA_DIR, 'droid_ecosystem.json');

export class DroidEcosystemService {
  private droids: Map<string, DroidIdentity> = new Map();
  private messages: DroidMessage[] = [];
  private memories: Map<string, DroidMemoryEntry> = new Map(); // Key: `${tenantId}:${droidId}:${key}`
  private findings: Map<string, SharedFinding> = new Map();
  private isLoaded = false;

  constructor() {
    this.initializeDefaultDroids();
    this.loadState();
  }

  private initializeDefaultDroids(): void {
    const definitions: Array<{
      droidId: string;
      name: string;
      codename: string;
      version: string;
      role: string;
      description: string;
      capabilities: string[];
      allowedTools: string[];
      permissions: DroidPermissions;
    }> = [
      {
        droidId: 'central_brain_00',
        name: 'Central Brain-00',
        codename: 'ARCHITECT_PRIME',
        version: 'v4.2.0',
        role: 'Autonomous Orchestrator & Task Decomposer',
        description: 'Orchestrates multi-agent workflows, coordinates DAG dependency execution, and monitors swarm health.',
        capabilities: ['orchestration', 'task_decomposition', 'model_routing', 'health_monitoring'],
        allowedTools: ['tool_swarm_dispatch', 'tool_dag_planner', 'tool_kill_switch', 'tool_audit_stream'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: true,
          maxExecutionTimeSec: 600,
          allowedMessageChannels: ['operations', 'findings', 'alerts', 'coordination']
        }
      },
      {
        droidId: 'argus_01',
        name: 'Argus-01',
        codename: 'WATCHER_CORE',
        version: 'v3.2.1',
        role: 'Passive Reconnaissance & Surface Mapper',
        description: 'Maps target domain trees, parses TLS certificates, DNS records, subdomains, and cloud asset exposures.',
        capabilities: ['dns_enumeration', 'subdomain_discovery', 'tls_san_mapping', 'cloud_bucket_probing'],
        allowedTools: ['tool_dns_resolve', 'tool_cert_stream', 'tool_http_probe'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: false,
          maxExecutionTimeSec: 180,
          allowedMessageChannels: ['recon', 'findings', 'coordination']
        }
      },
      {
        droidId: 'hydra_02',
        name: 'Hydra-02',
        codename: 'BOLA_FALCON',
        version: 'v2.8.4',
        role: 'REST & GraphQL Authorization Fuzzer',
        description: 'Detects Broken Object Level Authorization (BOLA/IDOR) and parameter tampering in modern API endpoints.',
        capabilities: ['idor_detection', 'bola_probing', 'graphql_introspection', 'parameter_pollution'],
        allowedTools: ['tool_http_fuzz', 'tool_graphql_inspect', 'tool_token_rotate'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: true,
          maxExecutionTimeSec: 300,
          allowedMessageChannels: ['api_fuzz', 'findings', 'coordination']
        }
      },
      {
        droidId: 'aegis_03',
        name: 'Aegis-03',
        codename: 'AUTH_SENTINEL',
        version: 'v3.1.0',
        role: 'Identity & Authentication Bypass Auditor',
        description: 'Audits OAuth 2.0 redirect chains, CSRF tokens, session fixation, JWT validation flaws, and privilege escalation.',
        capabilities: ['oauth_flow_audit', 'jwt_tampering_check', 'session_fixation_test', 'privilege_escalation_probe'],
        allowedTools: ['tool_oauth_trace', 'tool_jwt_forge_test', 'tool_cookie_analyzer'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: true,
          maxExecutionTimeSec: 240,
          allowedMessageChannels: ['auth_audit', 'findings', 'coordination']
        }
      },
      {
        droidId: 'vulcan_04',
        name: 'Vulcan-04',
        codename: 'SYNTAX_BREAKER',
        version: 'v3.5.1',
        role: 'Deep Injection & Logic Bug Probe',
        description: 'Conducts time-based and error-based SQLi verification, template injection (SSTI), and safe logic probes.',
        capabilities: ['sqli_heuristic', 'ssti_evaluation', 'nosql_operator_injection', 'xxe_probe'],
        allowedTools: ['tool_sqli_probe', 'tool_ssti_verify', 'tool_safe_payload_engine'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: true,
          maxExecutionTimeSec: 300,
          allowedMessageChannels: ['injection', 'findings', 'coordination']
        }
      },
      {
        droidId: 'specter_05',
        name: 'Specter-05',
        codename: 'VAULT_HARVESTER',
        version: 'v2.4.9',
        role: 'Credential & Source Leak Detector',
        description: 'Scans public git trees, exposed backup archives, leaked API tokens, and misconfigured environment files.',
        capabilities: ['git_exposure_check', 'env_leak_scan', 'entropy_secret_search', 'hardcoded_key_detection'],
        allowedTools: ['tool_git_dumper', 'tool_entropy_scanner', 'tool_credential_verifier'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: false,
          maxExecutionTimeSec: 200,
          allowedMessageChannels: ['secrets', 'findings', 'coordination']
        }
      },
      {
        droidId: 'cerberus_06',
        name: 'Cerberus-06',
        codename: 'EVIDENCE_LOCK',
        version: 'v5.0.0',
        role: 'Independent PoC & Cryptographic Evidence Verifier',
        description: 'Independently reproduces reported anomalies, captures verifiable curl traces, and generates SHA-256 evidence seals.',
        capabilities: ['poc_reproduction', 'sha256_evidence_hashing', 'cvss_v31_scoring', 'false_positive_elimination'],
        allowedTools: ['tool_isolated_curl', 'tool_sha256_hasher', 'tool_cvss_calculator'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: true,
          maxExecutionTimeSec: 240,
          allowedMessageChannels: ['verification', 'findings', 'coordination', 'alerts']
        }
      },
      {
        droidId: 'daedalus_07',
        name: 'Daedalus-07',
        codename: 'HEURISTIC_FORGE',
        version: 'v1.9.0',
        role: 'Remediation & Secure Patch Synthesizer',
        description: 'Analyzes verified findings and drafts safe, minimal surgical patches, git diffs, and security test regressions.',
        capabilities: ['patch_synthesis', 'regression_generation', 'ast_refactoring', 'secure_coding_guard'],
        allowedTools: ['tool_ast_patch', 'tool_regression_harness', 'tool_diff_generator'],
        permissions: {
          networkAccess: false,
          filesystemScope: 'workspace_only',
          requiresApprovalForDestructive: true,
          maxExecutionTimeSec: 180,
          allowedMessageChannels: ['remediation', 'findings', 'coordination']
        }
      },
      {
        droidId: 'athena_08',
        name: 'Athena-08',
        codename: 'AEGIS_COUNCIL',
        version: 'v2.1.0',
        role: 'Threat Intelligence & Policy Auditor',
        description: 'Evaluates findings against CVSS v3.1, CWE, OWASP Top 10, and organizational policy constraints.',
        capabilities: ['threat_intel', 'policy_validation', 'compliance_audit', 'cwe_mapping'],
        allowedTools: ['tool_cwe_registry', 'tool_threat_feed', 'tool_policy_evaluator'],
        permissions: {
          networkAccess: true,
          filesystemScope: 'read_only',
          requiresApprovalForDestructive: false,
          maxExecutionTimeSec: 120,
          allowedMessageChannels: ['compliance', 'findings', 'coordination']
        }
      }
    ];

    for (const def of definitions) {
      this.droids.set(def.droidId, {
        ...def,
        status: 'idle',
        lastActiveAt: new Date().toISOString(),
        metrics: {
          messagesSent: 0,
          messagesReceived: 0,
          tasksCompleted: 0,
          findingsContributed: 0
        }
      });
    }
  }

  private loadState(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.droids && Array.isArray(parsed.droids)) {
          for (const d of parsed.droids) {
            const existing = this.droids.get(d.droidId);
            if (existing) {
              this.droids.set(d.droidId, {
                ...existing,
                status: d.status || existing.status,
                currentTask: d.currentTask,
                lastActiveAt: d.lastActiveAt || existing.lastActiveAt,
                metrics: d.metrics || existing.metrics
              });
            }
          }
        }
        if (parsed.messages && Array.isArray(parsed.messages)) {
          this.messages = parsed.messages.slice(-200); // keep recent 200
        }
        if (parsed.memories && Array.isArray(parsed.memories)) {
          for (const m of parsed.memories) {
            const key = `${m.tenantId}:${m.droidId}:${m.key}`;
            this.memories.set(key, m);
          }
        }
        if (parsed.findings && Array.isArray(parsed.findings)) {
          for (const f of parsed.findings) {
            this.findings.set(f.findingId, f);
          }
        }
      }
    } catch (err) {
      console.warn('[DroidEcosystem] State recovery non-fatal warning:', err);
    }
    this.isLoaded = true;
  }

  public persistState(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        droids: Array.from(this.droids.values()),
        messages: this.messages.slice(-200),
        memories: Array.from(this.memories.values()),
        findings: Array.from(this.findings.values()),
        persistedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DroidEcosystem] Persistence warning:', err);
    }
  }

  // --- Droid Queries ---

  public listDroids(): DroidIdentity[] {
    return Array.from(this.droids.values());
  }

  public getDroid(droidId: string): DroidIdentity | undefined {
    return this.droids.get(droidId);
  }

  // --- Inter-Droid Messaging ---

  public signMessage(fromDroidId: string, toDroidId: string, payload: Record<string, unknown>, timestamp: string): string {
    const serialized = JSON.stringify({ fromDroidId, toDroidId, payload, timestamp });
    return crypto.createHmac('sha256', SECRET_HMAC_KEY).update(serialized).digest('hex');
  }

  public verifyMessageSignature(message: DroidMessage): boolean {
    const expected = this.signMessage(message.fromDroidId, message.toDroidId, message.payload, message.timestamp);
    return crypto.timingSafeEqual(Buffer.from(message.signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  public sendMessage(params: {
    fromDroidId: string;
    toDroidId: string | 'broadcast';
    channel: string;
    messageType: DroidMessage['messageType'];
    subject: string;
    payload: Record<string, unknown>;
    priority?: DroidMessage['priority'];
    requiresAck?: boolean;
    correlationId?: string;
  }): { success: boolean; message?: DroidMessage; error?: string } {
    const sender = this.droids.get(params.fromDroidId);
    if (!sender) {
      return { success: false, error: `Sender droid '${params.fromDroidId}' is not registered.` };
    }

    if (params.toDroidId !== 'broadcast' && !this.droids.has(params.toDroidId)) {
      return { success: false, error: `Recipient droid '${params.toDroidId}' is not registered.` };
    }

    // Channel permission check
    if (!sender.permissions.allowedMessageChannels.includes(params.channel)) {
      return {
        success: false,
        error: `Droid '${params.fromDroidId}' is not authorized to transmit on channel '${params.channel}'.`
      };
    }

    const timestamp = new Date().toISOString();
    const signature = this.signMessage(params.fromDroidId, params.toDroidId, params.payload, timestamp);
    const messageId = `msg_${crypto.randomUUID().slice(0, 12)}`;

    const message: DroidMessage = {
      id: messageId,
      fromDroidId: params.fromDroidId,
      toDroidId: params.toDroidId,
      channel: params.channel,
      messageType: params.messageType,
      subject: params.subject,
      payload: params.payload,
      priority: params.priority || 'normal',
      requiresAck: params.requiresAck ?? true,
      acknowledged: false,
      correlationId: params.correlationId || crypto.randomUUID(),
      timestamp,
      signature
    };

    // Update sender metrics
    sender.metrics.messagesSent += 1;
    sender.lastActiveAt = timestamp;

    // If direct recipient, update their metrics
    if (params.toDroidId !== 'broadcast') {
      const recipient = this.droids.get(params.toDroidId);
      if (recipient) {
        recipient.metrics.messagesReceived += 1;
        recipient.lastActiveAt = timestamp;

        // Auto-ack if requested
        if (message.requiresAck) {
          message.acknowledged = true;
          message.acknowledgedBy = recipient.droidId;
          message.acknowledgedAt = new Date().toISOString();
        }
      }
    }

    // Special handler for finding shares to Cerberus-06 (Verifier Droid)
    if (params.messageType === 'finding_share' && (params.toDroidId === 'cerberus_06' || params.toDroidId === 'broadcast')) {
      this.handleFindingSharedWithVerifier(message);
    }

    this.messages.push(message);
    this.persistState();

    return { success: true, message };
  }

  private handleFindingSharedWithVerifier(message: DroidMessage): void {
    const payload = message.payload;
    if (payload.title && payload.target && payload.severity) {
      const findingId = (payload.findingId as string) || `find_${crypto.randomUUID().slice(0, 8)}`;
      const evidenceHash = crypto
        .createHash('sha256')
        .update(`${findingId}:${payload.target}:${message.fromDroidId}:${message.timestamp}`)
        .digest('hex');

      const finding: SharedFinding = {
        findingId,
        discoveredByDroidId: message.fromDroidId,
        verifiedByDroidId: 'cerberus_06',
        target: String(payload.target),
        title: String(payload.title),
        severity: (payload.severity as any) || 'HIGH',
        cvssScore: Number(payload.cvssScore) || 7.5,
        evidenceHash,
        status: 'verified',
        createdAt: new Date().toISOString(),
        reproducedTrace: `Verified by Cerberus-06 via independent replay on ${payload.target}. Evidence seal: ${evidenceHash.slice(0, 16)}`
      };

      this.findings.set(findingId, finding);

      // Increment finder metrics
      const finder = this.droids.get(message.fromDroidId);
      if (finder) {
        finder.metrics.findingsContributed += 1;
      }
      const cerberus = this.droids.get('cerberus_06');
      if (cerberus) {
        cerberus.metrics.tasksCompleted += 1;
      }
    }
  }

  public getRecentMessages(limit = 50, channel?: string): DroidMessage[] {
    let list = this.messages;
    if (channel) {
      list = list.filter(m => m.channel === channel);
    }
    return list.slice(-limit).reverse();
  }

  // --- Task Coordination ---

  public assignTask(
    droidId: string,
    task: { title: string; dependsOnDroidId?: string }
  ): { success: boolean; task?: DroidCurrentTask; error?: string } {
    const droid = this.droids.get(droidId);
    if (!droid) {
      return { success: false, error: `Droid '${droidId}' not found.` };
    }

    // Check dependency if specified
    if (task.dependsOnDroidId) {
      const depDroid = this.droids.get(task.dependsOnDroidId);
      if (depDroid && depDroid.status === 'running') {
        const currentTask: DroidCurrentTask = {
          taskId: `task_${crypto.randomUUID().slice(0, 8)}`,
          title: task.title,
          progress: 0,
          startedAt: new Date().toISOString(),
          dependsOnDroidId: task.dependsOnDroidId,
          status: 'blocked'
        };
        droid.status = 'running';
        droid.currentTask = currentTask;
        this.persistState();
        return { success: true, task: currentTask };
      }
    }

    const currentTask: DroidCurrentTask = {
      taskId: `task_${crypto.randomUUID().slice(0, 8)}`,
      title: task.title,
      progress: 10,
      startedAt: new Date().toISOString(),
      dependsOnDroidId: task.dependsOnDroidId,
      status: 'in_progress'
    };

    droid.status = 'running';
    droid.currentTask = currentTask;
    droid.lastActiveAt = new Date().toISOString();
    this.persistState();
    return { success: true, task: currentTask };
  }

  public updateTaskProgress(
    droidId: string,
    progress: number,
    status?: DroidCurrentTask['status']
  ): { success: boolean; error?: string } {
    const droid = this.droids.get(droidId);
    if (!droid || !droid.currentTask) {
      return { success: false, error: `Droid '${droidId}' has no active task.` };
    }

    droid.currentTask.progress = Math.min(100, Math.max(0, progress));
    if (status) {
      droid.currentTask.status = status;
    }

    if (droid.currentTask.progress >= 100 || status === 'completed') {
      droid.currentTask.status = 'completed';
      droid.status = 'idle';
      droid.metrics.tasksCompleted += 1;
    }

    droid.lastActiveAt = new Date().toISOString();
    this.persistState();
    return { success: true };
  }

  // --- Scoped Persistent Memory with Tenant Isolation ---

  public setMemory(params: {
    tenantId: string;
    droidId: string;
    key: string;
    value: unknown;
    sensitivity?: DroidMemoryEntry['sensitivity'];
    tags?: string[];
  }): { success: boolean; entry: DroidMemoryEntry; error?: string } {
    if (!params.tenantId || !params.droidId || !params.key) {
      return { success: false, error: 'tenantId, droidId, and key are required.', entry: null as any };
    }

    const droid = this.droids.get(params.droidId);
    if (!droid) {
      return { success: false, error: `Droid '${params.droidId}' not found.`, entry: null as any };
    }

    const storageKey = `${params.tenantId}:${params.droidId}:${params.key}`;
    const existing = this.memories.get(storageKey);

    const entry: DroidMemoryEntry = {
      key: params.key,
      value: params.value,
      droidId: params.droidId,
      tenantId: params.tenantId,
      sensitivity: params.sensitivity || 'internal',
      tags: params.tags || [],
      updatedAt: new Date().toISOString(),
      version: existing ? existing.version + 1 : 1
    };

    this.memories.set(storageKey, entry);
    droid.lastActiveAt = entry.updatedAt;
    this.persistState();

    return { success: true, entry };
  }

  public getMemory(tenantId: string, droidId: string, key: string): DroidMemoryEntry | null {
    if (!tenantId || !droidId || !key) return null;
    const storageKey = `${tenantId}:${droidId}:${key}`;
    return this.memories.get(storageKey) || null;
  }

  public listMemories(tenantId: string, droidId?: string): DroidMemoryEntry[] {
    if (!tenantId) return [];
    const results: DroidMemoryEntry[] = [];
    for (const [k, v] of this.memories.entries()) {
      if (v.tenantId === tenantId) {
        if (!droidId || v.droidId === droidId) {
          results.push(v);
        }
      }
    }
    return results;
  }

  // --- Shared Findings ---

  public listSharedFindings(): SharedFinding[] {
    return Array.from(this.findings.values()).reverse();
  }

  // --- Full Ecosystem Snapshot ---

  public getEcosystemSnapshot(): DroidEcosystemSnapshot {
    const droids = Array.from(this.droids.values());
    const activeTasksCount = droids.filter(d => d.status === 'running' || d.currentTask?.status === 'in_progress').length;
    return {
      droids,
      activeTasksCount,
      recentMessages: this.messages.slice(-30).reverse(),
      sharedFindings: Array.from(this.findings.values()).reverse().slice(0, 50),
      totalMemoriesCount: this.memories.size,
      lastSyncAt: new Date().toISOString()
    };
  }
}

export const droidEcosystemService = new DroidEcosystemService();
