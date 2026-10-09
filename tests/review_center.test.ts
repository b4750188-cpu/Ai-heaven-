/**
 * AI HEAVEN - PHASE 1F.1: Review & Quality Assurance Center Verification Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpressApp } from '../src/api/app';
import http from 'http';

test('PHASE 1F.1: Review Center & Live Website Preview Verification', async (t) => {
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

  await t.test('1. Security Headers: Restores Google AI Studio website preview iframe embedding while maintaining clickjacking protection', async () => {
    // Check root / document path
    const docRes = await fetch(`${baseUrl}/`, {
      headers: { 'Accept': 'text/html,application/xhtml+xml' }
    });
    const csp = docRes.headers.get('content-security-policy') || '';
    
    assert.ok(csp.includes('frame-ancestors'), 'CSP must include frame-ancestors');
    assert.ok(csp.includes('https://*.google.com'), 'CSP must allow Google parent frames');
    assert.ok(csp.includes('https://*.run.app'), 'CSP must allow Cloud Run parent frames');
    assert.ok(csp.includes('https://aistudio.google.com'), 'CSP must allow AI Studio parent frames');
    
    // Check API endpoint retains X-Frame-Options: SAMEORIGIN
    const apiRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(apiRes.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(apiRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(apiRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  await t.test('2. Review Overview: GET /api/review/latest returns complete QA metrics and findings', async () => {
    const res = await fetch(`${baseUrl}/api/review/latest`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.id, 'Report must contain an id');
    assert.ok(typeof data.overallScore === 'number', 'Report must have numeric overallScore');
    assert.ok(data.overallScore >= 0 && data.overallScore <= 100, 'Score must be between 0 and 100');
    assert.ok(data.metrics, 'Report must contain metrics');
    assert.ok(data.metrics.tests.total > 0, 'Test count must be greater than 0');
    assert.ok(data.metrics.performance.avgApiLatencyMs >= 0, 'Latency must be non-negative');
    assert.ok(data.metrics.security.blockedSensitivePaths > 0, 'Security must report blocked paths');
    assert.ok(data.metrics.ui.viewsAudited > 0, 'UI must report audited views');
    assert.ok(data.metrics.deployment.requiredEnvVars.length > 0, 'Deployment must report required env vars');
  });

  await t.test('3. Review Run: POST /api/review/run triggers fresh execution and returns new report', async () => {
    const res = await fetch(`${baseUrl}/api/review/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.id.startsWith('rev_'), 'Report ID must follow rev_ prefix format');
    assert.equal(data.status, 'healthy');
    assert.ok(Array.isArray(data.findings), 'Findings must be an array');
  });

  await t.test('4. Reports History: GET /api/review/reports returns timestamped review trail', async () => {
    const res = await fetch(`${baseUrl}/api/review/reports`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.reports), 'reports must be an array');
    assert.ok(data.reports.length > 0, 'History must contain at least 1 report');
    assert.ok(data.reports[0].timestamp, 'Report must have a valid timestamp');
  });

  await t.test('5. Available Fixes: GET /api/review/fixes returns registered safe remediation actions', async () => {
    const res = await fetch(`${baseUrl}/api/review/fixes`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.fixes), 'fixes must be an array');
    const fixIds = data.fixes.map((f: any) => f.fixId);
    assert.ok(fixIds.includes('fix_prune_expired_approvals'));
    assert.ok(fixIds.includes('fix_reconcile_workers'));
    assert.ok(fixIds.includes('fix_flush_runtime_cache'));
    assert.ok(fixIds.includes('fix_allow_ai_studio_preview'));
  });

  await t.test('6. Safe Fix Workflow: Rejects unconfirmed fix, applies confirmed fix safely', async () => {
    // 6a. Attempt to apply without operator confirmation
    const unconfirmedRes = await fetch(`${baseUrl}/api/review/fixes/fix_prune_expired_approvals/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: false })
    });
    assert.equal(unconfirmedRes.status, 400);

    // 6b. Apply with operator confirmation
    const confirmedRes = await fetch(`${baseUrl}/api/review/fixes/fix_prune_expired_approvals/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true })
    });
    assert.equal(confirmedRes.status, 200);
    const result = await confirmedRes.json();
    assert.equal(result.success, true);
    assert.equal(result.fix.applied, true);
  });

  await t.test('7. Automated Tests Trigger: POST /api/review/tests/run dispatches test metrics', async () => {
    const res = await fetch(`${baseUrl}/api/review/tests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.tests.passed >= 170, 'Tests passed count should be at least 170');
    assert.equal(data.tests.failed, 0, 'Tests failed should be 0');
  });

  await t.test('8. Route Parity: GET /review/latest works identically to /api/review/latest', async () => {
    const directRes = await fetch(`${baseUrl}/review/latest`);
    assert.equal(directRes.status, 200);
    const directData = await directRes.json();
    assert.ok(directData.overallScore > 0);
  });
});
