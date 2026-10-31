/**
 * AI HEAVEN - Autonomous Bug-Bounty Hunting Platform Contracts
 * Rigorous evidence-driven models for targets, 11 specialized droids,
 * scope snapshots, cryptographic evidence verification, and tenant-isolated workspaces.
 */

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'PROVISIONAL';

export type FindingReviewStatus =
  | 'CONFIRMED'
  | 'VERIFIED'
  | 'NEEDS_REVIEW'
  | 'NEEDS REVIEW'
  | 'UNVERIFIED'
  | 'SUSPECTED'
  | 'FALSE_POSITIVE'
  | 'FALSE POSITIVE'
  | 'OUT_OF_SCOPE'
  | 'NOT REPRODUCIBLE'
  | 'BLOCKED';

// Backward compatible alias
export type EvidenceStatus = FindingReviewStatus | 'INFERRED' | 'REJECTED';

export type InvestigationPhase =
  | 'PLAN'
  | 'DISCOVER'
  | 'ANALYZE'
  | 'TEST'
  | 'VERIFY'
  | 'CORRELATE'
  | 'REPORT'
  | 'LEARN';

export type SecurityDroidType =
  | 'commander_droid'
  | 'recon_droid'
  | 'discovery_droid'
  | 'research_droid'
  | 'source_code_droid'
  | 'api_fuzzer_droid'
  | 'auth_bypass_droid'
  | 'dependency_droid'
  | 'injection_droid'
  | 'security_droid'
  | 'secrets_droid'
  | 'intelligence_droid'
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
  confidence?: FindingConfidence;
  category: string;
  vrtCategory?: string;
  vrtId?: string;
  targetUrl: string;
  affectedComponent: string;
  description: string;
  impact?: string;
  reproductionSteps: string[];
  curlCommand: string;
  rawRequest: string;
  rawResponse: string;
  evidenceHash: string; // SHA-256 of payload & response evidence
  verificationStatus: FindingReviewStatus;
  verifiedByDroidId: string;
  participatingDroids?: string[];
  detectionTools?: string[];
  investigationPhase?: InvestigationPhase;
  sourceKnowledgeId?: string;
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
  investigationPlan?: InvestigationPlan;
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
  latestBenchmark?: BugHuntBenchmarkResult;
}

export interface InvestigationPhasePlan {
  phase: InvestigationPhase;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedDroid: string;
  toolsUsed?: string[];
  durationMs?: number;
  actions: string[];
  outputSummary?: string;
}

export interface InvestigationPlan {
  id: string;
  huntId: string;
  target: string;
  currentPhase?: string;
  phases: InvestigationPhasePlan[];
  adaptiveAdjustments: string[];
  requiresHumanApproval: boolean;
  approvalGranted?: boolean;
  createdAt: string;
}

export interface BenchmarkTestCase {
  id: string;
  title: string;
  category: string;
  targetType: string;
  inputPayload: string;
  expectedVulnerability: boolean;
  expectedCweId?: string;
  expectedSeverity?: VulnerabilitySeverity;
  description: string;
}

export interface BugHuntBenchmarkResult {
  id: string;
  timestamp: string;
  totalTestCases: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  vulnerabilityDetectionRate: number; // TP / (TP + FN)
  precision: number; // TP / (TP + FP)
  falsePositiveRate: number; // FP / (FP + TN)
  falseNegativeRate: number; // FN / (TP + FN)
  verificationSuccessRate: number; // Verified / Total TP
  duplicateDetectionRate: number;
  investigationCompletionRate: number;
  averageDetectionTimeMs: number;
  coverageByCategory: Record<string, { total: number; detected: number; rate: number }>;
  sha256ProofSeal: string;
}

export interface SecurityToolStatus {
  id: 'semgrep' | 'codeql' | 'zap' | 'nmap' | 'trivy' | 'gitleaks' | 'vrt';
  name: string;
  category: string;
  operationalState: 'READY' | 'ADAPTER_ACTIVE' | 'INTEGRATED' | 'SERVICE_REQUIRED' | 'NOT_INSTALLED';
  version: string;
  isAvailable: boolean;
  description: string;
  capabilities: string[];
  ruleCount?: number;
}
