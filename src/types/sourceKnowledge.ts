/**
 * AI HEAVEN - SOURCE: Collective Knowledge Pool & Droid Family Contracts
 * Formal contracts for family-partitioned knowledge, verification states,
 * epistemic provenance, relationships, and inter-droid family messaging.
 */

export type KnowledgeCategory =
  | 'research_discovery'     // Research, verified facts, references, external resources
  | 'solution_procedure'     // Successful solutions, code findings, debugging results, reusable procedures
  | 'droid_experience'       // Droid experiences, lessons learned, failed approaches, reasons for failure
  | 'tool_capability'        // Tool capabilities, limitations, permissions, dependencies, environment findings
  | 'task_context'           // Task summaries, decisions, relationship between facts, historical context
  | 'correction_verification'; // Corrections, outdated info, conflicting claims, verification history

export type VerificationStatus =
  | 'VERIFIED'    // Formally validated by execution, reproduction trace, or consensus
  | 'INFERRED'    // Derived via reasoning or heuristic, not yet empirically proven
  | 'UNVERIFIED'  // Initial observation, hypothesis, or raw contribution
  | 'DISPUTED'    // In direct conflict with another established piece of knowledge
  | 'OUTDATED';   // Superseded by newer findings or deprecated

export type ContributorType = 'droid' | 'user' | 'central_brain' | 'external_source';

export type AccessScope = 'private_family' | 'shared_workspace' | 'public_pool';

export interface SourceEvidence {
  id: string;
  evidenceType: 'test_result' | 'curl_trace' | 'code_snippet' | 'log_excerpt' | 'url_reference' | 'manual_assertion';
  uri?: string;
  snippet: string;
  sha256Seal: string;
  verifiedAt?: string;
  verifiedByDroidId?: string;
}

export type RelationshipType =
  | 'SUPPORTS'
  | 'REFUTES'
  | 'DERIVED_FROM'
  | 'SUPERSEDES'
  | 'RELATED_TO';

export interface SourceRelationship {
  targetEntryId: string;
  relationType: RelationshipType;
  rationale: string;
  createdAt: string;
}

export interface SourceVersion {
  versionNumber: number;
  title: string;
  content: string;
  changedBy: string;
  changeReason: string;
  timestamp: string;
}

export interface SourceKnowledgeEntry {
  id: string;
  familyId: string;
  tenantId: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  verificationStatus: VerificationStatus;
  confidence: number; // 0.0 to 1.0
  contributor: {
    type: ContributorType;
    id: string;
    name: string;
    role?: string;
  };
  tags: string[];
  evidence: SourceEvidence[];
  relationships: SourceRelationship[];
  accessScope: AccessScope;
  isArchived: boolean;
  supersededByEntryId?: string;
  versions: SourceVersion[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DroidFamilyMember {
  droidId: string;
  name: string;
  codename: string;
  role: string;
  status: 'idle' | 'running' | 'waiting_approval' | 'paused' | 'error';
  allowedTools: string[];
  permissions: {
    networkAccess: boolean;
    filesystemScope: 'workspace_only' | 'read_only' | 'none';
    requiresApprovalForDestructive: boolean;
    maxExecutionTimeSec: number;
  };
  currentObjective?: string;
  lastActiveAt: string;
}

export interface DroidFamily {
  familyId: string;
  tenantId: string;
  ownerUserId: string;
  ownerEmail: string;
  familyName: string;
  centralBrainContext: {
    brainId: string;
    persona: string;
    activeDirectives: string[];
    activeModelId: string;
  };
  members: DroidFamilyMember[];
  stats: {
    totalKnowledgeEntries: number;
    verifiedEntriesCount: number;
    tasksCoordinatedCount: number;
    messagesExchangedCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type InterDroidFamilyMessageType =
  | 'status_query'
  | 'tool_inquiry'
  | 'assistance_request'
  | 'finding_contribution'
  | 'task_delegation'
  | 'peer_response'
  | 'ack';

export interface InterDroidFamilyMessage {
  id: string;
  familyId: string;
  fromDroidId: string;
  toDroidId: string | 'broadcast';
  messageType: InterDroidFamilyMessageType;
  subject: string;
  payload: Record<string, unknown>;
  correlationId: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  signature?: string;
}

export interface KnowledgeSearchFilter {
  familyId: string;
  tenantId?: string;
  query?: string;
  category?: KnowledgeCategory;
  verificationStatus?: VerificationStatus;
  contributorId?: string;
  tags?: string[];
  scope?: AccessScope;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface KnowledgeSanitizationResult {
  isClean: boolean;
  redactedContent: string;
  secretsDetected: string[];
  personalDataDetected: string[];
  adjustedStatus: VerificationStatus;
  warnings: string[];
}
