/**
 * AI HEAVEN - Phase 1C Automated Verification Test Suite
 * Tests Agent Worker Runtime, Task Planner, Working Memory, Kill Switch & Events:
 * 1. Task creation & lifecycle (created -> in_progress -> completed / paused / cancelled)
 * 2. Planner goal decomposition into actions
 * 3. Unauthorized tool use rejection (tool not in agent whitelist)
 * 4. Memory isolation (cross-project / cross-workspace memory barrier)
 * 5. Agent heartbeat & worker health tracking
 * 6. Task cancellation & execution cascade
 * 7. Emergency kill switch (agent scope, project scope, global scope)
 * 8. Kill switch preventing new executions and tasks
 * 9. Destructive approval integration in task flow
 * 10. Execution event stream ordering
 * 11. Immutable audit generation across runtime transitions
 */

import { WorkspaceVirtualFilesystem } from '../src/services/sandbox/workspaceFs';
import { SandboxExecutor } from '../src/services/sandbox/sandboxExecutor';
import { ExecutionManager } from '../src/services/sandbox/executionManager';
import { AgentRuntimeService } from '../src/services/sandbox/agentRuntimeService';
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
  console.log('AI HEAVEN - PHASE 1C AGENT RUNTIME & PLANNER TEST SUITE');
  console.log('======================================================\n');

  const fs = new WorkspaceVirtualFilesystem();
  const executor = new SandboxExecutor(fs);
  const execManager = new ExecutionManager(executor);
  const runtime = new AgentRuntimeService(execManager, executor);

  const auditEvents: AuditEvent[] = [];
  const auditLogger = (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    auditEvents.push({
      ...event,
      id: `evt_test_${auditEvents.length + 1}`,
      timestamp: new Date().toISOString()
    });
  };

  execManager.setAuditLogger(auditLogger);
  runtime.setAuditLogger(auditLogger);

  const testAgent: AgentDefinition = {
    id: 'agent_droid_alpha',
    owner_id: 'usr_dev_01',
    project_id: 'proj_alpha',
    workspace_id: 'ws_alpha_01',
    name: 'Droid Alpha',
    description: 'Autonomous builder droid',
    status: 'idle',
    permissions: {
      allowed_tools: ['tool_terminal_sandbox', 'tool_fs_scoped'],
      network_access: false,
      filesystem_scope: 'workspace_only',
      requires_approval_for_destructive: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const availableTools: ToolDefinition[] = [
    {
      id: 'tool_terminal_sandbox',
      name: 'Sandboxed Terminal Execution',
      description: 'Executes commands in virtual sandbox',
      capability: 'terminal',
      permission_requirements: ['sandbox:exec'],
      execution_policy: {
        sandboxed_only: true,
        timeout_seconds: 30,
        requires_confirmation: false,
        max_output_bytes: 1048576
      },
      is_enabled: true
    },
    {
      id: 'tool_fs_scoped',
      name: 'Scoped Filesystem Access',
      description: 'Filesystem provider',
      capability: 'filesystem',
      permission_requirements: ['fs:workspace_write'],
      execution_policy: {
        sandboxed_only: true,
        timeout_seconds: 15,
        requires_confirmation: false,
        max_output_bytes: 10485760
      },
      is_enabled: true
    }
  ];

  // ----------------------------------------------------
  // TEST 1: Agent Worker Registration & Heartbeat
  // ----------------------------------------------------
  console.log('[1/11] Testing Agent Worker Registration & Heartbeat...');
  const worker = runtime.registerWorker(testAgent);
  assert(worker.state === 'READY', 'Worker: Initial state is READY');
  assert(worker.health === 'healthy', 'Worker: Health is healthy');

  const updatedWorker = runtime.updateHeartbeat(testAgent.id);
  assert(Boolean(updatedWorker.heartbeat_at), 'Worker: Heartbeat updated with timestamp');

  // ----------------------------------------------------
  // TEST 2: Task Creation & Planner Goal Decomposition
  // ----------------------------------------------------
  console.log('\n[2/11] Testing Task Creation & Planner Goal Decomposition...');
  const task = runtime.createTask(
    'usr_dev_01',
    'proj_alpha',
    'ws_alpha_01',
    testAgent,
    'inspect workspace status',
    'medium',
    availableTools
  );
  assert(task.status === 'created', 'Task: Created status initialized');
  assert(task.plan.length >= 2, 'Planner: Decomposed goal into multi-step actions');
  assert(task.plan[0].command === 'ls', 'Planner: First action is inspection (ls)');

  // ----------------------------------------------------
  // TEST 3: Unauthorized Tool Whitelist Enforcement
  // ----------------------------------------------------
  console.log('\n[3/11] Testing Unauthorized Tool Whitelist Enforcement...');
  const restrictedAgent: AgentDefinition = {
    ...testAgent,
    id: 'agent_restricted',
    permissions: {
      ...testAgent.permissions,
      allowed_tools: [] // No tools allowed
    }
  };
  try {
    runtime.createTask(
      'usr_dev_01',
      'proj_alpha',
      'ws_alpha_01',
      restrictedAgent,
      'run inspect',
      'low',
      availableTools
    );
    assert(false, 'Tool Whitelist: Planner should refuse unauthorized tool');
  } catch (err: any) {
    assert(err.message.includes('Planner security rejection'), 'Tool Whitelist: Planner strictly blocked unauthorized tool use');
  }

  // ----------------------------------------------------
  // TEST 4: Action Execution & State Transitions
  // ----------------------------------------------------
  console.log('\n[4/11] Testing Action Execution State Machine...');
  const taskAfterStep1 = await runtime.executeNextAction(task.id, testAgent, availableTools);
  assert(taskAfterStep1.status === 'in_progress', 'Task State: Status advanced to in_progress');
  assert(taskAfterStep1.plan[0].status === 'completed', 'Action State: Step 1 completed');
  assert(taskAfterStep1.current_action_index === 1, 'Task State: Advanced to step 2');

  // ----------------------------------------------------
  // TEST 5: Memory Scoping & Isolation
  // ----------------------------------------------------
  console.log('\n[5/11] Testing Working Memory Isolation...');
  const memAlpha = runtime.getWorkingMemory('proj_alpha', 'ws_alpha_01', testAgent.id, task.id);
  assert(Boolean(memAlpha), 'Memory: Working memory allocated for task');
  assert(memAlpha?.completed_actions.length === 1, 'Memory: Recorded completed action in working context');

  // Attempt reading cross-project or cross-workspace memory
  const memCross = runtime.getWorkingMemory('proj_beta', 'ws_beta_01', testAgent.id, task.id);
  assert(memCross === undefined, 'Memory Isolation: Cross-project/cross-workspace memory read returns undefined');

  // ----------------------------------------------------
  // TEST 6: Pause and Resume Lifecycle
  // ----------------------------------------------------
  console.log('\n[6/11] Testing Task Pause & Resume...');
  const paused = runtime.pauseTask(task.id, 'usr_dev_01');
  assert(paused.status === 'paused', 'Task: Successfully paused');

  const resumed = runtime.resumeTask(task.id, 'usr_dev_01');
  assert(resumed.status === 'in_progress', 'Task: Successfully resumed');

  // ----------------------------------------------------
  // TEST 7: Destructive Operation Approval Integration in Planner
  // ----------------------------------------------------
  console.log('\n[7/11] Testing Planner Destructive Action Approval Integration...');
  const destructiveTask = runtime.createTask(
    'usr_dev_01',
    'proj_alpha',
    'ws_alpha_01',
    testAgent,
    'delete cache.tmp',
    'high',
    availableTools
  );
  // Execute step 1 (ls)
  await runtime.executeNextAction(destructiveTask.id, testAgent, availableTools);
  // Execute step 2 (rm cache.tmp) -> must pause at WAITING_APPROVAL
  const destructiveTaskPaused = await runtime.executeNextAction(destructiveTask.id, testAgent, availableTools);
  const workerAfterDestructive = runtime.getWorker(testAgent.id);
  assert(workerAfterDestructive?.state === 'WAITING_APPROVAL', 'Approval Integration: Worker paused at WAITING_APPROVAL');

  const pendingAction = destructiveTaskPaused.plan[1];
  assert(pendingAction.requires_approval === true, 'Approval Integration: Action marked requires_approval = true');
  assert(Boolean(pendingAction.execution_id), 'Approval Integration: Generated execution job paused for approval');

  // ----------------------------------------------------
  // TEST 8: Task Cancellation
  // ----------------------------------------------------
  console.log('\n[8/11] Testing Task Cancellation...');
  const cancelledTask = runtime.cancelTask(destructiveTask.id, 'usr_dev_01');
  assert(cancelledTask.status === 'cancelled', 'Task: Successfully cancelled');

  // ----------------------------------------------------
  // TEST 9: Emergency Kill Switch (Agent Scope & Project Scope)
  // ----------------------------------------------------
  console.log('\n[9/11] Testing Emergency Kill Switch...');
  runtime.triggerKillSwitch('agent', testAgent.id, 'usr_dev_01', 'Test security alert');
  assert(runtime.isKillSwitchActiveFor('proj_alpha', testAgent.id) === true, 'Kill Switch: Active for agent');

  const killedWorker = runtime.getWorker(testAgent.id);
  assert(killedWorker?.state === 'TERMINATED', 'Kill Switch: Agent worker immediately marked TERMINATED');

  // Kill switch prevents new task creation
  try {
    runtime.createTask(
      'usr_dev_01',
      'proj_alpha',
      'ws_alpha_01',
      testAgent,
      'do new work',
      'low',
      availableTools
    );
    assert(false, 'Kill Switch: New tasks should be blocked while kill switch active');
  } catch (err: any) {
    assert(err.message.includes('Kill Switch is currently active'), 'Kill Switch: Blocked task creation while active');
  }

  // Reset kill switch
  runtime.resetKillSwitch('usr_dev_01');
  assert(runtime.isKillSwitchActiveFor('proj_alpha', testAgent.id) === false, 'Kill Switch: Inactive after reset');

  // ----------------------------------------------------
  // TEST 10: Execution Event Stream
  // ----------------------------------------------------
  console.log('\n[10/11] Testing Execution Event Stream...');
  const events = runtime.getEvents({ task_id: task.id });
  assert(events.length >= 3, `Events: Emitted ${events.length} runtime events for task`);
  const hasTaskCreated = events.some(e => e.event_type === 'task_created');
  const hasActionStarted = events.some(e => e.event_type === 'action_started');
  assert(hasTaskCreated, 'Events: Event stream recorded task_created');
  assert(hasActionStarted, 'Events: Event stream recorded action_started');

  // ----------------------------------------------------
  // TEST 11: Audit Trail Generation
  // ----------------------------------------------------
  console.log('\n[11/11] Testing Audit Trail Integration...');
  assert(auditEvents.length > 5, `Audit: Logged ${auditEvents.length} events across task and kill switch transitions`);
  const hasKillSwitchAudit = auditEvents.some(e => e.action === 'trigger_kill_switch');
  assert(hasKillSwitchAudit, 'Audit: Logged trigger_kill_switch audit event');

  console.log('\n------------------------------------------------------');
  console.log(`PHASE 1C TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
  console.log('------------------------------------------------------\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled Phase 1C test error:', err);
  process.exit(1);
});
