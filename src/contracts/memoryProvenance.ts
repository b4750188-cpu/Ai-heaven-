/**
 * AI HEAVEN - Unified Memory, Knowledge & Provenance Contracts
 * Part 5/10 Integration: Mem0, Graphiti, Cognee, Hindsight
 */

export type MemoryEntryType = 'fact' | 'observation' | 'inference' | 'preference' | 'task_outcome';

export interface MemoryProvenance {
  source: 'user_dialogue' | 'code_analysis' | 'tool_execution' | 'benchmark_experiment' | 'security_scan';
  sourceReferenceId?: string;
  sourceTimestamp: string;
  confidenceScore: number; // 0.0 to 1.0
  isVerifiedFact: boolean;
  authoritativeEntity?: string;
}

export interface MemoryEntityRecord {
  id: string;
  tenantId: string;
  type: MemoryEntryType;
  entityName: string;
  category: string;
  summary: string;
  data: Record<string, any>;
  provenance: MemoryProvenance;
  tags: string[];
  ttlSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemporalRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  validFrom: string;
  validTo?: string;
  confidence: number;
}

export interface MemorySearchResult {
  entity: MemoryEntityRecord;
  similarityScore: number;
  relationships: TemporalRelationship[];
  provenanceSummary: string;
}

export interface IUnifiedMemoryAdapter {
  id: string;
  name: string;
  version: string;
  upstreamUrl: string;
  upstreamLicense: string;
  status: 'operational' | 'adapter_ready' | 'service_required';
  store(record: Omit<MemoryEntityRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntityRecord>;
  recall(query: string, options?: { tenantId?: string; type?: MemoryEntryType; limit?: number }): Promise<MemorySearchResult[]>;
  deleteEntity(entityId: string, tenantId: string): Promise<boolean>;
  getTemporalGraph(entityId: string): Promise<{ entity: MemoryEntityRecord; relationships: TemporalRelationship[] }>;
}
