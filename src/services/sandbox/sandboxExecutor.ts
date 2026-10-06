/**
 * AI HEAVEN - Sandbox Execution Protocol & Boundary
 * Executes commands in an isolated virtual sandbox scope.
 * Enforces command allow/deny policies, timeout timers, output byte caps,
 * network denial gates, secret masking, and destructive operation flags.
 * NEVER executes untrusted agent commands on the host machine.
 */

import { AgentPermissions, ToolDefinition } from '../../types/foundation';
import { IWorkspaceFilesystemProvider, SandboxExecutionRequest, SandboxExecutionResult } from '../../types/execution';
import { workspaceFilesystem } from './workspaceFs';

// Completely forbidden commands that can never run under any circumstances
const FORBIDDEN_HOST_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /shutdown/i,
  /reboot/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:(){\s*:\|:&\s*};:/,
  /chmod\s+-R\s+777\s+\//i,
  /\/etc\/(shadow|passwd)/i,
  /\/proc\//i,
  /sudo\s+/i,
  /su\s+/i,
  /chroot/i,
  /userdel/i
];

// Destructive patterns that modify or delete workspace state and MUST require human approval
const DESTRUCTIVE_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bunlink\b/i,
  /\bdelete\b/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-f/i,
  /drop\s+table/i,
  /truncate/i,
  /\bkill\b/i,
  /\bpkill\b/i
];

// Network patterns that require explicit agent network_access permission
const NETWORK_PATTERNS = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bnc\b/i,
  /\bncat\b/i,
  /\bnetcat\b/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /\bftp\b/i,
  /\btelnet\b/i,
  /\bhttp:\/\//i,
  /\bhttps:\/\//i
];

export class SandboxExecutor {
  constructor(private fsProvider: IWorkspaceFilesystemProvider = workspaceFilesystem) {}

  /**
   * Evaluates if a command contains prohibited host patterns.
   */
  public isHostForbidden(command: string): boolean {
    return FORBIDDEN_HOST_PATTERNS.some(pattern => pattern.test(command));
  }

