/**
 * AI HEAVEN — BUG HUNT ENGINE: COMPLETE INTELLIGENCE UPGRADE TEST SUITE
 * 
 * Verifies:
 * 1. Six-droid collaborative research system (Argus-01, Aegis-03, Vulcan-04, Cerberus-06, Hydra-02, The Scribe-08)
 * 2. 8-phase autonomous investigation loop (PLAN -> DISCOVER -> ANALYZE -> TEST -> VERIFY -> CORRELATE -> REPORT -> LEARN)
 * 3. 8-step verification and false-positive elimination
 * 4. Deep vulnerability discovery across OWASP Top 10 (SQLi, XSS, SSRF, RCE, IDOR, Secrets, Crypto, CORS)
 * 5. Security tool integrations: Semgrep, CodeQL, OWASP ZAP, Nmap, Trivy, Gitleaks, HackerOne VRT v1.12
 * 6. Repeatable benchmark suite execution, recall/precision metrics, and SHA-256 proof seals
 * 7. SOURCE continuous learning deposit, retrieval, and deduplication
 * 8. Strict tenant isolation and cryptographic evidence integrity
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { securityToolIntegrations } from '../src/services/bughunt/toolIntegrations.js';
import { vulnerabilityBenchmarkSuite } from '../src/services/bughunt/vulnerabilityBenchmarkSuite.js';
import { bugHuntService } from '../src/services/bughunt/bugHuntService.js';
import { sourceKnowledgeService } from '../src/services/source/sourceKnowledgeService.js';

describe('Bug Hunt Engine: Security Tool Integrations', () => {
  it('Semgrep SAST Engine detects SQL injection and command injection AST patterns', async () => {
    const vulnerableSql = 'const query = "SELECT * FROM users WHERE id = " + req.params.id; db.query(query);';
    const semgrepSqlResult = securityToolIntegrations.runSemgrepAnalysis(vulnerableSql, 'controller.ts');
    assert.strictEqual(semgrepSqlResult.findingsCount > 0, true);
    assert.strictEqual(semgrepSqlResult.rawFindings[0].cweId, 'CWE-89');

    const vulnerableRce = 'const { exec } = require("child_process"); exec("ping " + req.query.host);';
    const semgrepRceResult = securityToolIntegrations.runSemgrepAnalysis(vulnerableRce, 'ping.ts');
    assert.strictEqual(semgrepRceResult.findingsCount > 0, true);
    assert.strictEqual(semgrepRceResult.rawFindings[0].cweId, 'CWE-78');
  });

  it('CodeQL Taint-Analysis Engine traces untrusted source-to-sink data flows', async () => {
    const taintedCode = `
      app.get('/fetch', async (req, res) => {
        const target = req.query.url;
        const resp = await fetch(target);
        res.send(await resp.text());
      });
    `;
    const codeqlResult = securityToolIntegrations.runCodeQLTaintAnalysis(taintedCode);
    assert.strictEqual(codeqlResult.findingsCount > 0, true);
    assert.strictEqual(codeqlResult.rawFindings[0].cweId, 'CWE-918');

    // Safe sanitized code without HTTP sinks should not trigger an unsanitized flow
    const safeCode = `
      const allowed = ['item1', 'item2'];
      const filtered = allowed.filter(x => x.length > 2);
    `;
    const safeResult = securityToolIntegrations.runCodeQLTaintAnalysis(safeCode);
    assert.strictEqual(safeResult.findingsCount, 0);
  });

  it('OWASP ZAP Baseline Scanner detects missing security headers and cookie flags', async () => {
    const weakHeaders = {
      'content-type': 'text/html'
    };
    const zapResult = securityToolIntegrations.runZapSecurityAnalysis(weakHeaders, ['session=abc123']);
    assert.strictEqual(zapResult.findingsCount >= 3, true);
    const checks = zapResult.rawFindings.map(f => f.checkId);
    assert.ok(checks.includes('zap-missing-hsts'));
    assert.ok(checks.includes('zap-missing-csp'));
    assert.ok(checks.includes('zap-cookie-missing-httponly'));
  });

  it('Gitleaks Secret Scanner identifies high-entropy tokens and ignores clean code', async () => {
    const codeWithSecret = 'const token = "AIzaSyD-FakeTestKeyForSecurityAudit98765";';
    const secretResult = securityToolIntegrations.runGitleaksScan(codeWithSecret, 'config.ts');
    assert.strictEqual(secretResult.findingsCount > 0, true);
    assert.strictEqual(secretResult.rawFindings[0].secretType, 'Google API Key');

    const cleanCode = 'const appName = "AI Heaven Bounty Hunter"; const version = "2.4.0";';
    const cleanResult = securityToolIntegrations.runGitleaksScan(cleanCode, 'constants.ts');
    assert.strictEqual(cleanResult.findingsCount, 0);
  });

  it('HackerOne VRT v1.12 Taxonomy correctly maps vulnerabilities with severity thresholds', () => {
    const sqliVrt = securityToolIntegrations.mapToHackerOneVRT('CWE-89', 'Injection');
    assert.strictEqual(sqliVrt.vrtCategory, 'Server-Side Injection > SQL Injection');
    assert.strictEqual(sqliVrt.vrtId, 'vrt_server_side_injection_sql');
    assert.strictEqual(sqliVrt.priority, 'HIGH');

    const rceVrt = securityToolIntegrations.mapToHackerOneVRT('CWE-78', 'Injection');
    assert.strictEqual(rceVrt.vrtCategory, 'Server-Side Injection > Remote Code Execution (RCE)');
    assert.strictEqual(rceVrt.vrtId, 'vrt_server_side_injection_rce');
    assert.strictEqual(rceVrt.priority, 'CRITICAL');

    const ssrfVrt = securityToolIntegrations.mapToHackerOneVRT('CWE-918', 'SSRF');
    assert.strictEqual(ssrfVrt.vrtCategory, 'Server-Side Request Forgery (SSRF) > Internal Network Pivot');
    assert.strictEqual(ssrfVrt.vrtId, 'vrt_ssrf_internal');
  });
});

describe('Bug Hunt Engine: Repeatable Vulnerability Benchmark Suite', () => {
  it('returns complete benchmark test corpus with 12 cases including clean negative controls', () => {
    const cases = vulnerabilityBenchmarkSuite.getTestCases();
    assert.strictEqual(cases.length, 12);
    const vulnerable = cases.filter(c => c.expectedVulnerability);
    const controls = cases.filter(c => !c.expectedVulnerability);
    assert.strictEqual(vulnerable.length, 8);
    assert.strictEqual(controls.length, 4);
  });

  it('executes full benchmark suite and verifies 100% recall, 100% precision, 0% FPR, and valid SHA-256 seal', () => {
    const result = vulnerabilityBenchmarkSuite.runBenchmark();

    assert.ok(result.id.startsWith('bench_run_'));
    assert.strictEqual(result.vulnerabilityDetectionRate, 1.0); // 8 / 8 found
    assert.strictEqual(result.precision, 1.0);                  // 8 TP / (8 TP + 0 FP)
    assert.strictEqual(result.falsePositiveRate, 0.0);           // 0 / 4 clean flagged
    assert.strictEqual(result.falseNegativeRate, 0.0);           // 0 missed
    assert.strictEqual(result.verificationSuccessRate, 1.0);     // 100% verified with SHA-256 seal

    // Verify 64-char hexadecimal SHA-256 proof seal
    assert.strictEqual(result.sha256ProofSeal.length, 64);
    assert.match(result.sha256ProofSeal, /^[a-f0-9]{64}$/);

    // Verify categories are tracked
    assert.ok(result.coverageByCategory['Injection']);
    assert.ok(result.coverageByCategory['Authentication']);
    assert.ok(result.coverageByCategory['Secret Leaks']);
    assert.ok(result.coverageByCategory['Cryptography']);
    assert.ok(result.coverageByCategory['File System']);
    assert.ok(result.coverageByCategory['SSRF']);
  });
});

describe('Bug Hunt Engine: 6-Droid Collaborative Research System & 8-Phase Loop', () => {
  const testTenantId = 'tenant_intel_upgrade_test';

  it('executes the full 8-phase investigation loop and produces verified findings with separate confidence & severity', async () => {
    const config = {
      scope: {
        targetType: 'domain' as const,
        targetValue: 'test-target.sandbox.local',
        allowedHosts: ['test-target.sandbox.local', '*.sandbox.local'],
        disallowedPaths: ['/logout', '/delete', '/admin/reset']
      },
      selectedDroids: [
        'discovery_droid' as const,
        'research_droid' as const,
        'security_droid' as const,
        'verifier_droid' as const,
        'intelligence_droid' as const,
        'reporting_droid' as const
      ],
      permittedTechniques: ['sast_code_audit' as const, 'safe_injection_testing' as const, 'secret_leak_scanning' as const],
      verificationDepth: 'dual_droid_consensus' as const,
      reportingStyle: 'hackerone' as const
    };

    const job = await bugHuntService.startCustomBugHunt(
      'user_test_01',
      testTenantId,
      'Autonomous Deep Vulnerability Research',
      config
    );

    assert.strictEqual(job.status, 'completed');
    assert.strictEqual(job.target, 'test-target.sandbox.local');
    assert.ok(job.findings.length > 0);

    // Verify 8-Phase Investigation Plan
    assert.ok(job.investigationPlan);
    assert.strictEqual(job.investigationPlan.currentPhase, 'COMPLETED');
    assert.strictEqual(job.investigationPlan.phases.length, 8);

    const phases = job.investigationPlan.phases.map(p => p.phase);
    assert.deepStrictEqual(phases, [
      'PLAN',
      'DISCOVER',
      'ANALYZE',
      'TEST',
      'VERIFY',
      'CORRELATE',
      'REPORT',
      'LEARN'
    ]);

    for (const ph of job.investigationPlan.phases) {
      assert.strictEqual(ph.status, 'completed');
      assert.ok(ph.durationMs !== undefined && ph.durationMs >= 0);
      assert.ok(ph.assignedDroid.length > 0);
    }

    // Verify 8-step verification on findings
    for (const finding of job.findings) {
      // Step 1 & 2: Identified & technical reason
      assert.ok(finding.title.length > 0);
      assert.ok(finding.description.length > 0);
      assert.ok(finding.cweId.startsWith('CWE-'));

      // Step 3: Safe reproduction procedure
      assert.ok(finding.curlCommand.startsWith('curl'));

      // Step 4: Scope authorization
      assert.ok(finding.targetUrl.includes('test-target.sandbox.local'));

      // Step 5: Complete 64-char SHA-256 evidence seal
      assert.strictEqual(finding.evidenceHash.length, 64);
      assert.match(finding.evidenceHash, /^[a-f0-9]{64}$/);

      // Step 6: False positive review
      assert.ok(finding.falsePositiveReviewNotes);
      assert.ok(finding.verificationStatus === 'VERIFIED' || finding.verificationStatus === 'CONFIRMED');

      // Step 7: Separate severity and confidence ratings
      assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(finding.severity));
      assert.ok(['HIGH', 'MEDIUM', 'LOW', 'PROVISIONAL'].includes(finding.confidence || 'HIGH'));
      assert.strictEqual(finding.confidence, 'HIGH'); // verified findings have HIGH confidence

      // Step 8: VRT category and impact
      assert.ok(finding.vrtCategory);
      assert.ok(finding.vrtId);
      assert.ok(finding.impact);
      assert.ok(finding.detectionTools && finding.detectionTools.length > 0);
      assert.ok(finding.participatingDroids && finding.participatingDroids.length >= 2);
    }

    // Verify SOURCE continuous learning integration:
    // Confirmed findings should have been deposited into SOURCE pool
    for (const finding of job.findings) {
      assert.ok(finding.sourceKnowledgeId, 'Finding should have a SOURCE knowledge ID');
      const entry = sourceKnowledgeService.getEntry('fam_user_test_01', finding.sourceKnowledgeId);
      assert.ok(entry, 'Deposited finding should exist in SOURCE knowledge pool');
      assert.strictEqual(entry.tenantId, testTenantId);
      assert.ok(entry.tags.includes('vulnerability'));
      assert.strictEqual(entry.verificationStatus, 'VERIFIED');
    }
  });

  it('enforces strict tenant isolation across Bug Hunt workspaces', async () => {
    const tenantA = 'tenant_security_alpha';
    const tenantB = 'tenant_security_beta';
    const userA = 'user_alpha_01';
    const userB = 'user_beta_01';

    const jobA = await bugHuntService.startAutonomousBugHunt(
      userA,
      tenantA,
      'prog_aiheaven_internal'
    );

    const workspaceA = bugHuntService.getWorkspace(userA, tenantA);
    const workspaceB = bugHuntService.getWorkspace(userB, tenantB);

    // Tenant B should not see Tenant A's hunt
    const huntInB = workspaceB.recentHunts.find(h => h.id === jobA.id);
    assert.strictEqual(huntInB, undefined);

    const huntInA = workspaceA.recentHunts.find(h => h.id === jobA.id);
    assert.ok(huntInA);
    assert.strictEqual(huntInA.tenantId, tenantA);
  });
});
