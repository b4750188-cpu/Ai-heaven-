/**
 * AI Heaven API Client
 * Compatible with FastAPI / SQLAlchemy 2.0 backend endpoints.
 * Includes graceful fallback to authoritative local data store and live connection health reporting.
 */

import { PROVIDERS, RELATIONSHIPS, RESOURCES } from '../data/database';
import { GraphEdge, GraphNode, KnowledgeGraphData } from '../types/graph';
import { Provider, RelationshipType, Resource, ResourceRelationship, ResourceType } from '../types/resource';

export interface BackendStatus {
  connected: boolean;
  baseUrl: string;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.NEXT_PUBLIC_API_URL || '/api';

class AIHeavenApiClient {
  private baseUrl: string;
  private isBackendAvailable: boolean | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
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
    const nodes: GraphNode[] = RESOURCES.map(r => ({
      id: r.slug,
      slug: r.slug,
      name: r.name,
      resource_type: r.resource_type,
      provider_id: r.provider_id,
      trust_score: r.trust_score,
      verification_status: r.verification_status,
      is_demo_data: r.provenance.is_demo_data
    }));

    const edges: GraphEdge[] = RELATIONSHIPS.map(rel => ({
      id: rel.id,
      source: rel.source_slug,
      target: rel.target_slug,
      relationship_type: rel.relationship_type,
      evidence_url: rel.evidence_url,
      confidence: rel.confidence,
      verified: rel.verified,
      description: rel.description
    }));

    return { nodes, edges };
  }
}

export const apiClient = new AIHeavenApiClient();
