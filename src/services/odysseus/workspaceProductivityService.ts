/**
 * AI HEAVEN — ODYSSEUS WORKSPACE & PRODUCTIVITY SERVICE
 * Provides document drafting, note taking, citation embedding from Deep Research / SOURCE,
 * export utilities, and productivity integration guards.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { WorkspaceDocument } from '../../types/odysseus';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORAGE_FILE = path.join(DATA_DIR, 'odysseus_documents.json');

export class WorkspaceProductivityService {
  private documents: Map<string, WorkspaceDocument> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data?.documents)) {
          for (const doc of data.documents) {
            this.documents.set(doc.id, doc);
          }
        }
      }
      if (this.documents.size === 0) {
        this.seedInitialTemplates();
      }
    } catch {
      this.seedInitialTemplates();
    }
  }

  private seedInitialTemplates(): void {
    const docId = 'doc_welcome_odysseus';
    const initialDoc: WorkspaceDocument = {
      id: docId,
      tenantId: 'tenant_default',
      title: 'Welcome to AI Heaven + Odysseus Unified Workspace',
      content: [
        '# Odysseus Capability Workspace',
        '',
        'This unified workspace integrates advanced autonomous agent execution, multi-step deep research, and hardware-aware model intelligence into AI Heaven.',
        '',
        '## Key Capabilities Integrated:',
        '- **Autonomous Agent Loop**: Multi-turn Think → Plan → Tool Call → Approval Gate → Execute → Observe → Synthesize.',
        '- **Deep Research Engine**: Autonomous multi-source discovery, document extraction with SHA-256 evidence seals, and epistemic classification.',
        '- **The Cookbook**: Hardware profiling for quantized models (Llama 3.2, DeepSeek-R1, Mistral, Qwen, Gemma) with honest RAM/VRAM capacity evaluation.',
        '- **Hybrid Knowledge Search**: Vector cosine similarity and BM25 search over the family SOURCE pool.',
        '',
        'Use the controls above to start deep research inquiries, test model fits, and draft technical specifications.'
      ].join('\n'),
      category: 'specification',
      citations: [],
      tags: ['welcome', 'odysseus', 'ai_heaven', 'architecture'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    this.documents.set(docId, initialDoc);
    this.persistState();
  }

  private persistState(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        documents: Array.from(this.documents.values()),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Non-fatal fallback
    }
  }

  public listDocuments(tenantId?: string): WorkspaceDocument[] {
    const list = Array.from(this.documents.values());
    if (!tenantId || tenantId === 'tenant_default') return list;
    return list.filter(d => d.tenantId === tenantId);
  }

  public getDocument(docId: string): WorkspaceDocument | null {
    return this.documents.get(docId) || null;
  }

  public createDocument(params: {
    tenantId: string;
    title: string;
    content: string;
    category?: WorkspaceDocument['category'];
    tags?: string[];
    citations?: WorkspaceDocument['citations'];
  }): WorkspaceDocument {
    const now = new Date().toISOString();
    const docId = `doc_${crypto.randomUUID().slice(0, 10)}`;

    const doc: WorkspaceDocument = {
      id: docId,
      tenantId: params.tenantId || 'tenant_default',
      title: params.title.trim() || 'Untitled Document',
      content: params.content || '',
      category: params.category || 'note',
      citations: params.citations || [],
      tags: params.tags || [],
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    this.documents.set(docId, doc);
    this.persistState();
    return doc;
  }

  public updateDocument(params: {
    docId: string;
    tenantId?: string;
    title?: string;
    content?: string;
    category?: WorkspaceDocument['category'];
    tags?: string[];
    citations?: WorkspaceDocument['citations'];
  }): WorkspaceDocument {
    const doc = this.documents.get(params.docId);
    if (!doc) {
      throw new Error(`Document ${params.docId} not found.`);
    }

    if (params.title !== undefined) doc.title = params.title.trim();
    if (params.content !== undefined) doc.content = params.content;
    if (params.category !== undefined) doc.category = params.category;
    if (params.tags !== undefined) doc.tags = params.tags;
    if (params.citations !== undefined) doc.citations = params.citations;

    doc.updatedAt = new Date().toISOString();
    doc.version += 1;

    this.persistState();
    return doc;
  }

  public deleteDocument(docId: string): boolean {
    const deleted = this.documents.delete(docId);
    if (deleted) {
      this.persistState();
    }
    return deleted;
  }

  /**
   * Refines a document with citation links from a Deep Research report.
   */
  public attachResearchReportCitations(docId: string, reportId: string, reportTitle: string): WorkspaceDocument {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error(`Document ${docId} not found.`);

    if (!doc.citations.some(c => c.sourceId === reportId)) {
      doc.citations.push({
        sourceId: reportId,
        title: reportTitle
      });
      doc.content += `\n\n---\n*Referenced Deep Research Report: [${reportTitle}](#)*\n`;
      doc.updatedAt = new Date().toISOString();
      doc.version += 1;
      this.persistState();
    }
    return doc;
  }
}

export const workspaceProductivityService = new WorkspaceProductivityService();
