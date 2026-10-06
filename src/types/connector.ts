import { Resource, ResourceRelationship } from './resource';

export interface IngestionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown>;
}

export interface IngestionResult {
  connector_id: string;
  connector_name: string;
  started_at: string;
  completed_at: string;
  status: 'success' | 'partial' | 'failed';
  discovered_count: number;
  normalized_count: number;
  deduplicated_count: number;
  relationships_extracted: number;
  resources: Resource[];
  relationships: ResourceRelationship[];
  logs: IngestionLog[];
}

export interface SourceConnectorConfig {
  id: string;
  name: string;
  target_source: string;
  official_domain: string;
  endpoint?: string;
  auth_type: 'none' | 'api_key' | 'token';
  rate_limit_per_minute: number;
  is_active: boolean;
}

export interface ISourceConnector {
  config: SourceConnectorConfig;
  discover(): Promise<string[]>; // Returns resource identifiers
  fetch(identifier: string): Promise<Record<string, unknown>>;
  normalize(raw: Record<string, unknown>): Promise<Resource>;
  validate(resource: Resource): Promise<{ valid: boolean; errors: string[] }>;
  deduplicate(resource: Resource, existingResources: Resource[]): Promise<{ isDuplicate: boolean; matchedId?: string }>;
  extract_relationships(resource: Resource): Promise<ResourceRelationship[]>;
  verify(resource: Resource): Promise<{ verified: boolean; trust_score: number; audit_source: string }>;
  sync(): Promise<IngestionResult>;
}
