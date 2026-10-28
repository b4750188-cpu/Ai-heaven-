/**
 * AI HEAVEN - Knowledge Sanitizer & Epistemic Speculation Guard
 * Prevents secret leaks, redacts sensitive personal data, and enforces
 * epistemic rigor so speculative droid assertions cannot masquerade as VERIFIED facts.
 */

import crypto from 'crypto';
import { KnowledgeSanitizationResult, SourceEvidence, VerificationStatus } from '../../types/sourceKnowledge';

// Regex patterns for secret detection
const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9T3BlbkFJ]{20,}/g },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]-[0-9a-zA-Z]{36}/g },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'JWT Bearer Token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----[^-]+-----END (?:RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----/gs },
  { name: 'Hardcoded Password Assignment', regex: /(?:password|secret|passwd|api_key)\s*[:=]\s*['"][^'"]{6,}['"]/gi }
];

// Sensitive personal data patterns (SSN, credit cards)
const PERSONAL_DATA_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Social Security Number', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'Credit Card Number', regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g }
];

// Speculation keywords that contradict a VERIFIED claim without proof
const SPECULATION_KEYWORDS = [
  'maybe',
  'perhaps',
  'speculate',
  'speculating',
  'hypothesis',
  'unconfirmed',
  'untested',
  'i guess',
  'we suspect',
  'could possibly be',
  'anecdotal',
  'not reproduced'
];

export class KnowledgeSanitizer {
  /**
   * Scans content, redacts secrets, detects sensitive PII, and validates epistemic status.
   */
  public sanitize(
    rawTitle: string,
    rawContent: string,
    requestedStatus: VerificationStatus,
    evidence: SourceEvidence[] = []
  ): KnowledgeSanitizationResult {
    const secretsDetected: string[] = [];
    const personalDataDetected: string[] = [];
    const warnings: string[] = [];

    let cleanedContent = rawContent;

    // 1. Secret Detection & Redaction
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(cleanedContent) || pattern.regex.test(rawTitle)) {
        secretsDetected.push(pattern.name);
        cleanedContent = cleanedContent.replace(pattern.regex, '[REDACTED_SECRET]');
      }
      pattern.regex.lastIndex = 0; // reset state
    }

    // 2. Personal Data Detection & Redaction
    for (const pattern of PERSONAL_DATA_PATTERNS) {
      if (pattern.regex.test(cleanedContent)) {
        personalDataDetected.push(pattern.name);
        cleanedContent = cleanedContent.replace(pattern.regex, '[REDACTED_PII]');
      }
      pattern.regex.lastIndex = 0;
    }

    // 3. Epistemic Verification Guard:
    // If a droid or user requests 'VERIFIED', but provides zero verified evidence seals
    // or uses speculative language, demote to 'INFERRED' or 'UNVERIFIED'.
    let adjustedStatus = requestedStatus;
    const lowerContent = cleanedContent.toLowerCase();
    const hasSpeculativeLanguage = SPECULATION_KEYWORDS.some(kw => lowerContent.includes(kw));
    const hasVerifiedEvidenceSeal = evidence.some(e => Boolean(e.sha256Seal && e.sha256Seal.length === 64));

    if (requestedStatus === 'VERIFIED') {
      if (hasSpeculativeLanguage) {
        adjustedStatus = 'INFERRED';
        warnings.push(
          'Epistemic Guard: Content contains speculative language. Demoted from VERIFIED to INFERRED.'
        );
      } else if (!hasVerifiedEvidenceSeal && evidence.length === 0) {
        adjustedStatus = 'UNVERIFIED';
        warnings.push(
          'Epistemic Guard: Cannot declare knowledge as VERIFIED without verifiable evidence or a SHA-256 seal. Demoted to UNVERIFIED.'
        );
      }
    }

    const isClean = secretsDetected.length === 0 && personalDataDetected.length === 0;

    return {
      isClean,
      redactedContent: cleanedContent,
      secretsDetected,
      personalDataDetected,
      adjustedStatus,
      warnings
    };
  }

  /**
   * Generates a deterministic content fingerprint for deduplication checks.
   */
  public computeFingerprint(title: string, content: string): string {
    const normalized = `${title.trim().toLowerCase()}::${content.trim().toLowerCase().replace(/\s+/g, ' ')}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Computes Jaccard word-set similarity for fuzzy duplicate detection.
   */
  public computeSimilarity(textA: string, textB: string): number {
    const tokenize = (t: string) =>
      new Set(
        t
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3)
      );

    const setA = tokenize(textA);
    const setB = tokenize(textB);

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }

    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }
}

export const knowledgeSanitizer = new KnowledgeSanitizer();
