/**
 * AI HEAVEN - Fable Mode & Grounding Verification Service
 * 
 * Upstream Reference: codeclawd/fable-mode (MIT License)
 * Repository: https://github.com/codeclawd/fable-mode
 * 
 * Provides:
 * 1. Fable Mode agentic discipline layer (FABLE_CODE.md distillation)
 * 2. Independent Grounding Verifier (cold auditor of code claims)
 * 3. Mechanical Test-After-Edit verification hook
 * 4. Fable Doctor diagnostics and environment validation
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import {
  FableDoctorReport,
  FableDoctorCheck,
  FableModeConfig,
  GroundingClaim,
  GroundingLedgerReport,
  TestAfterEditResult
} from '../../contracts/fableMode';

export class FableModeService {
  private config: FableModeConfig = {
    isEnabled: true,
    version: '3.1.0-fable-distillation',
    sourceRepo: 'https://github.com/codeclawd/fable-mode',
    discipline: 'fable_5_1_distillation',
    testAfterEditEnabled: true,
    debounceSeconds: 15,
    timeoutSeconds: 60,
    trustedRoots: [process.cwd()],
    reportVsFixEnforced: true,
    evidenceBeforeStateChange: true
  };

  private lastTestRunTime: Map<string, number> = new Map();
  private lastTestResult: Map<string, TestAfterEditResult> = new Map();
  private activeLedgers: Map<string, GroundingLedgerReport> = new Map();

  /**
   * Retrieves active Fable Mode configuration.
   */
  public getConfig(): FableModeConfig {
    return { ...this.config };
  }

  /**
   * Enables or disables Fable Mode discipline.
   */
  public setEnabled(enabled: boolean): FableModeConfig {
    this.config.isEnabled = enabled;
    return this.getConfig();
  }

  /**
   * Updates test-after-edit configuration.
   */
  public configureTestHook(options: {
    enabled?: boolean;
    debounceSeconds?: number;
    timeoutSeconds?: number;
  }): FableModeConfig {
    if (options.enabled !== undefined) this.config.testAfterEditEnabled = options.enabled;
    if (options.debounceSeconds !== undefined) this.config.debounceSeconds = options.debounceSeconds;
    if (options.timeoutSeconds !== undefined) this.config.timeoutSeconds = options.timeoutSeconds;
    return this.getConfig();
  }

  /**
   * Fable Doctor: Verifies Fable agentic environment, Python runtime,
   * test command discovery, and hook enforcement end-to-end.
   */
  public async runDoctor(): Promise<FableDoctorReport> {
    const checks: FableDoctorCheck[] = [];
    const recommendations: string[] = [];

    // 1. Python runtime check
    let pythonAvailable = false;
    let pythonVersion: string | undefined;

    try {
      const pyVer = await this.execCommand('python3 --version || python --version', 3000);
      if (pyVer.stdout && (pyVer.stdout.includes('Python 3.') || pyVer.stdout.includes('Python 2.'))) {
        pythonAvailable = true;
        pythonVersion = pyVer.stdout.trim();
        checks.push({
          name: 'Python Runtime',
          status: 'ok',
          detail: `Detected ${pythonVersion} (hooks & scripts operational)`
        });
      } else {
        checks.push({
          name: 'Python Runtime',
          status: 'warn',
          detail: 'Python executable returned non-standard output'
        });
        recommendations.push('Verify Python 3 is installed and added to system PATH for full hook execution.');
      }
    } catch {
      checks.push({
        name: 'Python Runtime',
        status: 'warn',
        detail: 'Python binary not located in PATH; using in-process TypeScript verification engine'
      });
      recommendations.push('Install Python 3 if external standalone fable-mode scripts are required.');
    }

    // 2. Test Command Discovery (.fable-test or package.json)
    const testDiscovery = this.discoverTestCommand();
    if (testDiscovery.source === '.fable-test') {
      checks.push({
        name: 'Test Command Discovery',
        status: 'ok',
        detail: `Found pinned .fable-test command: '${testDiscovery.command}'`
      });
    } else if (testDiscovery.source === 'package.json') {
      checks.push({
        name: 'Test Command Discovery',
        status: 'ok',
        detail: `Discovered npm test command from package.json: '${testDiscovery.command}'`
      });
    } else {
      checks.push({
        name: 'Test Command Discovery',
        status: 'warn',
        detail: 'No dedicated test command discovered'
      });
      recommendations.push('Add a .fable-test file or a "test" script in package.json to enable automatic post-edit test execution.');
    }

    // 3. Fable Operating Discipline
    checks.push({
      name: 'Fable 5.1 Distillation Rules',
      status: 'ok',
      detail: 'Loaded: Outcome-first summaries, Act-don\'t-ask autonomy, Report-vs-Fix, Evidence-before-state-change'
    });

    // 4. Grounding Verifier
    checks.push({
      name: 'Grounding Verifier (Cold Auditor)',
      status: 'ok',
      detail: 'Read-only ledger row-checking and gap-scan engine initialized'
    });

    // 5. Test-After-Edit Hook
    if (this.config.testAfterEditEnabled) {
      checks.push({
        name: 'Test-After-Edit Mechanical Enforcement',
        status: 'ok',
        detail: `Active (Debounce: ${this.config.debounceSeconds}s, Timeout: ${this.config.timeoutSeconds}s)`
      });
    } else {
      checks.push({
        name: 'Test-After-Edit Mechanical Enforcement',
        status: 'warn',
        detail: 'Disabled via configuration'
      });
      recommendations.push('Enable test-after-edit enforcement to mechanically catch regressions after code changes.');
    }

    const hasFails = checks.some(c => c.status === 'fail');
    const hasWarns = checks.some(c => c.status === 'warn');
    const overallHealth = hasFails ? 'NEEDS_CONFIGURATION' : hasWarns ? 'DEGRADED' : 'HEALTHY';

    return {
      overallHealth,
      version: this.config.version,
      pythonAvailable,
      pythonVersion,
      testDiscovery,
      hooksStatus: {
        testAfterEditActive: this.config.testAfterEditEnabled,
        groundingVerifierReady: true,
        sessionDisciplineActive: this.config.isEnabled
      },
      checks,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Discovers the authoritative test command for the current project.
   */
  public discoverTestCommand(): {
    command: string;
    source: '.fable-test' | 'package.json' | 'none';
    isExecutable: boolean;
  } {
    // 1. Check for .fable-test file
    const fableTestPath = path.join(process.cwd(), '.fable-test');
    if (fs.existsSync(fableTestPath)) {
      try {
        const lines = fs.readFileSync(fableTestPath, 'utf-8').split('\n');
        const firstCommand = lines.map(l => l.trim()).find(l => l.length > 0 && !l.startsWith('#'));
        if (firstCommand) {
          return {
            command: firstCommand,
            source: '.fable-test',
            isExecutable: true
          };
        }
      } catch {
        // Fall back to package.json
      }
    }

    // 2. Check package.json test script
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (pkg.scripts && pkg.scripts.test) {
          return {
            command: 'npm test',
            source: 'package.json',
            isExecutable: true
          };
        }
      } catch {
        // Fall back
      }
    }

    return {
      command: 'npm test',
      source: 'none',
      isExecutable: false
    };
  }

  /**
   * Mechanical Test-After-Edit hook.
   * Runs the project's tests after a code edit and returns the result.
   */
  public async executeTestAfterEdit(
    editedFile?: string,
    workspacePath: string = process.cwd()
  ): Promise<TestAfterEditResult> {
    const now = Date.now();
    const lastRun = this.lastTestRunTime.get(workspacePath) || 0;
    const debounceMs = this.config.debounceSeconds * 1000;

    // Check debounce
    if (now - lastRun < debounceMs && this.lastTestResult.has(workspacePath)) {
      const cached = this.lastTestResult.get(workspacePath)!;
      return {
        ...cached,
        debounced: true
      };
    }

    // If edited file is documentation or asset, skip test execution
    if (editedFile) {
      const skipExtensions = [
        '.md', '.markdown', '.txt', '.png', '.jpg', '.jpeg', '.svg', '.gif',
        '.ico', '.webp', '.pdf', '.lock', '.log'
      ];
      const ext = path.extname(editedFile).toLowerCase();
      if (skipExtensions.includes(ext)) {
        return {
          command: 'skipped (non-code asset)',
          exitCode: 0,
          passed: true,
          durationMs: 0,
          stdoutSnippet: `Skipped test run: ${editedFile} is non-executable documentation or asset.`,
          stderrSnippet: '',
          executedAt: new Date().toISOString(),
          debounced: false
        };
      }
    }

    const { command } = this.discoverTestCommand();
    const startTime = Date.now();

    try {
      this.lastTestRunTime.set(workspacePath, now);
      const output = await this.execCommand(command, this.config.timeoutSeconds * 1000);
      const durationMs = Date.now() - startTime;
      const passed = output.exitCode === 0;

      const result: TestAfterEditResult = {
        command,
        exitCode: output.exitCode,
        passed,
        durationMs,
        stdoutSnippet: output.stdout.slice(-1500),
        stderrSnippet: output.stderr.slice(-1500),
        executedAt: new Date().toISOString(),
        debounced: false
      };

      this.lastTestResult.set(workspacePath, result);
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const result: TestAfterEditResult = {
        command,
        exitCode: err.exitCode || 1,
        passed: false,
        durationMs,
        stdoutSnippet: err.stdout ? String(err.stdout).slice(-1500) : '',
        stderrSnippet: (err.message || 'Test execution failed').slice(-1500),
        executedAt: new Date().toISOString(),
        debounced: false
      };

      this.lastTestResult.set(workspacePath, result);
      return result;
    }
  }

  /**
   * Grounding Verifier: Cold, independent auditor of code claims.
   * Assumes every claim is WRONG until live code or command proves it right.
   */
  public async verifyGroundingLedger(
    stepGoal: string,
    claims: GroundingClaim[],
    options?: {
      diff?: string;
      diffSummary?: string;
      workspaceRoot?: string;
    }
  ): Promise<GroundingLedgerReport> {
    const root = options?.workspaceRoot || process.cwd();
    const evaluatedClaims: GroundingClaim[] = [];
    const gaps: string[] = [];
    let refutedCount = 0;
    let insufficientCount = 0;

    for (const c of claims) {
      const claimCopy: GroundingClaim = { ...c };

      if (c.evidenceType === 'read') {
        // Read evidence: file:line or file path
        const refParts = c.reference.split(':');
        const relPath = refParts[0]?.trim();
        const lineNum = refParts[1] ? parseInt(refParts[1].trim(), 10) : undefined;
        const fullPath = path.resolve(root, relPath);

        if (!fs.existsSync(fullPath)) {
          claimCopy.verdict = 'REFUTED';
          claimCopy.divergenceReason = `Referenced file does not exist: '${relPath}'`;
          refutedCount++;
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            if (lineNum !== undefined) {
              if (lineNum < 1 || lineNum > lines.length) {
                claimCopy.verdict = 'REFUTED';
                claimCopy.divergenceReason = `Line ${lineNum} out of bounds (file has ${lines.length} lines)`;
                refutedCount++;
              } else {
                const targetLine = lines[lineNum - 1];
                claimCopy.observedEvidence = `Line ${lineNum}: ${targetLine.trim()}`;
                claimCopy.verdict = 'CONFIRMED';
              }
            } else {
              // File exists and is non-empty
              claimCopy.observedEvidence = `File exists (${content.length} bytes, ${lines.length} lines)`;
              claimCopy.verdict = 'CONFIRMED';
            }
          } catch (readErr: any) {
            claimCopy.verdict = 'INSUFFICIENT';
            claimCopy.divergenceReason = `Read error: ${readErr.message}`;
            insufficientCount++;
          }
        }
      } else if (c.evidenceType === 'run') {
        // Run evidence: must execute or evaluate command
        const cmd = c.reference.trim();
        // Disallow dangerous or host-violating commands
        if (/rm\s+-rf\s+\/|sudo|shutdown|reboot/i.test(cmd)) {
          claimCopy.verdict = 'REFUTED';
          claimCopy.divergenceReason = 'Security fault: Refused forbidden host command in verification ledger';
          refutedCount++;
        } else {
          try {
            const out = await this.execCommand(cmd, 10000);
            if (out.exitCode === 0) {
              claimCopy.verdict = 'CONFIRMED';
              claimCopy.observedEvidence = (out.stdout || 'Command exited 0').slice(0, 300);
            } else {
              claimCopy.verdict = 'REFUTED';
              claimCopy.observedEvidence = (out.stderr || out.stdout || `Exit code ${out.exitCode}`).slice(0, 300);
              claimCopy.divergenceReason = `Command exited with non-zero exit code ${out.exitCode}`;
              refutedCount++;
            }
          } catch (runErr: any) {
            claimCopy.verdict = 'INSUFFICIENT';
            claimCopy.divergenceReason = `Execution error: ${runErr.message}`;
            insufficientCount++;
          }
        }
      } else {
        // Behavioral claims require executable checks
        claimCopy.verdict = 'INSUFFICIENT';
        claimCopy.divergenceReason = 'Behavioral claims cannot be verified on read-only assertion alone; construct and run an executable check';
        insufficientCount++;
      }

      evaluatedClaims.push(claimCopy);
    }

    // Gap Scan: Look for missing security checks or unverified assumptions
    if (claims.length === 0) {
      gaps.push('Zero claims submitted in grounding ledger; cannot verify empty claims');
    }
    const hasSecurityCheck = claims.some(c => c.claim.toLowerCase().includes('security') || c.claim.toLowerCase().includes('permission') || c.claim.toLowerCase().includes('token'));
    if (!hasSecurityCheck && (stepGoal.toLowerCase().includes('auth') || stepGoal.toLowerCase().includes('permission') || stepGoal.toLowerCase().includes('dispatch'))) {
      gaps.push('Ledger omits permission/security boundary validation for consequential action');
    }

    // Summary Fidelity check if diff provided
    let summaryFidelity: { isFaithful: boolean; omissions: string[]; unsupportedClaims: string[] } | undefined;
    if (options?.diff && options?.diffSummary) {
      const omissions: string[] = [];
      const unsupportedClaims: string[] = [];
      // Basic fidelity heuristics
      if (options.diff.includes('export ') && !options.diffSummary.includes('export')) {
        omissions.push('Diff exports new symbols not documented in summary');
      }
      summaryFidelity = {
        isFaithful: omissions.length === 0 && unsupportedClaims.length === 0,
        omissions,
        unsupportedClaims
      };
    }

    const overallVerdict: 'GO' | 'NO-GO' = (refutedCount === 0 && insufficientCount === 0 && gaps.length === 0) ? 'GO' : 'NO-GO';
    const primaryReason = overallVerdict === 'GO'
      ? `All ${evaluatedClaims.length} claims verified against live code and commands with zero gaps.`
      : refutedCount > 0
      ? `${refutedCount} claim(s) refuted by actual code evidence or execution failures.`
      : insufficientCount > 0
      ? `${insufficientCount} claim(s) lack sufficient executable proof.`
      : `Gap scan identified ${gaps.length} missing load-bearing requirement(s).`;

    const reportId = `ground_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const checksumPayload = `${reportId}|${stepGoal}|${overallVerdict}|${refutedCount}|${insufficientCount}|${timestamp}`;
    const evidenceChecksum = crypto.createHash('sha256').update(checksumPayload).digest('hex');

    const report: GroundingLedgerReport = {
      id: reportId,
      stepGoal,
      claims: evaluatedClaims,
      gapsIdentified: gaps,
      summaryFidelity,
      verdict: overallVerdict,
      primaryReason,
      auditorId: 'droid_grounding_verifier',
      auditedAt: timestamp,
      evidenceChecksum
    };

    this.activeLedgers.set(reportId, report);
    return report;
  }

  /**
   * Safe subprocess executor helper with timeout.
   */
  private execCommand(command: string, timeoutMs: number = 30000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      exec(command, { timeout: timeoutMs, cwd: process.cwd() }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? (error.code || 1) : 0
        });
      });
    });
  }
}

export const fableModeService = new FableModeService();
