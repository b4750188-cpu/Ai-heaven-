/**
 * AI Heaven - Authoritative Resource & Knowledge Graph Type Definitions
 * Compatible with FastAPI, SQLAlchemy 2.0 ORM, and Pydantic schemas.
 */

export type ResourceType =
  | 'platform'
  | 'model'
  | 'api'
  | 'sdk'
  | 'agent_framework'
  | 'tool'
  | 'mcp_server'
  | 'dataset'
  | 'documentation'
  | 'repository'
  | 'provider'
  | 'compute';

export type VerificationStatus =
  | 'verified'           // Server-verified against official documentation or API
  | 'community_verified' // Verified by multi-party consensus
  | 'unverified'         // Raw unverified ingested entry
  | 'pending_review';    // Under manual audit

export type RelationshipType =
  | 'provides'
  | 'accesses'
  | 'uses'
  | 'depends_on'
  | 'publishes'
  | 'documents'
  | 'integrates_with'
  | 'compatible_with'
  | 'alternative_to'
  | 'built_with'
  | 'supports'
  | 'part_of';

export type SourceType =
  | 'official_documentation'
  | 'official_api'
  | 'verified_git_repository'
  | 'package_registry'
  | 'open_standard_manifest';

export interface Provenance {
  source_provider: string;
  source_url: string;
  source_identifier: string;
  source_type: SourceType;
  first_seen_at: string;
  last_seen_at: string;
  last_verified_at: string;
  sync_status: 'synced' | 'drift_detected' | 'pending';
  /**
   * CRITICAL AI HEAVEN CONTRACT:
   * Explicit flag indicating if this entry is authoritative production data or test demo data.
   */
  is_demo_data: boolean;
}

export interface AgentContract {
  what_is_it: string;
  what_does_it_do: string;
  who_provides_it: string;
  inputs: string[];
  outputs: string[];
  authentication: {
    type: 'api_key' | 'oauth2' | 'service_account' | 'none' | 'token';
    required: boolean;
    header_or_param: string;
    description: string;
  };
  permissions: string[];
  rate_limits: string | null;
  cost_model: string | null;
  compatibility: string[];
  alternatives: string[];
}

export interface ResourceModelFamily {
  model_id: string;
  display_name: string;
  version: string;
  release_date: string;
  context_window_tokens: number;
  input_modalities: string[];
  output_modalities: string[];
  supports_function_calling: boolean;
  supports_code_execution: boolean;
  supports_structured_output: boolean;
  supports_search_grounding: boolean;
  supports_context_caching: boolean;
  pricing_input_per_million?: string;
  pricing_output_per_million?: string;
  official_endpoint?: string;
  documentation_url: string;
}

export interface Resource {
  id: string;
  slug: string;
  name: string;
  resource_type: ResourceType;
  provider_id: string;
  description: string;
  summary: string;
  source_url: string;
  documentation_url: string;
  repository_url: string | null;
  publisher: string;
  author: string | null;
  version: string | null;
  license: string | null;
  capabilities: string[];
  modalities?: {
    input: string[];
    output: string[];
  };
  context_limit?: number | null;
  dependencies: string[];
  tags: string[];
  categories: string[];
  /** Server-set ONLY - cannot be manipulated by client */
  verification_status: VerificationStatus;
  /** Server-set ONLY - cannot be manipulated by client */
  trust_score: number;
  provenance: Provenance;
  external_identifiers: Record<string, string>;
  agent_contract: AgentContract;
  models?: ResourceModelFamily[];
  supported_workflows?: string[];
}

export interface ResourceRelationship {
  id: string;
  source_slug: string;
  target_slug: string;
  relationship_type: RelationshipType;
  evidence_url: string;
  confidence: number; // 0.0 - 1.0
  verified: boolean;  // Server-controlled
  created_at: string;
  description: string;
}

export interface Provider {
  id: string;
  slug: string;
  name: string;
  legal_name: string;
  website_url: string;
  documentation_url: string;
  headquarters?: string;
  description: string;
  resource_types_provided: ResourceType[];
  verified: boolean;
  external_identifiers: Record<string, string>;
}
