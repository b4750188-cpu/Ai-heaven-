/**
 * AI HEAVEN — ODYSSEUS CAPABILITY INTEGRATION CONTRACTS
 * Formal interfaces for Autonomous Agent Loops, Deep Research Engine,
 * Hardware-Aware Cookbook, Hybrid Knowledge Pool, and Workspace Productivity.
 */

import { VerificationStatus } from './sourceKnowledge';

// ==========================================
// 1. HARDWARE COOKBOOK & MODEL INTELLIGENCE
// ==========================================

export type QuantizationLevel = 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'FP16';

export type ModelCompatibilityFit =
  | 'optimal'               // Fits entirely in GPU VRAM or fast RAM with high token throughput
  | 'possible_with_offload'  // Fits with partial CPU/RAM offload, reduced tokens/sec
  | 'insufficient_hardware'; // Exceeds available RAM/VRAM, risk of OOM crash

export interface QuantizedModelSpec {
  id: string;
  name: string;
  family: string;            // 'Llama', 'DeepSeek', 'Mistral', 'Qwen', 'Gemma'
  parameterCountB: number;  // Parameter count in billions (e.g. 1.5, 3, 7, 8, 14, 32, 70)
  defaultQuantization: QuantizationLevel;
  minVramGb: number;
  recommendedRamGb: number;
  contextWindowTokens: number;
  tags: string[];            // ['reasoning', 'coding', 'general', 'compact', 'fast']
  license: string;
  isLocalOnly: boolean;
}

export interface ModelFitAssessment {
  model: QuantizedModelSpec;
  fit: ModelCompatibilityFit;
  requiredMemoryGb: number;
  availableMemoryGb: number;
  memoryHeadroomGb: number;
  estimatedTokensPerSec: number;
  explanation: string;
  recommendedBackend: 'ollama' | 'lmstudio' | 'vllm' | 'edge0' | 'cloud_api';
}

export interface HostHardwareProfile {
  cpuCores: number;
  cpuModel: string;
  totalSystemRamGb: number;
  freeSystemRamGb: number;
  osPlatform: string;
  architecture: string;
  gpuAvailable: boolean;
  gpuName?: string;
  vramGb?: number;
  isServerlessOrContainer: boolean;
  environmentName: string; // 'local_workstation' | 'cloud_run' | 'vercel' | 'docker'
  localBackends: {
    ollama: { isOnline: boolean; endpoint: string; models: string[]; latencyMs?: number };
    lmStudio: { isOnline: boolean; endpoint: string; models: string[]; latencyMs?: number };
    vllm: { isOnline: boolean; endpoint: string; models: string[]; latencyMs?: number };
    edge0: { isOnline: boolean; endpoint: string; models: string[]; latencyMs?: number };
  };
}

export interface ModelRecommendationMatrix {
  hardware: HostHardwareProfile;
  localFits: ModelFitAssessment[];
  cloudAlternatives: Array<{
    provider: string;
    model: string;
    contextTokens: number;
    costPerMillionInput: number;
    costPerMillionOutput: number;
    recommendedUse: string;
  }>;
  environmentAdvisory: string;
}

// ==========================================
// 2. DEEP RESEARCH ENGINE
// ==========================================

export type ResearchStage =
  | 'planning'
  | 'discovering_sources'
  | 'reading_documents'
  | 'cross_checking'
  | 'synthesizing'
  | 'completed'
  | 'failed';

export interface ResearchPlanSubQuery {
  id: string;
  query: string;
  targetDomain?: string;
  purpose: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  resultsCount: number;
}

export interface ResearchSourceRecord {
  id: string;
  url: string;
  title: string;
  domain: string;
  retrievedAt: string;
  status: 'fetched' | 'unreachable' | 'blocked_by_security';
  rawSnippet: string;
  extractedKeyClaims: string[];
  reliabilityScore: number; // 0.0 - 1.0
  sha256Hash: string;
}

export interface ExtractedFactClaim {
  id: string;
  claim: string;
  sourceUrl: string;
  evidenceQuote: string;
  verificationStatus: VerificationStatus;
  confidence: number;
  corroboratedByCount: number;
}

export interface ResearchConflict {
  id: string;
  topic: string;
  claimA: string;
  sourceAUrl: string;
  claimB: string;
  sourceBUrl: string;
  resolutionAnalysis: string;
  status: 'unresolved' | 'consensus_formed' | 'disputed';
}

export interface SynthesizedReportSection {
  title: string;
  content: string;
  citations: string[]; // List of source IDs
  epistemicStatus: VerificationStatus;
}

export interface DeepResearchReport {
  id: string;
  tenantId: string;
  familyId: string;
  topic: string;
  executiveSummary: string;
  sections: SynthesizedReportSection[];
  keyFindings: Array<{
    finding: string;
    status: VerificationStatus;
    confidence: number;
    citations: string[];
  }>;
  conflicts: ResearchConflict[];
  sources: ResearchSourceRecord[];
  totalSourcesAnalyzed: number;
  durationMs: number;
  createdAt: string;
  completedAt: string;
  sourceKnowledgeEntryId?: string; // Automatically saved to SOURCE pool
}

export interface DeepResearchTaskProgress {
  taskId: string;
  topic: string;
  stage: ResearchStage;
  progressPercent: number;
  currentActivity: string;
  plan: ResearchPlanSubQuery[];
  sources: ResearchSourceRecord[];
  report?: DeepResearchReport;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

// ==========================================
// 3. ADVANCED AGENT EXECUTION LOOP & SKILLS
// ==========================================

export type AgentLoopStepType =
  | 'think'
  | 'plan'
  | 'tool_call'
  | 'approval_gate'
  | 'execute'
  | 'observe'
  | 'synthesize';

export interface AgentLoopStep {
  stepNumber: number;
  stepType: AgentLoopStepType;
  description: string;
  thought?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  isGatedByApproval?: boolean;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
  approvedBy?: string;
  durationMs: number;
  timestamp: string;
  sha256Receipt?: string;
}

export interface AgentSkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  requiredPermissions: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  category: 'research' | 'code' | 'security' | 'filesystem' | 'workflow';
  isSafeForAutonomousRun: boolean;
}

export interface AgentLoopExecutionResult {
  runId: string;
  tenantId: string;
  agentId: string;
  goal: string;
  status: 'completed' | 'waiting_approval' | 'failed' | 'timeout';
  steps: AgentLoopStep[];
  finalSynthesis?: string;
  executionReceipt: string;
  durationMs: number;
  totalTokensUsed?: number;
  skillsLoaded: string[];
}

// ==========================================
// 4. HYBRID KNOWLEDGE SEARCH & WORKSPACE
// ==========================================

export interface HybridSearchResultItem {
  id: string;
  title: string;
  snippet: string;
  category: string;
  verificationStatus: VerificationStatus;
  confidence: number;
  score: number;
  matchType: 'keyword' | 'semantic_vector' | 'hybrid';
  provenanceEvidenceCount: number;
  tags: string[];
  updatedAt: string;
}

export interface WorkspaceDocument {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: 'note' | 'research_draft' | 'specification' | 'post_mortem';
  citations: Array<{ sourceId: string; title: string; url?: string }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}
