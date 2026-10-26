import test from 'node:test';
import assert from 'node:assert/strict';
import { DraugrEngine } from '../src/services/security/draugrEngine';
import { DefectDojoBridge } from '../src/services/security/defectDojoBridge';
import { ScorecardService } from '../src/services/security/scorecardService';
import { SecurityCenterService } from '../src/services/security/securityCenterService';
import { SecurityFinding, ScanTargetScope } from '../src/contracts/securityScanner';

test('AI Heaven Unified Security Center Suite', async (t) => {
  const draugr = new DraugrEngine();
  const dojo = new DefectDojoBridge();
  const scorecard = new ScorecardService();
  const securityCenter = new SecurityCenterService();

  await t.test('1. Draugr Security Intelligence Engine: Enriches findings with KEV, EPSS, and Actionability', () => {
    const rawFindings: SecurityFinding[] = [
      {
        id: 'f_log4j_test',
        scanJobId: 'job_test_1',
        scannerId: 'trivy',
        scannerVersion: '0.50.0',
        ruleId: 'CVE-2021-44228',
        target: 'pom.xml',
        authorizedScope: 'localhost',
        title: 'CVE-2021-44228 Log4j Remote Code Execution',
        description: 'Apache Log4j2 JNDI features allow RCE',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        status: 'CONFIRMED',
        affectedComponent: 'org.apache.logging.log4j:log4j-core',
        discoveredAt: new Date().toISOString(),
        evidence: {
          hash: 'abc123hash',
          rawOutputSnippet: 'log4j-core-2.14.1.jar',
          capturedAt: new Date().toISOString()
        }
      },
      {
        id: 'f_workflow_test',
        scanJobId: 'job_test_2',
        scannerId: 'scorecard',
        scannerVersion: '5.1.1',
        ruleId: 'Token-Permissions',
        target: '.github/workflows/android-build.yml',
        authorizedScope: 'localhost',
        title: 'Token-Permissions Missing explicit block',
        description: 'GitHub Actions workflow missing permissions block',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        status: 'CONFIRMED',
        affectedComponent: '.github/workflows/android-build.yml',
        discoveredAt: new Date().toISOString(),
        evidence: {
          hash: 'def456hash',
          rawOutputSnippet: 'No top-level permissions block',
          capturedAt: new Date().toISOString()
        }
      }
    ];

    const enriched = draugr.enrichFindings(rawFindings);
    assert.equal(enriched.length, 2);

    // Finding 1: Log4j should have CISA KEV detected and high EPSS
    const log4j = enriched.find(f => f.ruleId === 'CVE-2021-44228');
    assert.ok(log4j, 'Log4j finding must exist');
    assert.equal(log4j.isKnownExploited, true, 'Log4j must be flagged in CISA KEV catalog');
    assert.ok(log4j.epssScore >= 0.9, 'Log4j must have high EPSS probability');
    assert.ok(log4j.contextualRiskScore > 50, 'Log4j contextual risk must be elevated');
    assert.equal(log4j.actionability, 'remediable_dependency');

    // Finding 2: Token-Permissions should be config_hardening
    const tokenPerm = enriched.find(f => f.ruleId === 'Token-Permissions');
    assert.ok(tokenPerm, 'Token-Permissions finding must exist');
    assert.equal(tokenPerm.actionability, 'config_hardening');

    // Draugr Summary computation
    const summary = draugr.computeSummary(enriched);
    assert.equal(summary.totalFindings, 2);
    assert.equal(summary.criticalCount, 1);
    assert.equal(summary.mediumCount, 1);
    assert.equal(summary.knownExploitedCount, 1);
    assert.ok(summary.highEpssCount >= 1);
    assert.ok(summary.overallRiskScore > 0);

    // OASIS SARIF v2.1.0 Export
    const sarif: any = draugr.generateSarif(enriched);
    assert.equal(sarif.version, '2.1.0');
    assert.ok(sarif.runs && sarif.runs.length > 0);
    assert.equal(sarif.runs[0].results.length, 2);
  });

  await t.test('2. OWASP DefectDojo Bridge: Deterministic SHA-256 deduplication and lifecycle management', () => {
    // Deduplication hash test
    const hash1 = dojo.computeDeduplicationHash('src/App.tsx', 'semgrep', 'rule_sql_injection', 'src/App.tsx', 42);
    const hash2 = dojo.computeDeduplicationHash('src/App.tsx', 'semgrep', 'rule_sql_injection', 'src/App.tsx', 42);
    const hashDifferent = dojo.computeDeduplicationHash('src/App.tsx', 'semgrep', 'rule_xss', 'src/App.tsx', 42);

    assert.equal(hash1, hash2, 'Identical findings must produce identical hash');
    assert.notEqual(hash1, hashDifferent, 'Different rules must produce different hash');
    assert.match(hash1, /^[a-f0-9]{64}$/, 'Hash must be 64-char lowercase hex');

    // Ingest finding with unique identifier per test run
    const testId = Date.now();
    const sampleFinding: SecurityFinding = {
      id: `f_dojo_test_${testId}`,
      scanJobId: `job_dojo_${testId}`,
      scannerId: 'semgrep',
      scannerVersion: '1.70.0',
      ruleId: `rule_secret_test_${testId}`,
      target: `src/config_${testId}.ts`,
      authorizedScope: 'localhost',
      title: 'Hardcoded Secret',
      description: 'API key hardcoded in config file',
      severity: 'HIGH',
      confidence: 'HIGH',
      status: 'CONFIRMED',
      affectedComponent: `src/config_${testId}.ts`,
      discoveredAt: new Date().toISOString(),
      location: { path: `src/config_${testId}.ts`, line: 15 },
      evidence: {
        hash: 'secrethash',
        rawOutputSnippet: 'KEY = "12345"',
        capturedAt: new Date().toISOString()
      }
    };

    const ingested1 = dojo.ingestFinding(sampleFinding);
    assert.equal(ingested1.status, 'ACTIVE');
    assert.equal(ingested1.duplicateCount, 1);

    // Duplicate ingestion should increment duplicate count
    const ingested2 = dojo.ingestFinding(sampleFinding);
    assert.equal(ingested2.id, ingested1.id, 'Duplicate finding must reuse same DefectDojo ID');
    assert.equal(ingested2.duplicateCount, 2, 'Duplicate count must increment');

    // Lifecycle transitions
    const inRemediation = dojo.updateStatus(ingested1.id, 'IN_REMEDIATION', 'dev_agent', {
      justification: 'Fix PR created'
    });
    assert.equal(inRemediation.status, 'IN_REMEDIATION');

    const mitigated = dojo.updateStatus(ingested1.id, 'MITIGATED', 'dev_agent', {
      justification: 'Secret rotated and removed'
    });
    assert.equal(mitigated.status, 'MITIGATED');
    assert.ok(mitigated.mitigatedAt);

    // Export DefectDojo v2 Payload
    const exportPayload: any = dojo.exportDefectDojoV2Payload();
    assert.ok(exportPayload.product_name.includes('AI Heaven'));
    assert.equal(exportPayload.scan_type, 'AI Heaven Unified Security Center');
    assert.ok(exportPayload.findings.length > 0);
  });

  await t.test('3. OpenSSF Scorecard Supply Chain Auditor: Audits repository files and generates 0-10 scores', () => {
    const report = scorecard.evaluateRepository(process.cwd());
    assert.ok(report.repo.includes('AI Heaven'));
    assert.equal(report.upstreamLicense, 'Apache-2.0');
    assert.ok(report.aggregateScore >= 0 && report.aggregateScore <= 10);
    assert.ok(report.checks.length >= 8);

    // Security-Policy must score 10 because SECURITY.md is present
    const secPolicyCheck = report.checks.find(c => c.name === 'Security-Policy');
    assert.ok(secPolicyCheck, 'Security-Policy check must be present');
    assert.equal(secPolicyCheck.score, 10, 'SECURITY.md presence must give score 10');

    // License check must pass
    const licenseCheck = report.checks.find(c => c.name === 'License');
    assert.ok(licenseCheck, 'License check must be present');
    assert.ok(licenseCheck.score >= 5);
  });

  await t.test('4. Security Center: Target Authorization Boundary protects against out-of-scope targets', () => {
    // Authorized local target
    const localScope: ScanTargetScope = {
      target: 'http://localhost:3000',
      allowedHosts: ['localhost'],
      allowedPaths: ['/api'],
      isAuthorized: true
    };
    const localCheck = securityCenter.validateTargetAuthorization(localScope);
    assert.equal(localCheck.authorized, true);

    // Authorized internal IP
    const ipScope: ScanTargetScope = {
      target: '127.0.0.1:3000',
      allowedHosts: ['127.0.0.1'],
      allowedPaths: ['/'],
      isAuthorized: true
    };
    const ipCheck = securityCenter.validateTargetAuthorization(ipScope);
    assert.equal(ipCheck.authorized, true);

    // Unauthorized external target
    const unauthorizedScope: ScanTargetScope = {
      target: 'https://evil-unauthorized-target.example.com',
      allowedHosts: ['localhost'],
      allowedPaths: ['/'],
      isAuthorized: false
    };
    const unauthorizedCheck = securityCenter.validateTargetAuthorization(unauthorizedScope);
    assert.equal(unauthorizedCheck.authorized, false);
    assert.match(unauthorizedCheck.reason || '', /outside the explicitly authorized/);
  });

  await t.test('5. Security Center: Unified Posture & CI/CD Release Gate Evaluation', async () => {
    const posture = await securityCenter.getUnifiedPosture();
    assert.ok(typeof posture.score === 'number');
    assert.ok(posture.score >= 0 && posture.score <= 100);
    assert.ok(posture.releaseGate);
    assert.ok(['PASS', 'WARN', 'BLOCK'].includes(posture.releaseGate.decision));
    assert.match(posture.releaseGate.cryptographicProof, /^[a-f0-9]{64}$/);
    assert.ok(posture.scorecardReport);
    assert.ok(posture.defectDojoReport);
    assert.ok(posture.draugrSummary);
  });
});
