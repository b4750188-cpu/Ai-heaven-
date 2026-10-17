/**
 * AI HEAVEN - Security Scanner Contracts & Findings Schema
 * Integrating: Gitleaks, Semgrep, Trivy, OSSF Scorecard, and associated security tools
 */

export type ScannerId =
  | 'gitleaks'
  | 'semgrep'
  | 'trivy'
  | 'codeql'
  | 'zaproxy'
  | 'agentgrep'
  | 'grype'
  | 'scorecard'
  | 'nmap'
  | 'nuclei'
  | 'masscan';

export type ToolOperationalState =
  | 'READY'
  | 'NOT_INSTALLED'
  | 'MISCONFIGURED'
  | 'UNAVAILABLE'
  | 'FAILED'
  | 'NOT_VERIFIED';

export type FindingStatus =
  | 'CONFIRMED'
  | 'SUSPECTED'
  | 'UNVERIFIED'
  | 'OUTDATED'
  | 'FALSE_POSITIVE';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export interface SecurityEvidence {
  hash: string; // SHA-256
  payload?: string;
  responseSnippet?: string;
  sourceFile?: string;
  startLine?: number;
  endLine?: number;
  rawOutputSnippet?: string;
  capturedAt: string;
}

export interface SecurityFinding {
  id: string;
  scanJobId: string;
  scannerId: ScannerId;
  scannerVersion: string;
  ruleId: string;
  cwe?: string;
  cve?: string;
  target: string;
  authorizedScope: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: FindingStatus;
  affectedComponent: string;
  location?: {
    path?: string;
    line?: number;
    column?: number;
    url?: string;
  };
  evidence: SecurityEvidence;
  remediation?: string;
  discoveredAt: string;
  verifiedAt?: string;
}

export interface ScanTargetScope {
  target: string;
  allowedHosts: string[];
  allowedPaths: string[];
  isAuthorized: boolean;
  authorizationToken?: string;
  programName?: string;
  maximumDepth?: number;
  rateLimitPerSec?: number;
}

export interface ScanJobRequest {
  scannerId: ScannerId;
  targetScope: ScanTargetScope;
  parameters?: Record<string, any>;
  tenantId?: string;
}

export interface ScanJobResult {
  jobId: string;
  scannerId: ScannerId;
  scannerVersion: string;
  target: string;
  status: 'completed' | 'failed' | 'cancelled' | 'scope_violation';
  findingsCount: number;
  findings: SecurityFinding[];
  durationMs: number;
  summary: string;
  evidenceChecksum: string;
  startedAt: string;
  completedAt: string;
  cancellationSupported: boolean;
  executionMode?: 'cli_binary' | 'native_ruleset' | 'cloud_api' | 'blocked_scope';
  cliBinaryDetected?: boolean;
}

export interface ISecurityScannerAdapter {
  id: ScannerId;
  name: string;
  version: string;
  upstreamUrl: string;
  upstreamLicense: string;
  category: 'SAST' | 'DAST' | 'SCA' | 'SUPPLY_CHAIN' | 'STRUCTURAL_SEARCH' | 'SECRET_DETECTION' | 'NETWORK_PORT_AUDIT' | 'TEMPLATE_VULN_SCAN' | 'HIGH_SPEED_DISCOVERY';
  runtimeRequirement: 'in_process' | 'local_binary' | 'container_service' | 'cloud_api';
  status: 'operational' | 'adapter_ready' | 'service_required';
  operationalState?: ToolOperationalState;
  isAvailable(): boolean;
  getDetailedStatus?(): { state: ToolOperationalState; version?: string; executablePath?: string; message: string };
  executeScan(request: ScanJobRequest): Promise<ScanJobResult>;
  cancelScan(jobId: string): Promise<boolean>;
}
