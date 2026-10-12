/**
 * AI HEAVEN - Autonomous Bug-Bounty Hunting Platform Contracts
 * Rigorous evidence-driven models for targets, 11 specialized droids,
 * scope snapshots, cryptographic evidence verification, and tenant-isolated workspaces.
 */

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingReviewStatus =
  | 'SUSPECTED'
  | 'NEEDS REVIEW'
  | 'VERIFIED'
  | 'FALSE POSITIVE'
  | 'NOT REPRODUCIBLE'
  | 'BLOCKED';

// Backward compatible alias
export type EvidenceStatus = FindingReviewStatus | 'INFERRED' | 'UNVERIFIED' | 'REJECTED';

export type SecurityDroidType =
  | 'commander_droid'
  | 'recon_droid'
  | 'research_droid'
  | 'source_code_droid'
  | 'api_fuzzer_droid'
  | 'auth_bypass_droid'
  | 'dependency_droid'
  | 'injection_droid'
  | 'secrets_droid'
  | 'verifier_droid'
  | 'adversarial_review_droid'
  | 'remediation_droid'
  | 'reporting_droid';

export interface SecurityDroid {
  id: string;
  type: SecurityDroidType;
  name: string;
  codename: string;
  version: string;
  role: string;
  description: string;
  capabilities: string[];
  status: 'ready' | 'hunting' | 'verifying' | 'idle';
  findingsCount: number;
  lastActiveAt: string;
}

export interface SecurityProgramScopeRule {
  target: string;
  type: 'domain' | 'wildcard' | 'api' | 'repository' | 'cidr';
  eligibleForBounty: boolean;
  notes?: string;
}

export interface SecurityProgram {
  id: string;
  name: string;
  platform: 'hackerone' | 'bugcrowd' | 'intigriti' | 'direct' | 'github';
  handle: string;
  policyUrl: string;
  inScope: SecurityProgramScopeRule[];
  outOfScope: string[];
  permittedTechniques: string[];
  forbiddenTechniques: string[];
  maxBounty?: string;
  isAuthorized: boolean;
  authorizedAt?: string;
}

export type TargetScopeType = 'domain' | 'web_api' | 'github_repo' | 'smart_contract' | 'cloud_config';

export interface BugHuntScope {
  targetType: TargetScopeType;
  targetValue: string;
  allowedHosts: string[];
  disallowedPaths: string[];
  authorizationHeader?: string;
  rateLimitPerSecond?: number;
  scopeSnapshotId?: string;
}

export interface BugHuntConfig {
  scope: BugHuntScope;
  selectedDroids: SecurityDroidType[];
  permittedTechniques: Array<
    | 'passive_recon'
    | 'stack_fingerprinting'
    | 'api_schema_fuzzing'
    | 'auth_boundary_probing'
    | 'safe_injection_testing'
    | 'secret_leak_scanning'
    | 'sast_code_audit'
    | 'dependency_audit'
  >;
  verificationDepth: 'fast_triage' | 'deep_evidence' | 'dual_droid_consensus';
  reportingStyle: 'hackerone' | 'bugcrowd' | 'executive';
}

export interface VulnerabilityFinding {
  id: string;
  huntId: string;
  userId: string;
  tenantId: string;
  title: string;
  cweId: string;
  cweName: string;
  cvssScore: number;
  cvssVector: string;
  severity: VulnerabilitySeverity;
  category: string;
  targetUrl: string;
  affectedComponent: string;
  description: string;
  reproductionSteps: string[];
  curlCommand: string;
  rawRequest: string;
  rawResponse: string;
  evidenceHash: string; // SHA-256 of payload & response evidence
  verificationStatus: FindingReviewStatus;
  verifiedByDroidId: string;
  remediation: string;
  falsePositiveReviewNotes?: string;
  isDataRedacted: boolean;
  discoveredAt: string;
  verifiedAt?: string;
}

export type BugHuntStatus =
  | 'queued'
  | 'reconnaissance'
  | 'probing'
  | 'analyzing'
  | 'verifying'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BugHuntLogEntry {
  timestamp: string;
  droid: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export interface BugHuntJob {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  target: string;
  config: BugHuntConfig;
  status: BugHuntStatus;
  progressPercent: number;
  currentDroid?: string;
  logs: BugHuntLogEntry[];
  findings: VulnerabilityFinding[];
  reportMarkdown?: string;
  receiptId?: string;
  scopeSnapshotChecksum?: string;
  startedAt: string;
  completedAt?: string;
  cancellationReason?: string;
  resumedFromPhase?: string;
}

export interface UserBugHuntWorkspace {
  userId: string;
  tenantId: string;
  huntsCount: number;
  totalFindingsCount: number;
  verifiedFindingsCount: number;
  criticalCount: number;
  highCount: number;
  activeDroids: SecurityDroid[];
  recentHunts: BugHuntJob[];
  authorizedPrograms: SecurityProgram[];
  toolConfigs: Record<string, { enabled: boolean; maxThreads: number; timeoutMs: number }>;
}