  /**
   * Evaluates if a command is destructive and requires human approval.
   */
  public isDestructive(command: string): boolean {
    return DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(command));
  }

  /**
   * Evaluates if a command attempts network access.
   */
  public isNetworkAttempt(command: string): boolean {
    return NETWORK_PATTERNS.some(pattern => pattern.test(command));
  }

  /**
   * Sanitizes output by stripping secrets, environment tokens, and host paths.
   */
  public maskSecrets(text: string): string {
    return text
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
      .replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, 'password="[REDACTED]"')
      .replace(/\/home\/[a-zA-Z0-9_-]+/g, '/workspace')
      .replace(/\/root/g, '/workspace');
  }

  /**
   * Executes a command inside the virtual workspace sandbox.
   * Uses simulated virtual process execution isolated to workspace virtual filesystem.
   */
  public async execute(
    request: SandboxExecutionRequest,
    tool: ToolDefinition,
    agentPermissions: AgentPermissions,
    executionId: string
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const command = request.command.trim();

    // 1. Host forbidden validation
    if (this.isHostForbidden(command)) {
      return {
        execution_id: executionId,
        exit_code: 126,
        stdout: '',
        stderr: 'SECURITY FAULT: Command violates host security policy and is permanently disallowed.',
        output_truncated: false,
        duration_ms: Date.now() - startTime
      };
    }

    // 2. Network permission validation
    if (this.isNetworkAttempt(command) && !agentPermissions.network_access) {
      return {
        execution_id: executionId,
        exit_code: 1,
        stdout: '',
        stderr: 'PERMISSION DENIED: Agent does not possess "network_access" permission for outbound calls.',
        output_truncated: false,
        duration_ms: Date.now() - startTime
      };
    }

    // 3. Filesystem scope validation
    if (agentPermissions.filesystem_scope === 'none' && (command.startsWith('cat ') || command.startsWith('ls') || command.startsWith('touch '))) {
      return {
        execution_id: executionId,
        exit_code: 1,
        stdout: '',
        stderr: 'PERMISSION DENIED: Agent filesystem_scope is "none". Cannot access workspace files.',
        output_truncated: false,
        duration_ms: Date.now() - startTime
      };
    }

    // 4. Timeout check simulation (if command is 'sleep 100' or simulated timeout)
    const timeoutMs = (tool.execution_policy.timeout_seconds || 30) * 1000;
    if (command.includes('sleep 999') || command.includes('--simulate-timeout')) {
      return {
        execution_id: executionId,
        exit_code: 124, // Standard SIGTERM timeout code
        stdout: '',
        stderr: `EXECUTION TIMEOUT: Process terminated after exceeding ${tool.execution_policy.timeout_seconds}s execution boundary limit.`,
        output_truncated: false,
        duration_ms: timeoutMs
      };
    }

    // 5. Execute within virtual sandbox environment
    let rawStdout = '';
    let rawStderr = '';
    let exitCode = 0;

    try {
      if (command.startsWith('echo ')) {
        const text = command.slice(5).replace(/^['"]|['"]$/g, '');
        rawStdout = text + '\n';
      } else if (command.startsWith('ls')) {
        const files = await this.fsProvider.listFiles(request.workspace_id, undefined, agentPermissions.filesystem_scope);
        rawStdout = files.map(f => `${f.type === 'directory' ? 'd' : '-'} ${f.name} (${f.size_bytes}B)`).join('\n') + '\n';
      } else if (command.startsWith('cat ')) {
        const target = command.slice(4).trim();
        const file = await this.fsProvider.readFile(request.workspace_id, target, agentPermissions.filesystem_scope);
        rawStdout = file.content;
      } else if (command.startsWith('touch ')) {
        const target = command.slice(6).trim();
        await this.fsProvider.writeFile(request.workspace_id, target, '', agentPermissions.filesystem_scope);
        rawStdout = `Created file: ${target}\n`;
      } else if (command.startsWith('rm ')) {
        const target = command.slice(3).trim();
        await this.fsProvider.deleteFile(request.workspace_id, target, agentPermissions.filesystem_scope);
        rawStdout = `Removed file: ${target}\n`;
      } else if (command === 'pwd') {
        rawStdout = `/workspace/${request.workspace_id}\n`;
      } else if (command === 'whoami') {
        rawStdout = `sandbox-agent\n`;
      } else if (command.startsWith('git status')) {
        rawStdout = `On branch main\nNothing to commit, working tree clean\n`;
      } else if (command.includes('--simulate-error')) {
        exitCode = 1;
        rawStderr = `Command execution error: simulated fault in sandbox container.\n`;
      } else {
        // Generic sandboxed command response
        rawStdout = `[sandboxed-env /workspace/${request.workspace_id}] Executed: ${command}\nStatus: OK\n`;
      }
    } catch (err: any) {
      exitCode = 1;
      rawStderr = err.message || 'Sandbox execution error';
    }

    // 6. Max output bytes capping
    const maxBytes = tool.execution_policy.max_output_bytes || 1048576;
    let truncated = false;

    if (Buffer.byteLength(rawStdout, 'utf8') > maxBytes) {
      rawStdout = rawStdout.slice(0, maxBytes) + '\n[OUTPUT TRUNCATED: Exceeded max_output_bytes boundary]';
      truncated = true;
    }
    if (Buffer.byteLength(rawStderr, 'utf8') > maxBytes) {
      rawStderr = rawStderr.slice(0, maxBytes) + '\n[OUTPUT TRUNCATED: Exceeded max_output_bytes boundary]';
      truncated = true;
    }

    // 7. Mask secrets
    const maskedStdout = this.maskSecrets(rawStdout);
    const maskedStderr = this.maskSecrets(rawStderr);

    return {
      execution_id: executionId,
      exit_code: exitCode,
      stdout: maskedStdout,
      stderr: maskedStderr,
      output_truncated: truncated,
      duration_ms: Date.now() - startTime
    };
  }
}

export const sandboxExecutor = new SandboxExecutor();
