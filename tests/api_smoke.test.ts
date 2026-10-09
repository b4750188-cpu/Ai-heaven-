/**
 * AI HEAVEN - Production API Smoke Tests
 * Verifies that the Express API app and endpoints function cleanly without errors.
 */

import http from 'http';
import { apiApp } from '../server.ts';

async function runSmokeTests() {
  console.log('======================================================');
  console.log('AI HEAVEN - PRODUCTION API SMOKE TESTS');
  console.log('======================================================\n');

  const server = http.createServer(apiApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  let passed = 0;
  let failed = 0;

  async function checkEndpoint(path: string, method = 'GET', body?: any) {
    try {
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      };
      const res = await fetch(`${baseUrl}${path}`, opts);
      const json = await res.json();
      if (res.ok) {
        passed++;
        console.log(`  [PASS] ${method} ${path} -> HTTP ${res.status}`);
        return json;
      } else {
        failed++;
        console.error(`  [FAIL] ${method} ${path} -> HTTP ${res.status}:`, json);
        return null;
      }
    } catch (err: any) {
      failed++;
      console.error(`  [FAIL] ${method} ${path} -> Fetch Error:`, err.message);
      return null;
    }
  }

  // 1. Health
  const health = await checkEndpoint('/api/health');
  if (health && health.status === 'healthy') {
    console.log('    ✓ Health status is healthy');
  }

  // 2. Resources
  const resources = await checkEndpoint('/api/resources');
  if (resources && resources.total >= 10) {
    console.log(`    ✓ Returned ${resources.total} authoritative resources`);
  }

  // 3. Providers
  const providers = await checkEndpoint('/api/providers');
  if (providers && providers.length >= 6) {
    console.log(`    ✓ Returned ${providers.length} verified providers`);
  }

  // 4. Knowledge Graph
  const graph = await checkEndpoint('/api/graph');
  if (graph && graph.nodes.length > 0 && graph.edges.length > 0) {
    console.log(`    ✓ Knowledge Graph contains ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
  }

  // 5. Workers
  const workers = await checkEndpoint('/api/workers');
  if (workers && workers.length >= 1) {
    console.log(`    ✓ Active workers count: ${workers.length}`);
  }

  // 6. Authoritative Tools
  const tools = await checkEndpoint('/api/tools');
  if (tools && tools.length >= 4) {
    console.log(`    ✓ Authoritative tools count: ${tools.length}`);
  }

  // 7. Droid Manifests
  const manifests = await checkEndpoint('/api/manifests');
  if (manifests && manifests.length >= 1) {
    console.log(`    ✓ Droid manifest verified: ${manifests[0].name}`);
  }

  // 8. Auth token generation
  const auth = await checkEndpoint('/api/auth/token', 'POST');
  if (auth && auth.token) {
    console.log('    ✓ Cryptographic JWT token issued');
  }

  // 9. Kill switch
  const ks = await checkEndpoint('/api/kill-switch');
  if (ks && ks.is_active === false) {
    console.log('    ✓ Emergency Kill Switch ready and healthy');
  }

  // 10. Approvals
  const approvals = await checkEndpoint('/api/approvals');
  if (Array.isArray(approvals)) {
    console.log('    ✓ Approvals queue queryable');
  }

  // 11. Events
  const events = await checkEndpoint('/api/events');
  if (Array.isArray(events)) {
    console.log('    ✓ Event spine queryable');
  }

  server.close();

  console.log('\n------------------------------------------------------');
  console.log(`API SMOKE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runSmokeTests().catch(err => {
  console.error('Smoke test suite error:', err);
  process.exit(1);
});
