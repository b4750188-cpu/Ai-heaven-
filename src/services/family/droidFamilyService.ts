/**
 * AI HEAVEN - Droid Family Management & Inter-Droid Communication Service
 * Provisions and isolates a private Droid Family for each authenticated Google account.
 * Enables peer status queries, tool inquiries, task delegation, and automatic SOURCE contributions.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  DroidFamily,
  DroidFamilyMember,
  InterDroidFamilyMessage,
  InterDroidFamilyMessageType,
  KnowledgeCategory,
  SourceEvidence
} from '../../types/sourceKnowledge';
import { sourceKnowledgeService } from '../source/sourceKnowledgeService';
import { postgresManager } from '../../db/postgres';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORAGE_FILE = path.join(DATA_DIR, 'droid_families.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'family_messages.json');
const MAX_DELEGATION_DEPTH = 5;

export class DroidFamilyService {
  private families = new Map<string, DroidFamily>(); // familyId -> DroidFamily
  private familyByUserId = new Map<string, string>(); // userId -> familyId
  private messages: InterDroidFamilyMessage[] = [];
  private isLoaded = false;

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const f of parsed) {
            this.families.set(f.familyId, f);
            this.familyByUserId.set(f.ownerUserId, f.familyId);
          }
        }
      }
      if (fs.existsSync(MESSAGES_FILE)) {
        const rawMsg = fs.readFileSync(MESSAGES_FILE, 'utf-8');
        const parsedMsg = JSON.parse(rawMsg);
        if (Array.isArray(parsedMsg)) {
          this.messages = parsedMsg.slice(-300);
        }
      }
    } catch (err) {
      console.warn('[DroidFamilyService] Load state error:', err);
    }
    this.isLoaded = true;
  }

  public persistState(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(Array.from(this.families.values()), null, 2), 'utf-8');
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(this.messages.slice(-300), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[DroidFamilyService] Disk persist error:', err);
    }

    if (postgresManager.isConfigured()) {
      this.syncToPostgres().catch(err => {
        console.warn('[DroidFamilyService] Postgres async sync warning:', err.message);
      });
    }
  }

  private async syncToPostgres(): Promise<void> {
    const pool = postgresManager.getPool();
    if (!pool) return;
    for (const fam of this.families.values()) {
      try {
        await pool.query(
          `INSERT INTO aiheaven_droid_families (
            family_id, tenant_id, owner_user_id, owner_email, family_name, central_brain_context, members, stats, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (family_id) DO UPDATE SET
            family_name = EXCLUDED.family_name,
            central_brain_context = EXCLUDED.central_brain_context,
            members = EXCLUDED.members,
            stats = EXCLUDED.stats,
            updated_at = EXCLUDED.updated_at;`,
          [
            fam.familyId,
            fam.tenantId,
            fam.ownerUserId,
            fam.ownerEmail,
            fam.familyName,
            JSON.stringify(fam.centralBrainContext),
            JSON.stringify(fam.members),
            JSON.stringify(fam.stats),
            fam.createdAt,
            fam.updatedAt
          ]
        );
      } catch {
        // Tolerated in dev
      }
    }
  }

  /**
   * Generates or retrieves the private Droid Family for a user.
   * Guaranteed idempotent: identical user ID always restores the same family.
   */
  public getOrCreateFamily(user: { id: string; email: string; fullName?: string; tenantId?: string }): DroidFamily {
    const existingFamilyId = this.familyByUserId.get(user.id);
    if (existingFamilyId) {
      const family = this.families.get(existingFamilyId);
      if (family) return family;
    }

    // Provision new family
    const familyId = `fam_${user.id}`;
    const tenantId = user.tenantId || `tenant_${user.id}`;
    const now = new Date().toISOString();

    const defaultMembers: DroidFamilyMember[] = [
      {
        droidId: 'central_brain_00',
        name: 'Central Brain-00',
        codename: 'ARCHITECT_PRIME',
        role: 'Autonomous Orchestrator & Task Decomposer',
        status: 'idle',
        allowedTools: ['tool_swarm_dispatch', 'tool_dag_planner', 'tool_kill_switch', 'tool_source_search', 'tool_geoint_query', 'tool_geoint_correlate'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: true, maxExecutionTimeSec: 600 },
        currentObjective: 'Active Orchestration Ready',
        lastActiveAt: now
      },
      {
        droidId: 'argus_01',
        name: 'Argus-01',
        codename: 'WATCHER_CORE',
        role: 'Passive Reconnaissance & Surface Mapper',
        status: 'idle',
        allowedTools: ['tool_dns_resolve', 'tool_cert_stream', 'tool_http_probe', 'tool_geoint_query', 'tool_geoint_aircraft', 'tool_geoint_seismic'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: false, maxExecutionTimeSec: 180 },
        currentObjective: 'Awaiting recon target',
        lastActiveAt: now
      },
      {
        droidId: 'hydra_02',
        name: 'Hydra-02',
        codename: 'BOLA_FALCON',
        role: 'REST & GraphQL Authorization Fuzzer',
        status: 'idle',
        allowedTools: ['tool_http_fuzz', 'tool_graphql_inspect', 'tool_token_rotate'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: true, maxExecutionTimeSec: 300 },
        currentObjective: 'API authorization fuzzing ready',
        lastActiveAt: now
      },
      {
        droidId: 'aegis_03',
        name: 'Aegis-03',
        codename: 'AUTH_SENTINEL',
        role: 'Identity & Authentication Bypass Auditor',
        status: 'idle',
        allowedTools: ['tool_oauth_trace', 'tool_jwt_forge_test', 'tool_cookie_analyzer'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: true, maxExecutionTimeSec: 240 },
        currentObjective: 'OAuth and JWT auditing standby',
        lastActiveAt: now
      },
      {
        droidId: 'vulcan_04',
        name: 'Vulcan-04',
        codename: 'SYNTAX_BREAKER',
        role: 'Deep Injection & Logic Bug Probe',
        status: 'idle',
        allowedTools: ['tool_sqli_probe', 'tool_ssti_verify', 'tool_safe_payload_engine'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: true, maxExecutionTimeSec: 300 },
        currentObjective: 'Safe injection probing standby',
        lastActiveAt: now
      },
      {
        droidId: 'specter_05',
        name: 'Specter-05',
        codename: 'VAULT_HARVESTER',
        role: 'Credential & Source Leak Detector',
        status: 'idle',
        allowedTools: ['tool_git_dumper', 'tool_entropy_scanner', 'tool_credential_verifier'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: false, maxExecutionTimeSec: 200 },
        currentObjective: 'Public git and env scan standby',
        lastActiveAt: now
      },
      {
        droidId: 'cerberus_06',
        name: 'Cerberus-06',
        codename: 'EVIDENCE_LOCK',
        role: 'Independent PoC & Cryptographic Evidence Verifier',
        status: 'idle',
        allowedTools: ['tool_isolated_curl', 'tool_sha256_hasher', 'tool_cvss_calculator'],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: true, maxExecutionTimeSec: 240 },
        currentObjective: 'Evidence seal reproduction ready',
        lastActiveAt: now
      },
      {
        droidId: 'daedalus_07',
        name: 'Daedalus-07',
        codename: 'HEURISTIC_FORGE',
        role: 'Remediation & Secure Patch Synthesizer',
        status: 'idle',
        allowedTools: ['tool_ast_patch', 'tool_regression_harness', 'tool_diff_generator'],
        permissions: { networkAccess: false, filesystemScope: 'workspace_only', requiresApprovalForDestructive: true, maxExecutionTimeSec: 180 },
        currentObjective: 'Automated patch synthesis ready',
        lastActiveAt: now
      },
      {
        droidId: 'athena_08',
        name: 'Athena-08',
        codename: 'AEGIS_COUNCIL',
        role: 'Threat Intelligence & Policy Auditor',
        status: 'idle',
        allowedTools: ['tool_cwe_registry', 'tool_threat_feed', 'tool_policy_evaluator'],
        permissions: { networkAccess: true, filesystemScope: 'read_only', requiresApprovalForDestructive: false, maxExecutionTimeSec: 120 },
        currentObjective: 'Policy compliance evaluation ready',
        lastActiveAt: now
      },
      {
        droidId: 'horus_09',
        name: 'Horus-09',
        codename: 'EYE_OF_RA',
        role: 'Global Situational Awareness & GEOINT Specialist',
        status: 'idle',
        allowedTools: [
          'tool_geoint_aircraft',
          'tool_geoint_seismic',
          'tool_geoint_maritime',
          'tool_geoint_satellites',
          'tool_geoint_environmental',
          'tool_source_deposit'
        ],
        permissions: { networkAccess: true, filesystemScope: 'workspace_only', requiresApprovalForDestructive: false, maxExecutionTimeSec: 240 },
        currentObjective: 'Global telemetry and spatial reconnaissance standby',
        lastActiveAt: now
      }
    ];

    const familyName = user.fullName ? `${user.fullName}'s Droid Family` : `${user.email.split('@')[0]}'s Droid Family`;

    const newFamily: DroidFamily = {
      familyId,
      tenantId,
      ownerUserId: user.id,
      ownerEmail: user.email,
      familyName,
      centralBrainContext: {
        brainId: `brain_${user.id}`,
        persona: 'Adaptive Chief Architect & Family Orchestrator',
        activeDirectives: [
          'Enforce strict least privilege on all tool invocations.',
          'Always query SOURCE before starting novel tasks.',
          'Require cryptographic SHA-256 evidence for all VERIFIED claims.'
        ],
        activeModelId: 'gemini-2.5-pro'
      },
      members: defaultMembers,
      stats: {
        totalKnowledgeEntries: 0,
        verifiedEntriesCount: 0,
        tasksCoordinatedCount: 0,
        messagesExchangedCount: 0
      },
      createdAt: now,
      updatedAt: now
    };

    this.families.set(familyId, newFamily);
    this.familyByUserId.set(user.id, familyId);
    this.persistState();

    return newFamily;
  }

  /**
   * Retrieves user's family by userId.
   */
  public getFamilyByUserId(userId: string): DroidFamily | null {
    const familyId = this.familyByUserId.get(userId);
    if (!familyId) return null;
    return this.families.get(familyId) || null;
  }

  /**
   * Retrieves family by familyId.
   */
  public getFamily(familyId: string): DroidFamily | null {
    return this.families.get(familyId) || null;
  }

  /**
   * Dispatches a structured message between family droids.
   * Protects against infinite delegation loops and unauthorized cross-family transmissions.
   */
  public sendFamilyMessage(params: {
    familyId: string;
    fromDroidId: string;
    toDroidId: string | 'broadcast';
    messageType: InterDroidFamilyMessageType;
    subject: string;
    payload: Record<string, unknown>;
    correlationId?: string;
  }): { success: boolean; message?: InterDroidFamilyMessage; error?: string } {
    const family = this.families.get(params.familyId);
    if (!family) {
      return { success: false, error: 'Family not found.' };
    }

    const sender = family.members.find(m => m.droidId === params.fromDroidId);
    if (!sender) {
      return { success: false, error: `Sender droid '${params.fromDroidId}' is not a member of this family.` };
    }

    if (params.toDroidId !== 'broadcast') {
      const recipient = family.members.find(m => m.droidId === params.toDroidId);
      if (!recipient) {
        return { success: false, error: `Recipient droid '${params.toDroidId}' is not a member of this family.` };
      }
    }

    // Check delegation loop depth if this is task delegation
    if (params.messageType === 'task_delegation') {
      const correlationId = params.correlationId || crypto.randomUUID();
      const existingDelegations = this.messages.filter(
        m => m.familyId === params.familyId && m.correlationId === correlationId && m.messageType === 'task_delegation'
      );
      if (existingDelegations.length >= MAX_DELEGATION_DEPTH) {
        return {
          success: false,
          error: `Delegation loop detected: exceeded maximum allowed depth (${MAX_DELEGATION_DEPTH}). Task rejected.`
        };
      }
    }

    const now = new Date().toISOString();
    const messageId = `fmsg_${crypto.randomUUID().slice(0, 12)}`;
    const correlationId = params.correlationId || crypto.randomUUID();

    const signature = crypto
      .createHmac('sha256', 'ai-heaven-family-mesh-key')
      .update(`${params.familyId}:${params.fromDroidId}:${params.toDroidId}:${params.subject}:${now}`)
      .digest('hex');

    const message: InterDroidFamilyMessage = {
      id: messageId,
      familyId: params.familyId,
      fromDroidId: params.fromDroidId,
      toDroidId: params.toDroidId,
      messageType: params.messageType,
      subject: params.subject,
      payload: params.payload,
      correlationId,
      timestamp: now,
      acknowledged: params.toDroidId !== 'broadcast',
      acknowledgedAt: params.toDroidId !== 'broadcast' ? now : undefined,
      acknowledgedBy: params.toDroidId !== 'broadcast' ? params.toDroidId : undefined,
      signature
    };

    this.messages.push(message);
    family.stats.messagesExchangedCount += 1;
    family.updatedAt = now;
    sender.lastActiveAt = now;

    // Handle Peer Inquiry responses automatically if asking about status or tools
    if (params.messageType === 'status_query' && params.toDroidId !== 'broadcast') {
      const recipient = family.members.find(m => m.droidId === params.toDroidId);
      if (recipient) {
        this.messages.push({
          id: `fmsg_${crypto.randomUUID().slice(0, 12)}`,
          familyId: params.familyId,
          fromDroidId: recipient.droidId,
          toDroidId: sender.droidId,
          messageType: 'peer_response',
          subject: `Status Report from ${recipient.name}`,
          payload: {
            status: recipient.status,
            currentObjective: recipient.currentObjective,
            allowedTools: recipient.allowedTools
          },
          correlationId,
          timestamp: new Date().toISOString(),
          acknowledged: true
        });
      }
    }

    // Auto-contribute finding to SOURCE if messageType is 'finding_contribution'
    if (params.messageType === 'finding_contribution') {
      this.handleAutoKnowledgeContribution(family, sender, params.subject, params.payload);
    }

    this.persistState();

    return { success: true, message };
  }

  private handleAutoKnowledgeContribution(
    family: DroidFamily,
    contributorDroid: DroidFamilyMember,
    subject: string,
    payload: Record<string, unknown>
  ): void {
    try {
      const category: KnowledgeCategory = (payload.category as KnowledgeCategory) || 'droid_experience';
      const evidenceSnippet = (payload.evidence as string) || (payload.snippet as string) || JSON.stringify(payload);
      const evidence: SourceEvidence[] = [
        {
          id: `evi_${crypto.randomUUID().slice(0, 8)}`,
          evidenceType: 'log_excerpt',
          snippet: evidenceSnippet,
          sha256Seal: crypto.createHash('sha256').update(evidenceSnippet).digest('hex'),
          verifiedAt: new Date().toISOString(),
          verifiedByDroidId: contributorDroid.droidId
        }
      ];

      sourceKnowledgeService.contributeKnowledge({
        familyId: family.familyId,
        tenantId: family.tenantId,
        title: subject,
        content: String(payload.content || payload.details || subject),
        category,
        requestedStatus: payload.isVerified ? 'VERIFIED' : 'INFERRED',
        confidence: Number(payload.confidence) || 0.88,
        contributor: {
          type: 'droid',
          id: contributorDroid.droidId,
          name: contributorDroid.name,
          role: contributorDroid.role
        },
        tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : ['autonomous_contribution', contributorDroid.droidId],
        evidence
      });

      family.stats.totalKnowledgeEntries += 1;
    } catch (err) {
      console.warn('[DroidFamilyService] Auto-contribution non-fatal warning:', err);
    }
  }

  public getFamilyMessages(familyId: string, limit = 50): InterDroidFamilyMessage[] {
    return this.messages.filter(m => m.familyId === familyId).slice(-limit).reverse();
  }

  public updateDroidObjective(familyId: string, droidId: string, objective: string, status?: DroidFamilyMember['status']): boolean {
    const family = this.families.get(familyId);
    if (!family) return false;
    const member = family.members.find(m => m.droidId === droidId);
    if (!member) return false;

    member.currentObjective = objective;
    if (status) member.status = status;
    member.lastActiveAt = new Date().toISOString();
    family.updatedAt = new Date().toISOString();

    this.persistState();
    return true;
  }
}

export const droidFamilyService = new DroidFamilyService();
