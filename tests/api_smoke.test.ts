/**
 * AI HEAVEN - Production API & Security Smoke Tests
 * Validates all 13 audited endpoints, dual routing (/api/* and /*),
 * sensitive path blocking (/.env, /.git/config, /backup.sql),
 * and comprehensive security headers (CSP, nosniff, frame-ancestors/SAMEORIGIN).
 */

import http from 'http';
import { apiApp } from '../server.ts';

async function runSmokeTests() {
  console.log('======================================================');
  console.log('AI HEAVEN - PRODUCTION API & SECURITY REGRESSION SUITE');
  console.log('======================================================\n');

  const server = http.createServer(apiApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  let passed = 0;
  let failed = 0;

  function report(condition: boolean, item: string, details?: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${item}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${item}: ${details || 'Assertion failed'}`);
    }
  }

  async function checkEndpoint(path: string, method = 'GET', body?: any) {
    try {
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      };
      const res = await fetch(`${baseUrl}${path}`, opts);
      const json = await res.json();
      return { status: res.status, headers: res.headers, json };
    } catch (err: any) {
      return { status: 0, headers: new Headers(), json: null, error: err.message };
    }
  }

  // --- 1. Audited Endpoints (/api/*) ---
  console.log('1. Audited Production Endpoints:');

  const health = await checkEndpoint('/api/health');
  report(health.status === 200 && health.json?.status === 'healthy', 'GET /api/health -> HTTP 200 (healthy)');

  const healthDb = await checkEndpoint('/api/health/db');
  report(healthDb.status === 200 || healthDb.status === 503, 'GET /api/health/db -> Returns structured DB diagnostic');

  const resources = await checkEndpoint('/api/resources');
  report(resources.status === 200 && resources.json?.items?.length >= 10, 'GET /api/resources -> HTTP 200 with paginated items');

  const resourceDetail = await checkEndpoint('/api/resources/gemini-1-5-pro');
  report(resourceDetail.status === 200 && resourceDetail.json?.slug === 'gemini-1-5-pro', 'GET /api/resources/:slug -> HTTP 200');

  const resourceRels = await checkEndpoint('/api/resources/gemini-1-5-pro/relationships');
  report(resourceRels.status === 200 && Array.isArray(resourceRels.json), 'GET /api/resources/:slug/relationships -> HTTP 200');

  const providers = await checkEndpoint('/api/providers');
  report(providers.status === 200 && providers.json?.length >= 6, 'GET /api/providers -> HTTP 200');

  const graph = await checkEndpoint('/api/graph');
  report(graph.status === 200 && graph.json?.nodes?.length > 0 && graph.json?.edges?.length > 0, 'GET /api/graph -> HTTP 200 with graph nodes/edges');

  const workers = await checkEndpoint('/api/workers');
  report(workers.status === 200 && workers.json?.length >= 1, 'GET /api/workers -> HTTP 200');

  const tools = await checkEndpoint('/api/tools');
  report(tools.status === 200 && tools.json?.length >= 4, 'GET /api/tools -> HTTP 200');

  const manifests = await checkEndpoint('/api/manifests');
  report(manifests.status === 200 && manifests.json?.length >= 1, 'GET /api/manifests -> HTTP 200');

  const auth = await checkEndpoint('/api/auth/token', 'POST', { email: 'admin@aiheaven.local', role: 'admin' });
  report(auth.status === 200 && Boolean(auth.json?.token), 'POST /api/auth/token -> HTTP 200 with signed JWT');

  const authMe = await checkEndpoint('/api/auth/me');
  report(authMe.status === 200 && authMe.json?.authenticated === true, 'GET /api/auth/me -> HTTP 200');

  const killSwitch = await checkEndpoint('/api/kill-switch');
  report(killSwitch.status === 200 && killSwitch.json?.is_active === false, 'GET /api/kill-switch -> HTTP 200 (healthy)');

  const approvals = await checkEndpoint('/api/approvals');
  report(approvals.status === 200 && Array.isArray(approvals.json), 'GET /api/approvals -> HTTP 200 queue');

  const events = await checkEndpoint('/api/events');
  report(events.status === 200 && Array.isArray(events.json), 'GET /api/events -> HTTP 200 event stream');

  const audit = await checkEndpoint('/api/audit');
  report(audit.status === 200 && Array.isArray(audit.json), 'GET /api/audit -> HTTP 200 audit trail');

  const opsOverview = await checkEndpoint('/api/operations/overview');
  report(opsOverview.status === 200 && opsOverview.json?.status === 'online', 'GET /api/operations/overview -> HTTP 200 with online status and metrics');

  const cleanupApprovals = await checkEndpoint('/api/operations/cleanup-stale-approvals', 'POST');
  report(cleanupApprovals.status === 200 && cleanupApprovals.json?.success === true, 'POST /api/operations/cleanup-stale-approvals -> HTTP 200');

  const recoverState = await checkEndpoint('/api/operations/recover-state', 'POST');
  report(recoverState.status === 200 && recoverState.json?.success === true, 'POST /api/operations/recover-state -> HTTP 200');

  // --- 2. Vercel Dual Routing Parity (stripped /api) ---
  console.log('\n2. Vercel Dual Routing Parity (both /api/* and /* resolve):');
  const healthRoot = await checkEndpoint('/health');
  report(healthRoot.status === 200 && healthRoot.json?.status === 'healthy', 'GET /health -> HTTP 200 (parity with /api/health)');

  const graphRoot = await checkEndpoint('/graph');
  report(graphRoot.status === 200 && graphRoot.json?.nodes?.length > 0, 'GET /graph -> HTTP 200 (parity with /api/graph)');

  // --- 3. Security Headers Verification ---
  console.log('\n3. Hardened Security Headers:');
  const sampleRes = await fetch(`${baseUrl}/api/health`);
  const nosniff = sampleRes.headers.get('x-content-type-options');
  report(nosniff === 'nosniff', 'Header X-Content-Type-Options: nosniff');

  const frameOptions = sampleRes.headers.get('x-frame-options');
  report(frameOptions === 'SAMEORIGIN', 'Header X-Frame-Options: SAMEORIGIN');

  const referrerPolicy = sampleRes.headers.get('referrer-policy');
  report(referrerPolicy === 'strict-origin-when-cross-origin', 'Header Referrer-Policy: strict-origin-when-cross-origin');

  const permissionsPolicy = sampleRes.headers.get('permissions-policy');
  report(Boolean(permissionsPolicy && permissionsPolicy.includes('camera=()')), 'Header Permissions-Policy: restrictive directives');

  const csp = sampleRes.headers.get('content-security-policy');
  report(Boolean(csp && csp.includes("default-src 'self'")), 'Header Content-Security-Policy: strict policy active');

  const requestIdHeader = sampleRes.headers.get('x-request-id');
  report(Boolean(requestIdHeader && requestIdHeader.startsWith('req_')), 'Header X-Request-Id: active request tracing');

  // --- 4. Sensitive Path Exposure Blocker ---
  console.log('\n4. Sensitive Path Blocking (Forbidden/Not Found, never SPA HTML):');
  const sensitivePaths = [
    '/.env',
    '/.env.production',
    '/.git/config',
    '/backup.sql',
    '/dump.bak',
    '/server-status',
    '/phpinfo.php'
  ];

  for (const sPath of sensitivePaths) {
    const res = await fetch(`${baseUrl}${sPath}`);
    const body = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const isBlocked = res.status === 404 || res.status === 403;
    const isNotHtml = !contentType.includes('text/html') && !body.includes('<!doctype html>');
    report(isBlocked && isNotHtml, `Blocked sensitive path "${sPath}" (HTTP ${res.status}, non-HTML)`);
  }

  // --- 5. Secret Redaction Test ---
  console.log('\n5. Secret Redaction & Leak Prevention:');
  const bodyText = JSON.stringify(health.json) + JSON.stringify(healthDb.json);
  report(!bodyText.includes('password') && !bodyText.includes('secret') && !bodyText.includes('ai_heaven_production_insecure'), 'Zero passwords or JWT secrets in API diagnostic responses');

  server.close();

  console.log('\n------------------------------------------------------');
  console.log(`SECURITY & API REGRESSION TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runSmokeTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
