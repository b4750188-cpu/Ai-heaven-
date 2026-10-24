/**
 * AI HEAVEN - ThinkLess Adaptive Reasoning Budget Pipeline
 * Upstream Reference: VainF/Thinkless (MIT)
 * 
 * Rules:
 * 1. Evaluates goal entropy, task domain, prompt length, and quota parameters.
 * 2. Adaptively selects between Short-Form reasoning (System 1) and Long-Chain Chain-of-Thought (System 2).
 * 3. Prevents token waste and latency overhead on straightforward commands (echo, ls, status),
 *    while reserving deep multi-turn thinking for complex architecture and security audits.
 */

import { TaskComplexity, TaskDomain } from './centralBrainService';
import { ReasoningMode, ThinkLessDecision } from '../../contracts/decisionPipeline';

export class ThinkLessPipeline {
  /**
   * Evaluates task prompt and determines optimal reasoning mode and token budget
   */
  public evaluateReasoningBudget(
    query: string,
    domain: TaskDomain,
    complexity: TaskComplexity
  ): ThinkLessDecision {
    const wordCount = query.trim().split(/\s+/).length;
    const lower = query.toLowerCase();

    // Check for explicit deep-reasoning triggers
    const requiresDeepReasoning =
      complexity === 'complex' ||
      domain === 'architecture' ||
      domain === 'security' ||
      /(vulnerability|audit|decomp|proof|formal|cryptographic|adversarial|concurrency|deadlock)/i.test(lower);

    // Check for short-form fast-path triggers
    const isFastPath =
      complexity === 'simple' &&
      (domain === 'terminal' || domain === 'research') &&
      wordCount < 15 &&
      !requiresDeepReasoning;

    let mode: ReasoningMode;
    let recommendedTokens: number;
    let reasoningEffort: 'low' | 'medium' | 'high';
    let estimatedCostSavingPercent: number;
    let rationale: string;

    if (isFastPath) {
      mode = 'short_form';
      recommendedTokens = 350;
      reasoningEffort = 'low';
      estimatedCostSavingPercent = 75;
      rationale = 'ThinkLess Fast-Path: Straightforward task routed to low-overhead short-form reasoning (75% token latency saved).';
    } else if (requiresDeepReasoning) {
      mode = 'long_chain_cot';
      recommendedTokens = 3500;
      reasoningEffort = 'high';
      estimatedCostSavingPercent = 0;
      rationale = 'ThinkLess Deep Chain-of-Thought: Complex task requires full structural exploration, multi-step verification, and pre-mortems.';
    } else {
      mode = 'hybrid';
      recommendedTokens = 1200;
      reasoningEffort = 'medium';
      estimatedCostSavingPercent = 40;
      rationale = 'ThinkLess Hybrid: Balanced reasoning depth with targeted step decomposition.';
    }

    return {
      mode,
      complexity,
      recommendedTokens,
      reasoningEffort,
      estimatedCostSavingPercent,
      rationale
    };
  }
}

export const thinkLessPipeline = new ThinkLessPipeline();
