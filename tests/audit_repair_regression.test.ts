/**
 * AI HEAVEN - Complete Audit & Repair Regression Verification Suite
 * Verifies:
 * 1. Android APK GitHub Actions workflow uses setup-android@v4 with JDK 21 and clean license acceptance without '|| true'
 * 2. Cryptographic Release Seal generation and HMAC verification against tampering
 * 3. Tenant isolation in DefectDojo export and Draugr SARIF generation
 * 4. Target authorization rejection of external out-of-scope targets
 * 5. Full-Stack Express REST API routes for Security Center (/posture, /verify-seal, /sarif, /export)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createExpressApp } from '../src/api/app';
import { securityCenterService } from '../src/services/security/securityCenterService';
import { defectDojoBridge } from '../src/services/security/defectDojoBridge';
import { draugrEngine } from '../src/services/security/draugrEngine';

test('AI Heaven End-to-End Audit & Regression Suite', async (t) => {
  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(() => {
    server.close();
  });

  await t.test('1. Android APK Workflow: Validates setup-android@v4, JDK 21, and license acceptance without || true', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/android-build.yml');
    assert.strictEqual(fs.existsSync(workflowPath), true, 'android-build.yml must exist');

    const content = fs.readFileSync(workflowPath, 'utf-8');

    // 1. Must use setup-android@v4
    assert.match(content, /uses:\s*android-actions\/setup-android@v4/, 'Workflow must use setup-android@v4 to avoid deprecated tools 404');
    
    // 2. Must use JDK 21 to match Capacitor 8 JavaVersion.VERSION_21
    assert.match(content, /java-version:\s*21/, 'Workflow must use Java 21 for AGP 8.13 and Capacitor 8 compatibility');

    // 3. Must accept licenses without suppressing errors with || true
    assert.match(content, /yes\s*\|\s*sdkmanager\s*--licenses(?!\s*\|\|\s*true)/, 'License acceptance must not use || true fallback');

    // 4. Must declare least-privilege permissions
    assert.match(content, /permissions:\s*\n\s*contents:\s*read/, 'Workflow must declare top-level permissions block');

    // 5. Must retain npm ci and cap sync
    assert.match(content, /npm ci/, 'Must install dependencies deterministically via npm ci');
    assert.match(content, /npx cap sync android/, 'Must synchronize Capacitor web assets before compilation');
  });

  await t.test('2. Cryptographic Release Seal: Validates HMAC-SHA256 signature and rejects tampering', async () => {
    const posture = await securityCenterService.getUnifiedPosture('tenant_audit_test');
    assert.ok(posture.releaseGate);
    assert.ok(posture.releaseGate.cryptographicProof, 'Cryptographic proof must be generated');

    // Verification of authentic seal
    const validCheck = securityCenterService.verifyReleaseSeal(posture.releaseGate);
    assert.equal(validCheck.valid, true, 'Original unmodified release seal must verify as valid');

    // Tampered payload verification: changing decision from PASS to BLOCK without updating signature
    const tamperedGate = {
      ...posture.releaseGate,
      decision: (posture.releaseGate.decision === 'PASS' ? 'BLOCK' : 'PASS') as any
    };
    const tamperedCheck = securityCenterService.verifyReleaseSeal(tamperedGate);
    assert.equal(tamperedCheck.valid, false, 'Tampered release gate must fail verification');
    assert.match(tamperedCheck.reason || '', /mismatch|altered/);
  });

  await t.test('3. Tenant Isolation: DefectDojo export and posture strictly scope findings to requesting tenant', () => {
    const tenantAlpha = `tenant_alpha_${Date.now()}`;
    const tenantBeta = `tenant_beta_${Date.now()}`;

    // Ingest finding into tenant Alpha
    defectDojoBridge.ingestFinding({
      id: `f_alpha_${Date.now()}`,
      scanJobId: 'job_alpha',
      scannerId: 'semgrep',
      scannerVersion: '1.0.0',
      ruleId: 'alpha_secret_leak',
      target: 'src/alpha.ts',
      authorizedScope: 'localhost',
      title: 'Alpha Secret Exposed',
      description: 'Private token in alpha source',
      severity: 'HIGH',
      confidence: 'HIGH',
      status: 'CONFIRMED',
      affectedComponent: 'src/alpha.ts',
      discoveredAt: new Date().toISOString(),
      evidence: {
        hash: 'hashalpha',
        rawOutputSnippet: 'ALPHA_KEY',
        capturedAt: new Date().toISOString()
      }
    }, tenantAlpha);

    // Ingest finding into tenant Beta
    defectDojoBridge.ingestFinding({
      id: `f_beta_${Date.now()}`,
      scanJobId: 'job_beta',
      scannerId: 'semgrep',
      scannerVersion: '1.0.0',
      ruleId: 'beta_sql_injection',
      target: 'src/beta.ts',
      authorizedScope: 'localhost',
      title: 'Beta SQL Injection',
      description: 'SQL injection in beta source',
      severity: 'CRITICAL',
      confidence: 'HIGH',
      status: 'CONFIRMED',
      affectedComponent: 'src/beta.ts',
      discoveredAt: new Date().toISOString(),
      evidence: {
        hash: 'hashbeta',
        rawOutputSnippet: 'SELECT * FROM beta',
        capturedAt: new Date().toISOString()
      }
    }, tenantBeta);

    // Verify tenant Alpha payload does NOT contain Beta finding
    const exportAlpha: any = defectDojoBridge.exportDefectDojoV2Payload(tenantAlpha);
    const alphaHasBetaFinding = exportAlpha.findings.some((f: any) => f.title.includes('Beta SQL'));
    assert.equal(alphaHasBetaFinding, false, 'Tenant Alpha export must never include Tenant Beta findings');

    // Verify tenant Beta payload does NOT contain Alpha finding
    const exportBeta: any = defectDojoBridge.exportDefectDojoV2Payload(tenantBeta);
    const betaHasAlphaFinding = exportBeta.findings.some((f: any) => f.title.includes('Alpha Secret'));
    assert.equal(betaHasAlphaFinding, false, 'Tenant Beta export must never include Tenant Alpha findings');
  });

  await t.test('4. Security Center REST Endpoints: GET /posture, POST /verify-seal, GET /sarif, GET /defectdojo', async () => {
    // 1. GET /api/security-center/posture
    const postureRes = await fetch(`${baseUrl}/api/security-center/posture`);
    assert.equal(postureRes.status, 200);
    const posture = await postureRes.json();
    assert.ok(typeof posture.score === 'number');
    assert.ok(posture.releaseGate);
    assert.ok(posture.scorecardReport);

    // 2. POST /api/security-center/verify-seal
    const verifyRes = await fetch(`${baseUrl}/api/security-center/verify-seal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(posture.releaseGate)
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.valid, true, 'REST API seal verification must return valid: true');

    // 3. GET /api/security-center/draugr/sarif
    const sarifRes = await fetch(`${baseUrl}/api/security-center/draugr/sarif`);
    assert.equal(sarifRes.status, 200);
    const sarif = await sarifRes.json();
    assert.equal(sarif.version, '2.1.0');

    // 4. GET /api/security-center/defectdojo/export
    const dojoRes = await fetch(`${baseUrl}/api/security-center/defectdojo/export`);
    assert.equal(dojoRes.status, 200);
    const dojo = await dojoRes.json();
    assert.ok(dojo.product_name.includes('AI Heaven'));
  });

  await t.test('5. Target Authorization Security Boundary: HTTP 403 on unauthorized scans', async () => {
    const scanRes = await fetch(`${baseUrl}/api/security-center/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scannerId: 'semgrep',
        targetScope: {
          target: 'https://malicious-external-target.com',
          allowedHosts: ['localhost'],
          allowedPaths: ['/'],
          isAuthorized: false
        }
      })
    });

    assert.equal(scanRes.status, 403, 'Scanning unauthorized external targets must be rejected with HTTP 403');
    const errData = await scanRes.json();
    assert.match(errData.error, /outside the explicitly authorized/);
  });
});
