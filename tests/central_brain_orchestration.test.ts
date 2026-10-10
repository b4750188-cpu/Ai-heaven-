import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { createExpressApp } from '../src/api/app';

const app = createExpressApp();
const server = http.createServer(app);

function request(path: string, options: { method?: string; body?: any } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: (server.address() as any).port,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // keep raw
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('CENTRAL BRAIN, MODEL ROUTER & MULTI-AGENT ORCHESTRATION SUITE', async (t) => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  t.after(() => {
    server.close();
  });

  await t.test('1. Model Catalog: GET /api/brain/models returns calibrated model specs', async () => {
    const res = await request('/api/brain/models');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.models), 'models should be an array');
    assert.ok(res.body.models.length >= 5, 'should have at least 5 models');

    const geminiFlash = res.body.models.find((m: any) => m.id === 'gemini-2.5-flash');
    assert.ok(geminiFlash, 'Gemini 2.5 Flash exists');
    assert.strictEqual(geminiFlash.provider, 'google');
    assert.ok(geminiFlash.contextWindow >= 1000000, 'Flash has 1M+ context window');
    assert.ok(geminiFlash.speedScore >= 90, 'Flash has high speed score');
  });

  await t.test('2. Request Classifier: POST /api/brain/classify detects domain and selects optimal model', async () => {
    // Coding query
    const resCoding = await request('/api/brain/classify', {
      method: 'POST',
      body: { query: 'Refactor TypeScript authentication middleware and add token expiry tests' }
    });
    assert.strictEqual(resCoding.status, 200);
    assert.strictEqual(resCoding.body.domain, 'coding');
    assert.ok(resCoding.body.recommendedModel, 'recommendedModel returned');
    assert.ok(resCoding.body.rationale, 'rationale string returned');

    // Terminal query
    const resTerminal = await request('/api/brain/classify', {
      method: 'POST',
      body: { query: 'run bash command git status and ls' }
    });
    assert.strictEqual(resTerminal.status, 200);
    assert.strictEqual(resTerminal.body.domain, 'terminal');
    assert.strictEqual(resTerminal.body.recommendedModel.id, 'gemini-2.5-flash');
  });

  await t.test('3. Decision History: GET /api/brain/decisions returns auditable decision trail', async () => {
    const res = await request('/api/brain/decisions');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.decisions), 'decisions is array');
    assert.ok(res.body.decisions.length > 0, 'has recorded decisions');
    const first = res.body.decisions[0];
    assert.ok(first.id.startsWith('route_'), 'has deterministic route ID');
    assert.ok(first.selectedModelName, 'records selected model name');
    assert.ok(first.scores, 'records scores breakdown');
  });

  await t.test('4. Multi-Agent DAG Orchestration: POST /api/brain/orchestrate builds subtask plan', async () => {
    const res = await request('/api/brain/orchestrate', {
      method: 'POST',
      body: { goal: 'Audit security rules, refactor endpoints, and run automated regression tests' }
    });
    assert.strictEqual(res.status, 200);
    const plan = res.body;
    assert.ok(plan.id.startsWith('plan_'), 'plan ID generated');
    assert.ok(Array.isArray(plan.subtasks), 'subtasks array created');
    assert.strictEqual(plan.subtasks.length, 5, 'decomposed into 5 specialized subtasks');

    // Verify specialized agents assigned
    const agents = plan.subtasks.map((s: any) => s.assignedAgent);
    assert.ok(agents.includes('researcher'), 'researcher agent included');
    assert.ok(agents.includes('security'), 'security agent included');
    assert.ok(agents.includes('coder'), 'coder agent included');
    assert.ok(agents.includes('tester'), 'tester agent included');
    assert.ok(agents.includes('reviewer'), 'reviewer agent included');

    // Verify dependencies DAG
    const coderStep = plan.subtasks.find((s: any) => s.assignedAgent === 'coder');
    assert.ok(coderStep.dependsOn.length > 0, 'coder step depends on prior security audit');
  });

  await t.test('5. Plan Execution & Step Advance: POST /api/brain/plans/:id/advance advances subtasks', async () => {
    // Create plan
    const createRes = await request('/api/brain/orchestrate', {
      method: 'POST',
      body: { goal: 'Execute verified deployment check and report results' }
    });
    const planId = createRes.body.id;
    const subtask1 = createRes.body.subtasks[0];

    // Advance step 1
    const advanceRes = await request(`/api/brain/plans/${planId}/advance`, {
      method: 'POST',
      body: { subtaskId: subtask1.id, output: 'Verified context files and system dependencies.' }
    });
    assert.strictEqual(advanceRes.status, 200);
    assert.strictEqual(advanceRes.body.subtasks[0].status, 'completed');
    assert.ok(advanceRes.body.subtasks[0].output.includes('Verified context files'));
  });

  await t.test('6. Persistent Conversations: Full message threading and memory retrieval', async () => {
    // Create conversation
    const createRes = await request('/api/conversations', {
      method: 'POST',
      body: { title: 'Test Persistent Memory Thread', model: 'gemini-2.5-pro' }
    });
    assert.strictEqual(createRes.status, 200);
    const convId = createRes.body.id;

    // Send user message
    const userMsg = await request(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      body: { role: 'user', content: 'What is the current platform status?' }
    });
    assert.strictEqual(userMsg.status, 200);
    assert.strictEqual(userMsg.body.content, 'What is the current platform status?');

    // Send assistant response
    const agentMsg = await request(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      body: {
        role: 'assistant',
        content: 'All 7 subsystems operational. PostgreSQL connection pool verified.',
        agentName: 'Central Brain',
        modelUsed: 'gemini-2.5-pro'
      }
    });
    assert.strictEqual(agentMsg.status, 200);

    // Retrieve conversation history
    const listRes = await request(`/api/conversations/${convId}/messages`);
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.messages.length, 2);
  });

  await t.test('7. Task Checkpoints: Create, list, and restore checkpoints', async () => {
    const cpRes = await request('/api/checkpoints', {
      method: 'POST',
      body: {
        taskId: 'task_audit_core',
        title: 'Pre-Deployment Safe Checkpoint',
        stepIndex: 3,
        snapshot: { status: 'healthy', filesModified: ['src/api/app.ts'] }
      }
    });
    assert.strictEqual(cpRes.status, 200);
    assert.ok(cpRes.body.id.startsWith('ckpt_'));

    // Retrieve checkpoints
    const listCp = await request('/api/checkpoints?task_id=task_audit_core');
    assert.strictEqual(listCp.status, 200);
    assert.ok(listCp.body.checkpoints.length >= 1);

    // Restore checkpoint
    const restoreRes = await request(`/api/checkpoints/${cpRes.body.id}/restore`, {
      method: 'POST'
    });
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.body.success, true);
    assert.ok(restoreRes.body.message.includes('Restored task state'));
  });

  await t.test('8. Provider Quota & Account Management: Quota tracking and Google account switching', async () => {
    // Get quotas
    const quotasRes = await request('/api/quotas');
    assert.strictEqual(quotasRes.status, 200);
    assert.ok(Array.isArray(quotasRes.body.quotas));
    assert.ok(quotasRes.body.quotas.find((q: any) => q.providerId === 'google-ai'));

    // Get Google Accounts
    const accRes = await request('/api/accounts/google');
    assert.strictEqual(accRes.status, 200);
    assert.ok(accRes.body.activeAccount);
    assert.ok(Array.isArray(accRes.body.availableAccounts));

    // Switch account
    const switchRes = await request('/api/accounts/google/switch', {
      method: 'POST',
      body: { email: 'engineering-ops@gmail.com' }
    });
    assert.strictEqual(switchRes.status, 200);
    assert.strictEqual(switchRes.body.activeAccount, 'engineering-ops@gmail.com');
  });

  await t.test('9. Conversation Lifecycle: Rename, project association, search, and deletion', async () => {
    // 1. Create a thread
    const createRes = await request('/api/conversations', {
      method: 'POST',
      body: { title: 'Initial Temp Thread', model: 'claude-3-7-sonnet' }
    });
    assert.strictEqual(createRes.status, 200);
    const convId = createRes.body.id;

    // 2. Rename thread & associate project
    const updateRes = await request(`/api/conversations/${convId}`, {
      method: 'PUT',
      body: {
        title: 'Renamed Engineering Thread',
        projectId: 'proj_ai_heaven_core',
        projectName: 'AI Heaven Core Platform'
      }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.title, 'Renamed Engineering Thread');
    assert.strictEqual(updateRes.body.projectId, 'proj_ai_heaven_core');

    // 3. Search conversation
    const searchRes = await request('/api/conversations/search?q=Renamed');
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.conversations.some((c: any) => c.id === convId));

    // 4. Delete conversation
    const delRes = await request(`/api/conversations/${convId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    // 5. Verify deletion
    const verifySearch = await request('/api/conversations/search?q=Renamed');
    assert.ok(!verifySearch.body.conversations.some((c: any) => c.id === convId));
  });

  await t.test('10. Provider Status Boundary: Honestly identifies live vs unconfigured credentials', async () => {
    const res = await request('/api/providers/status');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.providers));
    
    // Check Google Gemini status
    const geminiStatus = res.body.providers.find((p: any) => p.provider === 'google');
    assert.ok(geminiStatus, 'Google provider reported');
    assert.ok(typeof geminiStatus.isConfigured === 'boolean');
    assert.ok(geminiStatus.details.includes('Google OAuth sign-in does not grant Gemini API access') || geminiStatus.details.includes('Live API key detected'));

    // Check Local Sandbox status
    const localStatus = res.body.providers.find((p: any) => p.provider === 'local-vfs');
    assert.ok(localStatus, 'Local VFS provider reported');
    assert.strictEqual(localStatus.status, 'operational');
  });
});
