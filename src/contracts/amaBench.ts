/**
 * AI HEAVEN - AMA-Bench (Agent Memory with Any length) Contracts
 * Upstream Reference: AMA-Bench/AMA-Hub, ama-bench.github.io (Apache-2.0 / MIT)
 * 
 * Provides:
 * 1. Agent memory evaluation harness over long-horizon trajectories.
 * 2. Multi-facet assessment: state updating, causal inference, and long-context recall.
 * 3. Standardized scoring without fabricated benchmark numbers.
 */

export type AMABenchmarkDomain =
  | 'software_engineering'
  | 'text2sql'
  | 'tool_qa'
  | 'web_navigation'
  | 'system_architecture';

export interface AMATrajectoryStep {
  stepIndex: number;
  state: string;
  action: string;
  observation: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  timestamp: string;
}

export interface AMAMemoryQuery {
  queryId: string;
  domain: AMABenchmarkDomain;
  question: string;
  groundTruthKeywords: string[];
  expectedCausalPredecessors: number[]; // Step indices that causally explain the state
}

export interface AMABenchmarkEvaluationResult {
  evaluationId: string;
  domain: AMABenchmarkDomain;
  trajectoryLength: number;
  retrievalPrecision: number; // 0.0 - 1.0
  stateUpdatingAccuracy: number; // 0.0 - 1.0
  causalInferenceScore: number; // 0.0 - 1.0
  overallScore: number; // 0.0 - 1.0
  totalQueriesEvaluated: number;
  evaluatedAt: string;
  evidenceReceipt: string; // SHA-256 evaluation proof
}

export interface IAMABenchHarness {
  runEvaluation(
    domain: AMABenchmarkDomain,
    trajectory: AMATrajectoryStep[],
    queries: AMAMemoryQuery[]
  ): Promise<AMABenchmarkEvaluationResult>;
  getStandardTestCases(domain: AMABenchmarkDomain): { trajectory: AMATrajectoryStep[]; queries: AMAMemoryQuery[] };
}
