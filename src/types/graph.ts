import { RelationshipType, Resource, ResourceType } from './resource';

export interface GraphNode {
  id: string;
  slug: string;
  name: string;
  resource_type: ResourceType;
  provider_id: string;
  trust_score: number;
  verification_status: string;
  is_demo_data: boolean;
  summary?: string;
  description?: string;
  capabilities?: string[];
  tags?: string[];
  version?: string | null;
  documentation_url?: string;
  source_url?: string;
  license?: string | null;
  agent_contract?: any;
  provenance?: any;
  category?: string;
  status?: string;
  cluster?: string;
  collapsed?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  degree?: number;
}

export interface GraphEdge {
  id: string;
  source: string; // source node id / slug
  target: string; // target node id / slug
  relationship_type: RelationshipType;
  evidence_url: string;
  confidence: number;
  verified: boolean;
  description: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphFilterState {
  searchQuery: string;
  resourceType: ResourceType | 'all';
  providerId: string | 'all';
  relationshipType: RelationshipType | 'all';
  onlyVerified: boolean;
  includeDemoData: boolean;
}
