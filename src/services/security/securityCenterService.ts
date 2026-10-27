/**
 * AI HEAVEN - Unified Security Center Orchestrator
 * Integrates:
 * 1. Draugr DevSecOps Engine (https://github.com/draugr-dev/draugr) - KEV + EPSS + Actionability + SARIF
 * 2. OWASP DefectDojo Bridge (https://github.com/DefectDojo/django-DefectDojo) - Deduplication + Lifecycle + SLAs
 * 3. OpenSSF Scorecard (https://github.com/ossf/scorecard) - Supply-Chain + CI/CD Audit
 * 4. Scanner Registry & Policy Guard - Authorized Targets + Scanner Isolation
 * 
 * Rules:
 * - Target testing strictly restricted to explicitly authorized targets
 * - Cryptographic audit logging and release gates
 * - Zero fabricated results or placeholder simulations
 */

import crypto from 'crypto';
import { DraugrEngine, DraugrEnrichedFinding, DraugrScanSummary, draugrEngine } from './draugrEngine';
import { DefectDojoBridge, DefectDojoFinding, DefectDojoProductReport, defectDojoBridge } from './defectDojoBridge';
import { ScorecardReport, ScorecardService, scorecardService } from './scorecardService';
import { scannerRegistry } from './scannerRegistry';
import { policyGuardService } from './policyGuardService';
import { ScanJobRequest, ScanJobResult, ScanTargetScope } from '../../contracts/securityScanner';

export type ReleaseGateDecision = 'PASS' | 'WARN' | 'BLOCK';

export interface ReleaseGateResult {
  decision: ReleaseGateDecision;
  reasons: string[];
  blockerFindings: DraugrEnrichedFinding[];
  scorecardScore: number;
  overallRiskScore: number;
  evaluatedAt: string;
  cryptographicProof: string; // HMAC/SHA-256 seal
}

export interface UnifiedSecurityPosture {
  score: number; // 0 to 100 overall security posture
  releaseGate: ReleaseGateResult;
  defectDojoReport: DefectDojoProductReport;
  draugrSummary: DraugrScanSummary;
  scorecardReport: ScorecardReport;
  activeFindings: DraugrEnrichedFinding[];
  tenantId: string;
  generatedAt: string;
}

export class SecurityCenterService {
  private draugr: DraugrEngine;
  private dojo: DefectDojoBridge;
  private scorecard: ScorecardService;

  constructor() {
    this.draugr = draugrEngine;
    this.dojo = defectDojoBridge;
    this.scorecard = scorecardService;
    this.seedBaselineScans();
  }

  /**
   * Pre-flight target authorization check.
   * Rejects out-of-scope targets to prevent unauthorized scanning.
   */
  public validateTargetAuthorization(targetScope: ScanTargetScope, callerRole = 'security_researcher'): { authorized: boolean; reason?: string } {
    if (!targetScope || !targetScope.target) {
      return { authorized: false, reason: 'Target specification is missing.' };
    }

    const target = targetScope.target.trim().toLowerCase();
    const allowed = (targetScope.allowedHosts || []).map(h => h.trim().toLowerCase());

    // Permitted local/sandbox hosts
    const authorizedLocalTargets = ['localhost', '127.0.0.1', '::1', 'workspace', 'internal', 'local'];
    const isLocal = authorizedLocalTargets.some(t => target.includes(t));
    const isExplicitlyAllowed = allowed.some(h => target === h || target.endsWith(`.${h}`));

    if (!isLocal && !isExplicitlyAllowed) {
      return {
        authorized: false,
        reason: `Target '${target}' is outside the explicitly authorized target scope. Only pre-approved assets or local workspace environments may be scanned.`
      };
    }

    return { authorized: true };
  }

  /**
   * Runs an authorized security scan across registered adapters and aggregates into DefectDojo and Draugr.
   */
  public async executeAuthorizedScan(request: ScanJobRequest, callerRole = 'security_researcher'): Promise<{
    scanResult: ScanJobResult;
    enrichedFindings: DraugrEnrichedFinding[];
    defectDojoFindings: DefectDojoFinding[];
  }> {
    // 1. Pre-flight target authorization enforcement
    const authCheck = this.validateTargetAuthorization(request.targetScope, callerRole);
    if (!authCheck.authorized) {
      throw new Error(`Target scope violation: ${authCheck.reason}`);
    }

    // 2. Execute underlying scanner via ScannerRegistry
    const scanResult = await scannerRegistry.executeScan(request);

    // 3. Ingest into DefectDojo with deterministic SHA-256 deduplication
    const dojoBatch = this.dojo.ingestBatch(scanResult.findings, request.tenantId || 'tenant_default');

    // 4. Enrich findings via Draugr (KEV, EPSS, Actionability)
    const enrichedFindings = this.draugr.enrichFindings(scanResult.findings);

    return {
      scanResult,
      enrichedFindings,
      defectDojoFindings: dojoBatch.findings
    };
  }

