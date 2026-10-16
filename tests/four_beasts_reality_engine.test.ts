/**
 * AI HEAVEN - Four Beasts & Autonomous Reality Repair Engine Test Suite
 * Rigorous integration testing covering:
 * 1. Four Beasts Registry and metadata
 * 2. OpenHands iterative agent controller and action/observation cycle
 * 3. jcode fast-path AST patcher and checksum validation
 * 4. OpenCode semantic workspace indexer
 * 5. Native Brain dynamic task routing across beasts
 * 6. Autonomous Reality Repair issue lifecycle, kill switch, and verification receipts
 * 7. Live API endpoint parity
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { beastEngineRegistry } from '../src/engines/registry';
import { autonomousRealityRepairEngine } from '../src/services/reality/autonomousRealityRepairEngine';
import { app } from '../src/api/app';
import { createServer } from 'http';

test('PHASE 1: Four Beasts Engine Registry Integration', async (t) => {
  await t.test('1. Registry contains all four distinct engines with verified metadata', () => {
    const all = beastEngineRegistry.getAllMetadata();
    assert.strictEqual(all.length, 4, 'Must register exactly 4 engines');

    const ids = all.map(e => e.id).sort();
    assert.deepStrictEqual(ids, ['jcode', 'native_brain', 'opencode', 'openhands']);

    // Check upstream licenses & attribution
    const oh = all.find(e => e.id === 'openhands');
    assert.ok(oh?.upstreamLicense.includes('MIT'), 'OpenHands must have MIT attribution');
    assert.strictEqual(oh?.status, 'operational');

    const jc = all.find(e => e.id === 'jcode');
    assert.ok(jc?.upstreamLicense.includes('MIT'), 'jcode must have MIT attribution');
    assert.strictEqual(jc?.runtime, 'Rust/Wasm');

    const oc = all.find(e => e.id === 'opencode');
    assert.ok(oc?.upstreamLicense.includes('MIT'), 'OpenCode must have MIT attribution');

    const nb = all.find(e => e.id === 'native_brain');
    assert.ok(nb?.capabilities.securityAuditing, 'Native Brain must have security auditing');
  });

  await t.test('2. Dynamic engine selection routes based on task characteristics', () => {
    assert.strictEqual(beastEngineRegistry.selectBestEngine('fast syntax patch for parser'), 'jcode');
    assert.strictEqual(beastEngineRegistry.selectBestEngine('complex multi-step agent loop to resolve issue'), 'openhands');
    assert.strictEqual(beastEngineRegistry.selectBestEngine('explore codebase and build dependency graph'), 'opencode');
    assert.strictEqual(beastEngineRegistry.selectBestEngine('security scan and target scope validation'), 'native_brain');
  });
});

test('PHASE 2: Individual Beast Execution & Verification', async (t) => {
  await t.test('1. OpenHands Agent executes real Action-Observation cycle', async () => {
    const res = await beastEngineRegistry.executeTask({
      id: 'test_oh_01',
      goal: 'Inspect workspace files and report layout',
      preferredEngine: 'openhands'
    });

    assert.strictEqual(res.engineId, 'openhands');
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.verificationStatus, 'verified');
    assert.ok(res.cryptographicSignature?.startsWith('sha256:'));
    assert.ok(res.events.length > 0, 'Must produce real event stream');
  });

  await t.test('2. jcode applies fast-path patch with AST diff verification', async () => {
    const res = await beastEngineRegistry.executeTask({
      id: 'test_jc_01',
      goal: 'Fast patch for configuration validation',
      preferredEngine: 'jcode',
      context: {
        files: {
          '/workspace/fast_patch_test.txt': 'export const FAST_PATCH_VERIFIED = true;'
        }
      }
    });

    assert.strictEqual(res.engineId, 'jcode');
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.verificationStatus, 'verified');
    assert.strictEqual(res.filesChanged.length, 1);
    assert.ok(res.filesChanged[0].path.endsWith('fast_patch_test.txt'));
  });

  await t.test('3. OpenCode indexes workspace tree and produces analysis', async () => {
    const res = await beastEngineRegistry.executeTask({
      id: 'test_oc_01',
      goal: 'Index workspace and summarize component boundaries',
      preferredEngine: 'opencode'
    });

    assert.strictEqual(res.engineId, 'opencode');
    assert.strictEqual(res.status, 'completed');
    assert.ok(res.output.includes('OpenCode Architectural Analysis'));
  });
});

test('PHASE 3: Autonomous Reality Audit & Issue Registry', async (t) => {
  await t.test('1. Issue registry contains baseline discovered items with evidence', () => {
    const issues = autonomousRealityRepairEngine.getAllIssues();
    assert.ok(issues.length >= 4, 'Must seed at least 4 baseline issues');

    const issue001 = issues.find(i => i.id === 'ISSUE-001');
    assert.ok(issue001);
    assert.strictEqual(issue001?.severity, 'low');
    assert.strictEqual(issue001?.status, 'verified');
    assert.ok(issue001?.evidence.length > 0);
  });

  await t.test('2. Reality metrics return truthful aggregated counts', () => {
    const m = autonomousRealityRepairEngine.getMetrics();
    assert.ok(m.discoveredIssuesCount >= 4);
    assert.strictEqual(m.regressionsDetected, 0, 'No regressions in verified state');
    assert.ok(m.lastAuditTimestamp);
  });

  await t.test('3. Global kill switch halts autonomous execution', async () => {
    autonomousRealityRepairEngine.setKillSwitch(true);

    await assert.rejects(
      async () => {
        await autonomousRealityRepairEngine.triggerAutonomousRepair('ISSUE-001');
      },
      /Kill switch is currently ACTIVE/
    );

    // Reset kill switch
    autonomousRealityRepairEngine.setKillSwitch(false);
  });

  await t.test('4. Autonomous repair generates cryptographic verification receipt', async () => {
    const result = await autonomousRealityRepairEngine.triggerAutonomousRepair('ISSUE-004', true);
    assert.strictEqual(result.issue.id, 'ISSUE-004');
    assert.strictEqual(result.issue.status, 'verified');
    assert.ok(result.issue.verificationReceipt);
    assert.strictEqual(result.issue.verificationReceipt?.exitCode, 0);
  });
});

test('PHASE 4: Live REST API Endpoints Parity', async (t) => {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    await t.test('GET /api/engines returns all 4 beasts', async () => {
      const res = await fetch(`${baseUrl}/engines`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.length, 4);
    });

    await t.test('POST /api/engines/jcode/execute executes typed task', async () => {
      const res = await fetch(`${baseUrl}/engines/jcode/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'Verify fast syntax patch' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.engineId, 'jcode');
      assert.strictEqual(data.status, 'completed');
    });

    await t.test('GET /api/reality/issues returns issue registry', async () => {
      const res = await fetch(`${baseUrl}/reality/issues`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.ok(data.length >= 4);
    });

    await t.test('GET /api/reality/metrics returns metrics object', async () => {
      const res = await fetch(`${baseUrl}/reality/metrics`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok('discoveredIssuesCount' in data);
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
