/**
 * AI HEAVEN - Autonomous Bug-Bounty Hunting Platform Contracts
 * Rigorous evidence-driven models for targets, droids, scope enforcement,
 * cryptographic evidence verification, and tenant-isolated workspaces.
 */

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type EvidenceStatus = 'VERIFIED' | 'INFERRED' | 'UNVERIFIED' | 'REJECTED';

export type SecurityDroidType =
  | 'recon_droid'
  | 'api_fuzzer_droid'
  | 'auth_bypass_droid'
  | 'injection_droid'
  | 'secrets_droid'
  | 'verifier_droid';

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
  verificationStatus: EvidenceStatus;
  verifiedByDroidId: string;
  remediation: string;
  discoveredAt: string;
  verifiedAt?: string;
}

export type BugHuntStatus =
  | 'queued'
  | 'reconnaissance'
  | 'probing'
  | 'analyzing'
  | 'verifying'
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
  startedAt: string;
  completedAt?: string;
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
