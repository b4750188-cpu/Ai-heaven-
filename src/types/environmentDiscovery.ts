/**
 * AI HEAVEN - Environment Discovery & Health Monitoring Contracts
 * Defines factual, evidence-backed structures for dev, Cloud Run,
 * Vercel, Database, API, and Android environments without mock fabrication.
 */

export interface SystemRuntimeInfo {
  nodeVersion: string;
  pid: number;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  cpuCount: number;
}

export interface DeploymentEnvironmentInfo {
  environment: 'development' | 'cloud_run' | 'vercel' | 'native_android' | 'production';
  isCloudRun: boolean;
  isVercel: boolean;
  isLocalDev: boolean;
  deployedUrl: string;
  serviceName?: string;
  region?: string;
  buildVersion: string;
  gitCommit?: string;
}

export interface DatabaseHealthInfo {
  configured: boolean;
  mode: 'postgresql' | 'authoritative_local_store';
  connected: boolean;
  latencyMs: number;
  poolStatus?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  persistentStoragePath: string;
  lastChecked: string;
}

export interface ApiHealthInfo {
  baseUrl: string;
  healthStatus: 'healthy' | 'degraded' | 'down';
  activeEndpointsCount: number;
  corsOrigins: string[];
  rateLimitActive: boolean;
}

export interface AndroidEnvironmentInfo {
  capacitorConfigured: boolean;
  appId: string;
  appName: string;
  apkWorkflowConfigured: boolean;
  nodeVersionRequirement: string;
  verifiedNodeMeetsRequirement: boolean;
  capabilities: {
    offlineStorage: boolean;
    biometricsAvailable: boolean;
    pushNotificationsConfigured: boolean;
  };
}

export interface VerifiedCapability {
  capability: string;
  status: 'verified_active' | 'restricted' | 'unavailable' | 'unknown';
  evidence: string;
}

export interface EnvironmentDiscoveryReport {
  timestamp: string;
  runtime: SystemRuntimeInfo;
  deployment: DeploymentEnvironmentInfo;
  database: DatabaseHealthInfo;
  api: ApiHealthInfo;
  android: AndroidEnvironmentInfo;
  capabilityMatrix: VerifiedCapability[];
  warnings: string[];
}
