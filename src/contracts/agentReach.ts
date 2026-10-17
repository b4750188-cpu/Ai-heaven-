/**
 * AI HEAVEN - Agent Reach Integration Contracts & Diagnostics
 * Upstream Reference: Panniantong/Agent-Reach (MIT)
 * Provides schema definitions, platform diagnostics, SSRF guards, and research query types.
 */

export type AgentReachPlatform =
  | 'github'
  | 'reddit'
  | 'youtube'
  | 'rss'
  | 'twitter'
  | 'web'
  | 'xhs'
  | 'all';

export interface PlatformDiagnostic {
  platform: AgentReachPlatform;
  displayName: string;
  status: 'ready' | 'degraded' | 'unconfigured' | 'error' | 'rate_limited';
  isConfigured: boolean;
  requiresAuth?: boolean;
  upstreamTool: string;
  message: string;
  latencyMs?: number;
}

export interface AgentReachDoctorReport {
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'unconfigured';
  upstreamVersion: string;
  upstreamRepo: string;
  platforms: PlatformDiagnostic[];
  recommendations: string[];
  timestamp: string;
}

export interface AgentReachResearchItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  author?: string;
  timestamp?: string;
  isFact: boolean;
  confidence?: number;
}

export interface AgentReachResearchResult {
  id: string;
  executionId: string;
  query: string;
  platform: string;
  selectedPlatforms: string[];
  status: 'completed' | 'failed' | 'running';
  durationMs: number;
  depth?: 'brief' | 'standard' | 'deep';
  summary: string;
  factsCount: number;
  results: AgentReachResearchItem[];
  notices: string[];
  receipts: {
    hash: string;
    timestamp: string;
    engine: string;
  };
  timestamp: string;
}

export interface AgentReachResearchQuery {
  query: string;
  platform?: AgentReachPlatform | 'all';
  maxResults?: number;
  depth?: 'brief' | 'standard' | 'deep';
  targetUrl?: string;
  outputFormat?: 'json' | 'markdown' | 'summary';
  tenantId?: string;
  userId?: string;
}

export interface AgentReachConfig {
  isEnabled: boolean;
  defaultPlatforms: AgentReachPlatform[];
  timeoutMs: number;
  maxConcurrency: number;
  cacheTtlSeconds: number;
}

export const AGENT_REACH_UPSTREAM = {
  name: 'Agent-Reach',
  repository: 'https://github.com/Panniantong/Agent-Reach',
  author: 'Panniantong',
  license: 'MIT',
  version: '1.2.0',
  description: 'Internet research and intelligence gathering layer for autonomous agent ecosystems.'
};