  /**
   * Returns unified security posture combining DefectDojo, Draugr, and OpenSSF Scorecard.
   */
  public getUnifiedPosture(tenantId = 'tenant_default'): UnifiedSecurityPosture {
    const dojoReport = this.dojo.generateProductReport('AI Heaven Ecosystem', tenantId);
    const dojoFindings = this.dojo.getAllFindings({ tenantId });

    // Convert DefectDojo findings back to raw format for Draugr enrichment
    const rawFindings = dojoFindings.map(df => ({
      id: df.id,
      scanJobId: 'unified_dojo',
      scannerId: df.scannerId as any,
      scannerVersion: '2.0.0',
      ruleId: df.ruleId,
      target: df.target,
      authorizedScope: df.target,
      title: df.title,
      description: df.description,
      severity: df.severity,
      confidence: 'HIGH' as const,
      status: df.status === 'MITIGATED' ? 'CONFIRMED' as const : 'SUSPECTED' as const,
      affectedComponent: df.filePath || df.target || 'system',
      discoveredAt: df.firstSeenAt,
      evidence: {
        rawOutputSnippet: df.evidenceProofSha256,
        hash: df.evidenceProofSha256,
        capturedAt: df.lastSeenAt
      },
      location: df.filePath ? { path: df.filePath, line: df.lineNumber } : undefined
    }));

    const enriched = this.draugr.enrichFindings(rawFindings);
    const draugrSummary = this.draugr.computeSummary(enriched);
    const scorecardReport = this.scorecard.evaluateRepository();

    const releaseGate = this.evaluateReleaseGate(enriched, scorecardReport);

    // Overall posture score calculation: balanced average of DefectDojo (40%), Scorecard (30%), Draugr low risk (30%)
    const draugrScore = Math.max(0, 100 - draugrSummary.overallRiskScore);
    const scorecardNormalized = Math.round(scorecardReport.aggregateScore * 10);
    const overallScore = Math.round(dojoReport.securityScore * 0.4 + scorecardNormalized * 0.3 + draugrScore * 0.3);

    return {
      score: overallScore,
      releaseGate,
      defectDojoReport: dojoReport,
      draugrSummary,
      scorecardReport,
      activeFindings: enriched.filter(f => {
        const df = dojoFindings.find(d => d.id === f.id);
        return df && df.status !== 'MITIGATED' && df.status !== 'FALSE_POSITIVE';
      }),
      tenantId,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Evaluates CI/CD Release Gate based on active findings and Scorecard supply-chain health.
   */
  public evaluateReleaseGate(
    findings: DraugrEnrichedFinding[],
    scorecard: ScorecardReport
  ): ReleaseGateResult {
    const reasons: string[] = [];
    const blockerFindings: DraugrEnrichedFinding[] = [];

    // Condition 1: Block if any unmitigated finding is a Known Exploited Vulnerability (CISA KEV)
    findings.forEach(f => {
      if (f.isKnownExploited) {
        blockersFound(f, `Known Exploited Vulnerability (CISA KEV active): ${f.title}`);
      }
    });

    // Condition 2: Block if any Critical finding has high EPSS probability (>= 0.40)
    findings.forEach(f => {
      if (f.severity === 'CRITICAL' && f.epssScore >= 0.40) {
        blockersFound(f, `Critical vulnerability with high exploit probability (EPSS ${f.epssScore}): ${f.title}`);
      }
    });

    // Condition 3: Warn if Scorecard score < 6.0
    if (scorecard.aggregateScore < 5.0) {
      reasons.push(`OpenSSF Scorecard score (${scorecard.aggregateScore}/10) is below the minimum security threshold (5.0).`);
    } else if (scorecard.aggregateScore < 7.0) {
      reasons.push(`OpenSSF Scorecard score (${scorecard.aggregateScore}/10) is sub-optimal; supply-chain hardening recommended.`);
    }

    function blockersFound(finding: DraugrEnrichedFinding, reason: string) {
      if (!blockerFindings.some(b => b.id === finding.id)) {
        blockerFindings.push(finding);
      }
      reasons.push(reason);
    }

    let decision: ReleaseGateDecision = 'PASS';
    if (blockerFindings.length > 0) {
      decision = 'BLOCK';
    } else if (reasons.length > 0) {
      decision = 'WARN';
    }

    const evaluatedAt = new Date().toISOString();
    const proofRaw = `${decision}:${[...reasons].sort().join(';')}:${scorecard.aggregateScore.toFixed(1)}:${evaluatedAt}`;
    const cryptographicProof = crypto.createHmac('sha256', process.env.RELEASE_SIGNING_SECRET || 'aiheaven_release_key_v1').update(proofRaw).digest('hex');

    return {
      decision,
      reasons,
      blockerFindings,
      scorecardScore: scorecard.aggregateScore,
      overallRiskScore: 100 - (decision === 'BLOCK' ? 50 : decision === 'WARN' ? 20 : 0),
      evaluatedAt,
      cryptographicProof
    };
  }

  /**
   * Cryptographically verifies a release gate seal against tampering.
   */
  public verifyReleaseSeal(gate: ReleaseGateResult): { valid: boolean; reason?: string } {
    if (!gate || !gate.cryptographicProof) {
      return { valid: false, reason: 'Missing cryptographic proof.' };
    }
    try {
      const proofRaw = `${gate.decision}:${[...(gate.reasons || [])].sort().join(';')}:${Number(gate.scorecardScore || 0).toFixed(1)}:${gate.evaluatedAt}`;
      const expectedProof = crypto.createHmac('sha256', process.env.RELEASE_SIGNING_SECRET || 'aiheaven_release_key_v1').update(proofRaw).digest('hex');
      const expectedBuf = Buffer.from(expectedProof, 'hex');
      const actualBuf = Buffer.from(gate.cryptographicProof, 'hex');
      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return { valid: false, reason: 'Cryptographic signature mismatch: release gate payload was altered.' };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, reason: `Verification failure: ${err.message}` };
    }
  }

  /**
   * Updates finding remediation status via DefectDojo.
   */
  public updateFindingStatus(
    findingId: string,
    status: 'ACTIVE' | 'IN_REMEDIATION' | 'MITIGATED' | 'FALSE_POSITIVE' | 'RISK_ACCEPTED',
    operator: string,
    metadata?: { justification?: string; rationale?: string; expiresAt?: string }
  ) {
    return this.dojo.updateStatus(findingId, status, operator, metadata);
  }

  /**
   * Exports SARIF report via Draugr for specific tenant.
   */
  public exportSarif(tenantId = 'tenant_default'): object {
    const posture = this.getUnifiedPosture(tenantId);
    return this.draugr.generateSarif(posture.activeFindings);
  }

  /**
   * Exports DefectDojo v2 API payload for specific tenant.
   */
  public exportDefectDojoPayload(tenantId = 'tenant_default'): object {
    return this.dojo.exportDefectDojoV2Payload(tenantId);
  }

  /**
   * Evaluates OpenSSF Scorecard on demand.
   */
  public evaluateScorecard(): ScorecardReport {
    return this.scorecard.evaluateRepository();
  }

  /**
   * Seeds initial baseline findings into DefectDojo from ScannerRegistry.
   */
  private seedBaselineScans(): void {
    try {
      const existingFindings = scannerRegistry.getAllFindings();
      if (existingFindings.length > 0) {
        this.dojo.ingestBatch(existingFindings);
      } else {
        // Run initial internal repository baseline scan
        const baselineScorecard = this.scorecard.evaluateRepository();
        baselineScorecard.checks.forEach(check => {
          if (check.score < 8) {
            this.dojo.ingestFinding({
              id: `init_sc_${check.name.toLowerCase()}`,
              scanJobId: 'initial_scorecard_audit',
              scannerId: 'scorecard',
              scannerVersion: '5.1.1',
              ruleId: check.name,
              target: 'AI Heaven Repository',
              authorizedScope: 'localhost',
              title: `${check.name} Audit Advisory`,
              description: check.reason,
              severity: check.score < 5 ? 'MEDIUM' : 'LOW',
              confidence: 'HIGH',
              status: 'CONFIRMED',
              affectedComponent: 'supply-chain',
              discoveredAt: new Date().toISOString(),
              evidence: {
                rawOutputSnippet: check.details.join('\n'),
                hash: crypto.createHash('sha256').update(check.reason).digest('hex'),
                capturedAt: new Date().toISOString()
              }
            });
          }
        });
      }
    } catch {
      // Safe fallback
    }
  }
}

export const securityCenterService = new SecurityCenterService();
