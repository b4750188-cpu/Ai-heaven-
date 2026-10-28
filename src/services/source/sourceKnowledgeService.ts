/**
 * AI HEAVEN - SOURCE: Collective Knowledge Pool Service
 * Persistent, multi-tenant knowledge foundation shared across the Central Brain
 * and authorized family droids with temporal graphiti relationships and epistemic verification.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AccessScope,
  ContributorType,
  KnowledgeCategory,
  KnowledgeSearchFilter,
  RelationshipType,
  SourceEvidence,
  SourceKnowledgeEntry,
  SourceRelationship,
  SourceVersion,
  VerificationStatus
} from '../../types/sourceKnowledge';
import { knowledgeSanitizer } from './knowledgeSanitizer';
import { postgresManager } from '../../db/postgres';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORAGE_FILE = path.join(DATA_DIR, 'source_knowledge_pool.json');

type KnowledgeListener = (entry: SourceKnowledgeEntry, action: 'created' | 'updated' | 'verified') => void;

export class SourceKnowledgeService {
  private entries = new Map<string, SourceKnowledgeEntry>(); // id -> entry
  private listeners: KnowledgeListener[] = [];
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
          for (const item of parsed) {
            this.entries.set(item.id, item);
          }
        }
      }
    } catch (err) {
      console.warn('[SourceKnowledgeService] Failed to load local storage, starting clean:', err);
    }
    this.isLoaded = true;
  }

  public persistState(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const allEntries = Array.from(this.entries.values());
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(allEntries, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SourceKnowledgeService] Disk persist error:', err);
    }

    // Best-effort PostgreSQL synchronization if live
    if (postgresManager.isConfigured()) {
      this.syncToPostgres().catch(err => {
        console.warn('[SourceKnowledgeService] Async Postgres sync warning:', err.message);
      });
    }
  }

  private async syncToPostgres(): Promise<void> {
    const pool = postgresManager.getPool();
    if (!pool) return;
    // Keep tables up to date asynchronously
    for (const entry of this.entries.values()) {
      try {
        await pool.query(
          `INSERT INTO aiheaven_source_entries (
            id, family_id, tenant_id, title, content, category, verification_status, confidence,
            contributor, tags, evidence, relationships, access_scope, is_archived, versions, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            verification_status = EXCLUDED.verification_status,
            confidence = EXCLUDED.confidence,
            relationships = EXCLUDED.relationships,
            is_archived = EXCLUDED.is_archived,
            versions = EXCLUDED.versions,
            updated_at = EXCLUDED.updated_at;`,
          [
            entry.id,
            entry.familyId,
            entry.tenantId,
            entry.title,
            entry.content,
            entry.category,
            entry.verificationStatus,
            entry.confidence,
            JSON.stringify(entry.contributor),
            JSON.stringify(entry.tags),
            JSON.stringify(entry.evidence),
            JSON.stringify(entry.relationships),
            entry.accessScope,
            entry.isArchived,
            JSON.stringify(entry.versions),
            entry.createdAt,
            entry.updatedAt
          ]
        );
      } catch {
        // Tolerated in dev
      }
    }
  }

  public subscribe(listener: KnowledgeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(entry: SourceKnowledgeEntry, action: 'created' | 'updated' | 'verified'): void {
    for (const listener of this.listeners) {
      try {
        listener(entry, action);
      } catch (err) {
        console.error('[SourceKnowledgeService] Listener notification error:', err);
      }
    }
  }

  /**
   * Contribute new knowledge entry to a family pool.
   * Performs secret redaction, epistemic verification guard, and deduplication.
   */
  public contributeKnowledge(params: {
    familyId: string;
    tenantId: string;
    title: string;
    content: string;
    category: KnowledgeCategory;
    requestedStatus?: VerificationStatus;
    confidence?: number;
    contributor: {
      type: ContributorType;
      id: string;
      name: string;
      role?: string;
    };
    tags?: string[];
    evidence?: SourceEvidence[];
    accessScope?: AccessScope;
    metadata?: Record<string, unknown>;
  }): { success: boolean; entry: SourceKnowledgeEntry; warnings: string[]; isDuplicate?: boolean } {
    if (!params.familyId || !params.title || !params.content) {
      throw new Error('familyId, title, and content are required.');
    }

    const rawStatus = params.requestedStatus || 'UNVERIFIED';

    // 1. Sanitize content and validate epistemic status
    const sanitization = knowledgeSanitizer.sanitize(
      params.title,
      params.content,
      rawStatus,
      params.evidence || []
    );

    // 2. Check for duplicate knowledge in this family
    const familyEntries = this.listEntriesForFamily(params.familyId);
    for (const existing of familyEntries) {
      if (!existing.isArchived) {
        const similarity = knowledgeSanitizer.computeSimilarity(existing.content, sanitization.redactedContent);
        if (similarity > 0.88 && existing.title.toLowerCase() === params.title.trim().toLowerCase()) {
          // Exact or near-identical duplicate exists
          return {
            success: true,
            entry: existing,
            warnings: [
              `Knowledge already exists in family pool (ID: ${existing.id}). Returning existing entry to prevent duplicate noise.`
            ],
            isDuplicate: true
          };
        }
      }
    }

    // 3. Process Evidence and seal with SHA-256
    const processedEvidence: SourceEvidence[] = (params.evidence || []).map(ev => {
      const sha256Seal =
        ev.sha256Seal ||
        crypto.createHash('sha256').update(`${ev.snippet}:${params.familyId}:${Date.now()}`).digest('hex');

      return {
        id: ev.id || `evi_${crypto.randomUUID().slice(0, 10)}`,
        evidenceType: ev.evidenceType || 'log_excerpt',
        uri: ev.uri,
        snippet: ev.snippet,
        sha256Seal,
        verifiedAt: ev.verifiedAt || new Date().toISOString(),
        verifiedByDroidId: ev.verifiedByDroidId || params.contributor.id
      };
    });

    const now = new Date().toISOString();
    const entryId = `src_${crypto.randomUUID().slice(0, 14)}`;

    const entry: SourceKnowledgeEntry = {
      id: entryId,
      familyId: params.familyId,
      tenantId: params.tenantId,
      title: sanitization.redactedTitle || params.title.trim(),
      content: sanitization.redactedContent,
      category: params.category,
      verificationStatus: sanitization.adjustedStatus,
      confidence: params.confidence !== undefined ? Math.min(1.0, Math.max(0.0, params.confidence)) : 0.85,
      contributor: params.contributor,
      tags: params.tags || [],
      evidence: processedEvidence,
      relationships: [],
      accessScope: params.accessScope || 'private_family',
      isArchived: false,
      versions: [
        {
          versionNumber: 1,
          title: sanitization.redactedTitle || params.title.trim(),
          content: sanitization.redactedContent,
          changedBy: params.contributor.name,
          changeReason: 'Initial contribution to family SOURCE pool',
          timestamp: now
        }
      ],
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now
    };

    this.entries.set(entryId, entry);
    this.persistState();
    this.notify(entry, 'created');

    return {
      success: true,
      entry,
      warnings: sanitization.warnings
    };
  }

  /**
   * Searches the SOURCE knowledge pool strictly constrained by family ownership.
   */
  public searchKnowledge(filter: KnowledgeSearchFilter): {
    entries: SourceKnowledgeEntry[];
    total: number;
    facets: {
      byCategory: Record<string, number>;
      byStatus: Record<string, number>;
    };
  } {
    if (!filter.familyId) {
      return { entries: [], total: 0, facets: { byCategory: {}, byStatus: {} } };
    }

    const queryLower = filter.query ? filter.query.trim().toLowerCase() : '';
    const queryTokens = queryLower ? queryLower.split(/\s+/).filter(Boolean) : [];

    let pool: SourceKnowledgeEntry[] = [];

    for (const entry of this.entries.values()) {
      // Security Check: Enforce tenant / family isolation
      // An entry is ONLY accessible if:
      // 1. It belongs to the caller's familyId, OR
      // 2. It has accessScope === 'public_pool'
      const isOwnerFamily = entry.familyId === filter.familyId;
      const isPublic = entry.accessScope === 'public_pool';

      if (!isOwnerFamily && !isPublic) {
        continue;
      }

      if (!filter.includeArchived && entry.isArchived) {
        continue;
      }

      if (filter.category && entry.category !== filter.category) {
        continue;
      }

      if (filter.verificationStatus && entry.verificationStatus !== filter.verificationStatus) {
        continue;
      }

      if (filter.contributorId && entry.contributor.id !== filter.contributorId) {
        continue;
      }

      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(t => entry.tags.includes(t));
        if (!hasTag) continue;
      }

      pool.push(entry);
    }

    // Compute Facets
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const item of pool) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      byStatus[item.verificationStatus] = (byStatus[item.verificationStatus] || 0) + 1;
    }

    // Rank by keyword match score
    if (queryTokens.length > 0) {
      const scored = pool.map(item => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();
        const tagsJoined = item.tags.join(' ').toLowerCase();

        for (const token of queryTokens) {
          if (titleLower.includes(token)) score += 10;
          if (tagsJoined.includes(token)) score += 5;
          if (contentLower.includes(token)) score += 2;
        }

        // Epistemic verification bonus
        if (item.verificationStatus === 'VERIFIED') score += 3;
        score += item.confidence * 2;

        return { item, score };
      });

      pool = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.item);
    } else {
      // Default sort by updatedAt descending
      pool.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    const total = pool.length;
    const limit = filter.limit || 30;
    const offset = filter.offset || 0;
    const paginated = pool.slice(offset, offset + limit);

    return {
      entries: paginated,
      total,
      facets: { byCategory, byStatus }
    };
  }

  /**
   * Retrieves single knowledge entry with strict family boundary check.
   */
  public getEntry(familyId: string, entryId: string): SourceKnowledgeEntry | null {
    const entry = this.entries.get(entryId);
    if (!entry) return null;
    if (entry.familyId !== familyId && entry.accessScope !== 'public_pool') {
      return null; // Deny cross-tenant retrieval
    }
    return entry;
  }

  /**
   * Updates an existing entry, creating an immutable version audit snapshot.
   */
  public updateEntry(params: {
    familyId: string;
    entryId: string;
    title?: string;
    content?: string;
    category?: KnowledgeCategory;
    verificationStatus?: VerificationStatus;
    tags?: string[];
    changedBy: string;
    changeReason: string;
  }): { success: boolean; entry?: SourceKnowledgeEntry; error?: string } {
    const existing = this.entries.get(params.entryId);
    if (!existing || existing.familyId !== params.familyId) {
      return { success: false, error: 'Knowledge entry not found or permission denied.' };
    }

    const title = params.title ? params.title.trim() : existing.title;
    const content = params.content || existing.content;
    const requestedStatus = params.verificationStatus || existing.verificationStatus;

    // Sanitize before updating
    const sanitization = knowledgeSanitizer.sanitize(title, content, requestedStatus, existing.evidence);

    const now = new Date().toISOString();
    const nextVersionNum = existing.versions.length + 1;

    existing.versions.push({
      versionNumber: nextVersionNum,
      title: sanitization.redactedTitle || title,
      content: sanitization.redactedContent,
      changedBy: params.changedBy,
      changeReason: params.changeReason || 'Correction / Knowledge Update',
      timestamp: now
    });

    existing.title = sanitization.redactedTitle || title;
    existing.content = sanitization.redactedContent;
    if (params.category) existing.category = params.category;
    existing.verificationStatus = sanitization.adjustedStatus;
    if (params.tags) existing.tags = params.tags;
    existing.updatedAt = now;

    this.persistState();
    this.notify(existing, 'updated');

    return { success: true, entry: existing };
  }

  /**
   * Creates a relationship between two knowledge entries (SUPPORTS, REFUTES, SUPERSEDES, etc.).
   */
  public addRelationship(params: {
    familyId: string;
    sourceEntryId: string;
    targetEntryId: string;
    relationType: RelationshipType;
    rationale: string;
  }): { success: boolean; error?: string } {
    const source = this.entries.get(params.sourceEntryId);
    const target = this.entries.get(params.targetEntryId);

    if (!source || source.familyId !== params.familyId) {
      return { success: false, error: `Source entry '${params.sourceEntryId}' not found in family.` };
    }
    if (!target || target.familyId !== params.familyId) {
      return { success: false, error: `Target entry '${params.targetEntryId}' not found in family.` };
    }

    const now = new Date().toISOString();
    const rel: SourceRelationship = {
      targetEntryId: params.targetEntryId,
      relationType: params.relationType,
      rationale: params.rationale,
      createdAt: now
    };

    source.relationships.push(rel);

    // Epistemic state updates based on relationship
    if (params.relationType === 'REFUTES') {
      target.verificationStatus = 'DISPUTED';
      target.updatedAt = now;
    } else if (params.relationType === 'SUPERSEDES') {
      target.verificationStatus = 'OUTDATED';
      target.supersededByEntryId = params.sourceEntryId;
      target.updatedAt = now;
    }

    source.updatedAt = now;
    this.persistState();
    this.notify(source, 'updated');

    return { success: true };
  }

  /**
   * Formally verifies a knowledge entry with a cryptographic evidence seal.
   */
  public verifyEntry(params: {
    familyId: string;
    entryId: string;
    verifiedByDroidId: string;
    evidenceSnippet: string;
    evidenceType?: SourceEvidence['evidenceType'];
  }): { success: boolean; entry?: SourceKnowledgeEntry; error?: string } {
    const entry = this.entries.get(params.entryId);
    if (!entry || entry.familyId !== params.familyId) {
      return { success: false, error: 'Knowledge entry not found in family.' };
    }

    const now = new Date().toISOString();
    const sha256Seal = crypto
      .createHash('sha256')
      .update(`${params.entryId}:${params.evidenceSnippet}:${params.verifiedByDroidId}:${now}`)
      .digest('hex');

    const newEvidence: SourceEvidence = {
      id: `evi_${crypto.randomUUID().slice(0, 10)}`,
      evidenceType: params.evidenceType || 'test_result',
      snippet: params.evidenceSnippet,
      sha256Seal,
      verifiedAt: now,
      verifiedByDroidId: params.verifiedByDroidId
    };

    entry.evidence.push(newEvidence);
    entry.verificationStatus = 'VERIFIED';
    entry.confidence = Math.min(1.0, entry.confidence + 0.15);
    entry.updatedAt = now;

    this.persistState();
    this.notify(entry, 'verified');

    return { success: true, entry };
  }

  /**
   * Archives a knowledge entry.
   */
  public archiveEntry(familyId: string, entryId: string): boolean {
    const entry = this.entries.get(entryId);
    if (!entry || entry.familyId !== familyId) return false;
    entry.isArchived = true;
    entry.updatedAt = new Date().toISOString();
    this.persistState();
    return true;
  }

  public listEntriesForFamily(familyId: string): SourceKnowledgeEntry[] {
    const res: SourceKnowledgeEntry[] = [];
    for (const item of this.entries.values()) {
      if (item.familyId === familyId) res.push(item);
    }
    return res;
  }

  public getStats(familyId: string): {
    totalEntries: number;
    verifiedEntries: number;
    disputedEntries: number;
    categories: Record<string, number>;
  } {
    const familyEntries = this.listEntriesForFamily(familyId);
    let verified = 0;
    let disputed = 0;
    const categories: Record<string, number> = {};

    for (const e of familyEntries) {
      if (!e.isArchived) {
        if (e.verificationStatus === 'VERIFIED') verified++;
        if (e.verificationStatus === 'DISPUTED') disputed++;
        categories[e.category] = (categories[e.category] || 0) + 1;
      }
    }

    return {
      totalEntries: familyEntries.filter(e => !e.isArchived).length,
      verifiedEntries: verified,
      disputedEntries: disputed,
      categories
    };
  }
}

export const sourceKnowledgeService = new SourceKnowledgeService();
