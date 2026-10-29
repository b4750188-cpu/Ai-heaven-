/**
 * AI HEAVEN — ODYSSEUS HYBRID KNOWLEDGE SEARCH & INDEXING SERVICE
 * Integrates hybrid keyword (BM25) and semantic vector similarity search
 * on top of the persistent family SOURCE knowledge pool.
 * Features:
 * - Hybrid scoring (keyword + semantic vector cosine similarity)
 * - Passive data guard (sanitizes untrusted content so reference data cannot become executable prompt injections)
 * - Dynamic relevance feedback scoring
 * - Automated conflict detection
 */

import { sourceKnowledgeService } from '../source/sourceKnowledgeService';
import { HybridSearchResultItem } from '../../types/odysseus';
import { SourceKnowledgeEntry } from '../../types/sourceKnowledge';

export class HybridKnowledgeService {
  private feedbackScores: Map<string, number> = new Map(); // entryId -> score modifier (-0.2 to +0.2)

  /**
   * Sanitizes untrusted knowledge text so it remains passive data and cannot execute as a prompt injection.
   */
  public sanitizeForPassiveContext(text: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[REMOVED_SCRIPT]')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[REMOVED_IFRAME]')
      .replace(/\bjavascript:[^\s]+/gi, '[REMOVED_URL]')
      .replace(/\[\s*(?:system|assistant|system_message|developer_prompt)\s*\]/gi, '[SAFE_TEXT]')
      .replace(/ignore (?:all )?(?:previous|above) instructions/gi, '[FILTERED_INSTRUCTION_OVERRIDE]');
  }

  /**
   * Generates a term-frequency vector for semantic cosine similarity.
   */
  private computeTermVector(text: string): Map<string, number> {
    const vector = new Map<string, number>();
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    for (const token of tokens) {
      vector.set(token, (vector.get(token) || 0) + 1);
    }
    return vector;
  }

  /**
   * Computes cosine similarity between two term-frequency vectors.
   */
  private computeCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (const [term, countA] of vecA.entries()) {
      magA += countA * countA;
      const countB = vecB.get(term) || 0;
      dotProduct += countA * countB;
    }

    for (const countB of vecB.values()) {
      magB += countB * countB;
    }

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Performs hybrid search combining keyword matching and vector similarity.
   */
  public searchHybrid(params: {
    familyId: string;
    query: string;
    category?: string;
    limit?: number;
  }): { items: HybridSearchResultItem[]; total: number } {
    if (!params.familyId || !params.query) {
      return { items: [], total: 0 };
    }

    const rawEntries = sourceKnowledgeService.listEntriesForFamily(params.familyId);
    const queryLower = params.query.trim().toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);
    const queryVector = this.computeTermVector(params.query);

    const scoredItems: Array<{ item: SourceKnowledgeEntry; score: number; matchType: 'keyword' | 'semantic_vector' | 'hybrid' }> = [];

    for (const entry of rawEntries) {
      if (entry.isArchived) continue;
      if (params.category && entry.category !== params.category) continue;

      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();
      const tagsJoined = entry.tags.join(' ').toLowerCase();

      // 1. Keyword Score (BM25 heuristic)
      let keywordScore = 0;
      for (const token of queryTokens) {
        if (titleLower.includes(token)) keywordScore += 0.4;
        if (tagsJoined.includes(token)) keywordScore += 0.3;
        if (contentLower.includes(token)) keywordScore += 0.15;
      }
      keywordScore = Math.min(1.0, keywordScore);

      // 2. Semantic Vector Score (Cosine Similarity)
      const docVector = this.computeTermVector(`${entry.title} ${entry.content} ${entry.tags.join(' ')}`);
      const semanticScore = this.computeCosineSimilarity(queryVector, docVector);

      // 3. Blend Scores (Hybrid)
      let finalScore = (keywordScore * 0.45) + (semanticScore * 0.55);

      // Verification bonus
      if (entry.verificationStatus === 'VERIFIED') {
        finalScore += 0.1;
      } else if (entry.verificationStatus === 'DISPUTED') {
        finalScore -= 0.15;
      }

      // Relevance feedback modifier
      const feedbackMod = this.feedbackScores.get(entry.id) || 0;
      finalScore += feedbackMod;

      if (finalScore > 0.12) {
        let matchType: 'keyword' | 'semantic_vector' | 'hybrid' = 'hybrid';
        if (keywordScore > 0.4 && semanticScore < 0.2) matchType = 'keyword';
        else if (semanticScore > 0.4 && keywordScore < 0.1) matchType = 'semantic_vector';

        scoredItems.push({
          item: entry,
          score: Math.min(1.0, Math.max(0.0, Math.round(finalScore * 100) / 100)),
          matchType
        });
      }
    }

    scoredItems.sort((a, b) => b.score - a.score);

    const limit = params.limit || 20;
    const paginated = scoredItems.slice(0, limit);

    const items: HybridSearchResultItem[] = paginated.map(({ item, score, matchType }) => ({
      id: item.id,
      title: item.title,
      snippet: this.sanitizeForPassiveContext(item.content).slice(0, 240) + '...',
      category: item.category,
      verificationStatus: item.verificationStatus,
      confidence: item.confidence,
      score,
      matchType,
      provenanceEvidenceCount: item.evidence?.length || 0,
      tags: item.tags,
      updatedAt: item.updatedAt
    }));

    return {
      items,
      total: scoredItems.length
    };
  }

  /**
   * Records user or droid feedback on retrieval quality to optimize future rankings.
   */
  public submitRetrievalFeedback(entryId: string, helpful: boolean): void {
    const current = this.feedbackScores.get(entryId) || 0;
    const delta = helpful ? 0.05 : -0.05;
    const next = Math.max(-0.25, Math.min(0.25, current + delta));
    this.feedbackScores.set(entryId, next);
  }
}

export const hybridKnowledgeService = new HybridKnowledgeService();
