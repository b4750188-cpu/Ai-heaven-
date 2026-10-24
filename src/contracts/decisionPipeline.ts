/**
 * AI HEAVEN - Decision Pipeline & Classification Contracts
 * Integrates:
 * - ThinkLess (VainF/Thinkless): Adaptive short-form vs long-chain reasoning budget pipeline
 * - Laya (NandhaKishorM/laya): Non-autoregressive System 1 typed decision engine
 * - GLiNER2.5-Decide (fastino-ai/GLiNER2): Zero-shot encoder for schema-defined classification
 * - Thalamus (cobaltcore-dev/Thalamus): Resilient routing middleware & fallback mechanism
 */

import { TaskComplexity, TaskDomain } from '../services/brain/centralBrainService';

export type ReasoningMode = 'short_form' | 'hybrid' | 'long_chain_cot';

export interface ThinkLessDecision {
  mode: ReasoningMode;
  complexity: TaskComplexity;
  recommendedTokens: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  estimatedCostSavingPercent: number;
  rationale: string;
}

export interface DecisionBackendStatus {
  backend: 'laya' | 'gliner' | 'thalamus' | 'native_heuristic';
  endpoint?: string;
  isAvailable: boolean;
  latencyMs?: number;
  upstreamUrl: string;
  upstreamLicense: string;
  status: 'connected' | 'unconfigured' | 'fallback_active';
}

export interface SchemaDecisionRequest {
  text: string;
  candidateLabels: string[];
  context?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface SchemaDecisionResult {
  predictedLabel: string;
  confidence: number;
  probabilities: Record<string, number>;
  backendUsed: string;
  durationMs: number;
  fallbackTriggered: boolean;
}

export interface IThalamusMiddleware {
  routeDecision(request: SchemaDecisionRequest): Promise<SchemaDecisionResult>;
  checkHealth(): Promise<DecisionBackendStatus[]>;
}
