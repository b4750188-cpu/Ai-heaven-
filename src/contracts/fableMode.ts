/**
 * AI HEAVEN - Fable Mode & Grounding Verification Contracts
 * 
 * Inspired by codeclawd/fable-mode (MIT License):
 * Community agentic distillation of Fable-style discipline,
 * cold grounding verification, test-after-edit mechanical enforcement,
 * and irreversibility-scaled reasoning.
 */

export interface FableModeConfig {
  isEnabled: boolean;
  version: string;
  sourceRepo: string;
  discipline: 'fable_5_1_distillation';
  testAfterEditEnabled: boolean;
  debounceSeconds: number;
  timeoutSeconds: number;
  trustedRoots: string[];
  reportVsFixEnforced: boolean;
  evidenceBeforeStateChange: boolean;
}

export type ClaimEvidenceType = 'read' | 'run' | 'behavioral';
export type ClaimVerdict = 'CONFIRMED' | 'REFUTED' | 'INSUFFICIENT';

export interface GroundingClaim {
  id: string;
  claim: string;
  evidenceType: ClaimEvidenceType;
  reference: string; // e.g. "src/api/app.ts:42" or "npm test"
  verdict?: ClaimVerdict;
  observedEvidence?: string;
  divergenceReason?: string;
}

export interface GroundingLedgerReport {
  id: string;
  stepGoal: string;
  claims: GroundingClaim[];
  gapsIdentified: string[];
  summaryFidelity?: {
    isFaithful: boolean;
    omissions: string[];
    unsupportedClaims: string[];
  };
  verdict: 'GO' | 'NO-GO';
  primaryReason: string;
  auditorId: string;
  auditedAt: string;
  evidenceChecksum: string;
}

export interface FableDoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
}

export interface FableDoctorReport {
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'NEEDS_CONFIGURATION';
  version: string;
  pythonAvailable: boolean;
  pythonVersion?: string;
  testDiscovery: {
    command: string;
    source: '.fable-test' | 'package.json' | 'none';
    isExecutable: boolean;
  };
  hooksStatus: {
    testAfterEditActive: boolean;
    groundingVerifierReady: boolean;
    sessionDisciplineActive: boolean;
  };
  checks: FableDoctorCheck[];
  recommendations: string[];
  timestamp: string;
}

export interface TestAfterEditResult {
  command: string;
  exitCode: number;
  passed: boolean;
  durationMs: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  executedAt: string;
  debounced: boolean;
}
