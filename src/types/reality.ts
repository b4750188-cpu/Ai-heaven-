/**
 * AI HEAVEN - Unified Reality & Capability Registry Types
 * 
 * Rules:
 * 1. Never display invented, assumed, hardcoded, stale, or simulated production values.
 * 2. Distinct truthful states: NOT_IMPLEMENTED, NOT_CONFIGURED, DISCONNECTED,
 *    AUTHORIZATION_REQUIRED, CONNECTING, CONNECTED, DEGRADED, UNAVAILABLE,
 *    PERMISSION_DENIED, EXPIRED, STALE, UNKNOWN, ERROR.
 * 3. Separate provider account quotas from application-level backup measurements.
 */

export type CapabilityState =
  | 'NOT_IMPLEMENTED'
  | 'NOT_CONFIGURED'
  | 'DISCONNECTED'
  | 'AUTHORIZATION_REQUIRED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'EXPIRED'
  | 'STALE'
  | 'UNKNOWN'
  | 'ERROR';

export type CapabilityCategory =
  | 'cloud_storage'
  | 'identity'
  | 'ai_model'
  | 'database'
  | 'code_repository'
  | 'security_platform'
  | 'execution_sandbox'
  | 'quality_assurance'
  | 'workflow_engine';

export type DataFreshness = 'live' | 'cached' | 'stale' | 'unavailable';

export interface CapabilityEntry {
  id: string;
  displayName: string;
  provider: string;
  category: CapabilityCategory;
  isImplemented: boolean;
  isConfigured: boolean;
  isAuthorized: boolean;
  isConnected: boolean;
  hasSufficientPermissions: boolean;
  isReachable: boolean;
  lastOperationSucceeded: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
  actionableExplanation: string | null;
  dataFreshness: DataFreshness;
  supportedCapabilities: string[];
  limitations: string[];
  owningUser: string;
  owningWorkspace: string;
  requiresUserApproval: boolean;
  state: CapabilityState;
  nextRequiredAction: string;
  metrics?: Record<string, unknown>;
}

export type CredentialClassification =
  | 'Required'
  | 'Optional'
  | 'Feature-specific'
  | 'Development/test-only'
  | 'Unused'
  | 'Unverified';

export interface CredentialAuditItem {
  name: string;
  classification: CredentialClassification;
  purpose: string;
  dependentFeature: string;
  isConfigured: boolean;
  isGenuinelyRequired: boolean;
  supportedConfigurationPath: string;
  behaviorWhenAbsent: string;
  isSecretRedacted: boolean;
  redactedDisplay: string;
}

export interface GoogleDriveAccountQuota {
  isConnected: boolean;
  isQuotaAvailable: boolean;
  totalBytes: number | null;
  usedBytes: number | null;
  availableBytes: number | null;
  percentUsed: number | null;
  formattedTotal: string;
  formattedUsed: string;
  formattedAvailable: string;
  lastCheckedAt: string | null;
  freshness: DataFreshness;
  explanation: string;
}

export interface GoogleDriveBackupStatus {
  destinationFolder: string;
  dataBackedUpBytes: number;
  formattedBackedUp: string;
  lastSuccessfulBackupAt: string | null;
  backupStatus: 'not_configured' | 'idle' | 'in_progress' | 'succeeded' | 'failed' | 'stale';
  pendingJobsCount: number;
  failedJobsCount: number;
  lastBackupChecksum?: string;
  lastError?: string;
}
