/**
 * AI HEAVEN - Universal Open-Source Terminal, Knowledge Engine & Evolution Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpressApp } from '../src/api/app';
import http from 'http';

test('UNIVERSAL TERMINAL, KNOWLEDGE ENGINE & AUTONOMOUS EVOLUTION SUITE', async (t) => {
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

  // =========================================================================
  // 1. Terminal & Isolated Execution Backend Tests
  // =========================================================================
  await t.test('1. Terminal Execution: Executes approved safe shell commands inside isolated VFS', async () => {
    const res = await fetch(`${baseUrl}/api/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'echo "hello sandboxed terminal" > test_file.txt',
        workspace_id: 'ws_test_isolated'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.exit_code, 0);
    assert.ok(data.execution_id.startsWith('exec_'));
    assert.ok(data.execution_engine.includes('Isolated Virtual Container'));

    // Read back file via terminal
    const catRes = await fetch(`${baseUrl}/api/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'cat test_file.txt',
        workspace_id: 'ws_test_isolated'
      })
    });
    const catData = await catRes.json();
    assert.equal(catData.exit_code, 0);
    assert.ok(catData.stdout.includes('hello sandboxed terminal'));
  });

  await t.test('2. Terminal Security: Rejects permanently forbidden host-escalation commands with exit code 126', async () => {
    const res = await fetch(`${baseUrl}/api/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'sudo rm -rf /etc/shadow',
        workspace_id: 'ws_test_isolated'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.exit_code, 126);
    assert.ok(data.stderr.includes('SECURITY BOUNDARY VIOLATION'));
  });

  await t.test('3. Terminal Approvals: Flags destructive commands as requiring explicit human approval', async () => {
    // Unapproved destructive attempt
    const unapprovedRes = await fetch(`${baseUrl}/api/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'rm -rf test_file.txt',
        workspace_id: 'ws_test_isolated',
        approved: false
      })
    });
    const unapprovedData = await unapprovedRes.json();
    assert.equal(unapprovedData.requires_approval, true);
    assert.ok(unapprovedData.approval_prompt.includes('Destructive operation'));

    // Approved destructive execution
    const approvedRes = await fetch(`${baseUrl}/api/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'rm -rf test_file.txt',
        workspace_id: 'ws_test_isolated',
        approved: true
      })
    });
    const approvedData = await approvedRes.json();
    assert.equal(approvedData.exit_code, 0);
  });

  await t.test('4. Terminal History & Workspace Files: Manages command audit trail and VFS tree', async () => {
    const histRes = await fetch(`${baseUrl}/api/terminal/history`);
    assert.equal(histRes.status, 200);
    const histData = await histRes.json();
    assert.ok(Array.isArray(histData.history));
    assert.ok(histData.history.length > 0);

    const filesRes = await fetch(`${baseUrl}/api/terminal/workspace/files?workspace_id=ws_test_isolated`);
    assert.equal(filesRes.status, 200);
    const filesData = await filesRes.json();
    assert.ok(Array.isArray(filesData.files));
  });

  // =========================================================================
  // 2. Universal Open-Source Discovery & Indexing Tests
  // =========================================================================
  await t.test('5. Open-Source Discovery: Searches repositories with rate-limit tracking and pagination', async () => {
    const searchRes = await fetch(`${baseUrl}/api/discovery/search?q=gemini&source=all&page=1&per_page=5`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();

    assert.ok(searchData.items.length > 0);
    assert.ok(searchData.rate_limit);
    assert.ok(searchData.rate_limit.remaining >= 0);
    assert.ok(searchData.sync_status.cached_at);

    // Verify first item contains required license & security risk classifications
    const first = searchData.items[0];
    assert.ok(first.full_name);
    assert.ok(first.license_name);
    assert.ok(first.license_risk);
    assert.ok(first.security_risk_level);
  });

  await t.test('6. Repository Metadata & README: Retrieves repository inspection details and releases', async () => {
    const detailsRes = await fetch(`${baseUrl}/api/discovery/repo/google-gemini/cookbook`);
    assert.equal(detailsRes.status, 200);
    const detailsData = await detailsRes.json();

    assert.ok(detailsData.metadata);
    assert.equal(detailsData.metadata.owner, 'google-gemini');
    assert.ok(detailsData.readme_content);
    assert.ok(Array.isArray(detailsData.setup_commands));
  });

  await t.test('7. Repository-to-Execution Import: Clones open-source project directly into workspace VFS', async () => {
    const importRes = await fetch(`${baseUrl}/api/terminal/workspace/import-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: 'google-gemini',
        repo: 'cookbook',
        workspace_id: 'ws_import_test'
      })
    });
    assert.equal(importRes.status, 200);
    const importData = await importRes.json();
    assert.equal(importData.success, true);
    assert.ok(importData.filesImported >= 2);

    // Verify README and manifest exist in workspace
    const readmeRes = await fetch(`${baseUrl}/api/terminal/workspace/file?workspace_id=ws_import_test&path=README.md`);
    assert.equal(readmeRes.status, 200);
    const readmeData = await readmeRes.json();
    assert.ok(readmeData.content.length > 0);
  });

  // =========================================================================
  // 3. Knowledge & Learning Engine Tests
  // =========================================================================
  await t.test('8. Knowledge & Learning Engine: Generates multi-tier learning paths grounded in official documentation', async () => {
    const guideRes = await fetch(`${baseUrl}/api/learning/guide/google-gemini-cookbook`);
    assert.equal(guideRes.status, 200);
    const guide = await guideRes.json();

    assert.ok(guide.title);
    assert.ok(guide.purpose);
    assert.ok(guide.architecture_overview);
    assert.ok(guide.installation.commands.length > 0);
    assert.ok(guide.troubleshooting.length > 0);

    // Verify 3 distinct learning levels
    assert.ok(guide.learning_paths.beginner);
    assert.ok(guide.learning_paths.intermediate);
    assert.ok(guide.learning_paths.advanced);
    assert.ok(guide.learning_paths.beginner.steps.length > 0);
    assert.equal(guide.learning_paths.beginner.steps[0].verification_status, 'verified');
    assert.ok(guide.provenance_citation.authority_rating);
  });

  // =========================================================================
  // 4. Two Persistent Personal AI Droids Tests
  // =========================================================================
  await t.test('9. Personal AI Droids: Registers two persistent droids with distinct roles and permissions', async () => {
    const agentsRes = await fetch(`${baseUrl}/api/agents`);
    assert.equal(agentsRes.status, 200);
    const agents = await agentsRes.json();

    assert.ok(Array.isArray(agents));
    assert.ok(agents.length >= 2, 'Should have at least 2 distinct droids registered');

    const prime = agents.find((a: any) => a.id === 'agent_droid_prime');
    const secops = agents.find((a: any) => a.id === 'agent_droid_secops');

    assert.ok(prime, 'Prime Architect droid must be registered');
    assert.ok(secops, 'SecOps Evaluator droid must be registered');

    // Verify separate permissions
    assert.equal(prime.permissions.filesystem_scope, 'workspace_only');
    assert.equal(secops.permissions.filesystem_scope, 'read_only');
    assert.equal(prime.permissions.network_access, true);
    assert.equal(secops.permissions.network_access, false);

    // Verify workers
    const workersRes = await fetch(`${baseUrl}/api/workers`);
    assert.equal(workersRes.status, 200);
    const workers = await workersRes.json();
    assert.ok(workers.some((w: any) => w.agent_id === 'agent_droid_prime'));
    assert.ok(workers.some((w: any) => w.agent_id === 'agent_droid_secops'));
  });

  // =========================================================================
  // 5. Autonomous Evolution Engine Tests
  // =========================================================================
  await t.test('10. Autonomous Evolution Engine: Runs benchmarks, compares candidates, validates promotion & rollback', async () => {
    // 10a. Active state
    const stateRes = await fetch(`${baseUrl}/api/evolution/state`);
    assert.equal(stateRes.status, 200);
    const state = await stateRes.json();
    assert.ok(state.current_active_version);

    // 10b. Candidates
    const candRes = await fetch(`${baseUrl}/api/evolution/candidates`);
    assert.equal(candRes.status, 200);
    const candData = await candRes.json();
    assert.ok(candData.candidates.length >= 2);

    // 10c. Run benchmark experiment
    const expRes = await fetch(`${baseUrl}/api/evolution/experiments/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: 'cand_planner_v25' })
    });
    assert.equal(expRes.status, 200);
    const expData = await expRes.json();
    assert.equal(expData.status, 'completed');
    assert.equal(expData.promotion_criteria_met, true);
    assert.ok(expData.reproducibility_hash);

    // 10d. Promote candidate
    const promoRes = await fetch(`${baseUrl}/api/evolution/candidates/cand_planner_v25/promote`, {
      method: 'POST'
    });
    assert.equal(promoRes.status, 200);
    const promoData = await promoRes.json();
    assert.equal(promoData.success, true);
    assert.ok(promoData.activeVersion.includes('Active'));

    // 10e. Rollback
    const rollRes = await fetch(`${baseUrl}/api/evolution/rollback`, {
      method: 'POST'
    });
    assert.equal(rollRes.status, 200);
    const rollData = await rollRes.json();
    assert.equal(rollData.success, true);
    assert.ok(rollData.restoredVersion);
  });
});
