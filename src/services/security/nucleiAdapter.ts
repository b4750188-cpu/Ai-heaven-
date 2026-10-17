/**
 * AI HEAVEN - Genuine Upstream Nuclei Scanner Adapter
 * Upstream Reference: https://github.com/projectdiscovery/nuclei
 * License: MIT License
 * 
 * Provides safe, authorized template-based vulnerability scanning.
 * When the binary is absent, truthfully reports NOT_INSTALLED status.
 * When present, runs safe non-destructive template sets with strict scope controls,
 * argument array process spawning, cancellation, and cryptographic evidence hashing.
 */

import { spawn, execSync } from 'child_process';
import crypto from 'crypto';
import dns from 'dns';
import {
  ISecurityScannerAdapter,
  ScanJobRequest,
  ScanJobResult,
  SecurityFinding,
  ToolOperationalState
} from '../../contracts/securityScanner';

export class NucleiAdapter implements ISecurityScannerAdapter {
  public readonly id = 'nuclei' as const;
  public readonly name = 'Nuclei Fast & Customizable Vulnerability Scanner';
  public readonly upstreamUrl = 'https://github.com/projectdiscovery/nuclei';
  public readonly upstreamLicense = 'MIT License (ProjectDiscovery, Inc.)';
  public readonly category = 'TEMPLATE_VULN_SCAN' as const;
  public readonly runtimeRequirement = 'local_binary' as const;
  public status: 'operational' | 'adapter_ready' | 'service_required' = 'service_required';
  public operationalState: ToolOperationalState = 'NOT_INSTALLED';
  public version = '3.3.0';
  private executablePath: string | null = null;
  private activeProcesses: Map<string, { kill: () => void }> = new Map();

  constructor() {
    this.detectExecutable();
  }

  private detectExecutable(): void {
    try {
      const pathBuf = execSync('which nuclei 2>/dev/null', { encoding: 'utf-8' }).trim();
      if (pathBuf && pathBuf.length > 0) {
        this.executablePath = pathBuf;
        try {
          const verOutput = execSync(`${pathBuf} -version 2>&1`, { encoding: 'utf-8', timeout: 3000 });
          const verMatch = verOutput.match(/Nuclei Engine Version: ([0-9.]+)/i) || verOutput.match(/v([0-9.]+)/i);
          if (verMatch) {
            this.version = verMatch[1];
          }
        } catch {
          // Version parse fallback
        }
        this.status = 'operational';
        this.operationalState = 'READY';
      } else {
        this.status = 'service_required';
        this.operationalState = 'NOT_INSTALLED';
      }
    } catch {
      this.status = 'service_required';
      this.operationalState = 'NOT_INSTALLED';
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.executablePath && this.operationalState === 'READY');
  }

  public getDetailedStatus(): { state: ToolOperationalState; version?: string; executablePath?: string; message: string } {
    this.detectExecutable();
    return {
      state: this.operationalState,
      version: this.isAvailable() ? this.version : undefined,
      executablePath: this.executablePath || undefined,
      message: this.isAvailable()
        ? `Genuine Nuclei binary v${this.version} detected at ${this.executablePath}`
        : 'Nuclei binary is NOT_INSTALLED in system PATH. Install via ProjectDiscovery release or go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest.'
    };
  }

  private async validateTarget(target: string, allowedHosts: string[]): Promise<string> {
    const cleanTarget = target.trim();
    if (!cleanTarget) {
      throw new Error('Nuclei validation error: Target cannot be empty.');
    }

    let hostname = cleanTarget;
    if (cleanTarget.startsWith('http://') || cleanTarget.startsWith('https://')) {
      const parsed = new URL(cleanTarget);
      hostname = parsed.hostname;
    }

    const isAllowed = allowedHosts.some(allowed => {
      if (allowed === '*' || allowed === hostname) return true;
      if (allowed.startsWith('*.') && hostname.endsWith(allowed.slice(1))) return true;
      return false;
    });

    if (!isAllowed) {
      throw new Error(`Scope Violation: Target '${hostname}' is outside permitted scope allowlist [${allowedHosts.join(', ')}].`);
    }

    // DNS resolution validation
    const isIP = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(hostname);
    if (!isIP) {
      try {
        await dns.promises.lookup(hostname);
      } catch (err: any) {
        throw new Error(`DNS resolution check failed for target '${hostname}': ${err.message}`);
      }
    }

    return cleanTarget;
  }

  public async executeScan(request: ScanJobRequest): Promise<ScanJobResult> {
    const startTime = Date.now();
    const jobId = `nuclei_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Honest status reporting when binary is unavailable
    if (!this.isAvailable()) {
      return {
        jobId,
        scannerId: this.id,
        scannerVersion: this.version,
        target: request.targetScope.target,
        status: 'failed',
        findingsCount: 0,
        findings: [],
        durationMs: 0,
        summary: 'Nuclei scan aborted: genuine upstream binary is NOT_INSTALLED on this node. Execution honest refusal enforced.',
        evidenceChecksum: 'none',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        cancellationSupported: true,
        executionMode: 'blocked_scope',
        cliBinaryDetected: false
      };
    }

    let validatedTarget: string;
    try {
      validatedTarget = await this.validateTarget(
        request.targetScope.target,
        request.targetScope.allowedHosts
      );
    } catch (err: any) {
      return {
        jobId,
        scannerId: this.id,
        scannerVersion: this.version,
        target: request.targetScope.target,
        status: 'scope_violation',
        findingsCount: 0,
        findings: [],
        durationMs: Date.now() - startTime,
        summary: `Nuclei pre-flight scope validation failed: ${err.message}`,
        evidenceChecksum: 'none',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        cancellationSupported: true,
        executionMode: 'blocked_scope',
        cliBinaryDetected: true
      };
    }

    // Safe default arguments: safe severity levels (info, low, medium)
    const severity = request.parameters?.severity || 'info,low,medium';
    const isIntrusive = Boolean(request.parameters?.intrusive);

    const args: string[] = [
      '-u', validatedTarget,
      '-severity', String(severity),
      '-silent',
      '-json-export', '-',
      '-timeout', '10',
      '-rate-limit', '50'
    ];

    if (!isIntrusive) {
      // Exclude intrusive or destructive templates by default
      args.push('-exclude-tags', 'dos,fuzz,intrusive');
    }

    return new Promise<ScanJobResult>((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let isCancelled = false;

      const child = spawn(this.executablePath!, args, {
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.activeProcesses.set(jobId, {
        kill: () => {
          isCancelled = true;
          try { child.kill('SIGTERM'); } catch {}
        }
      });

      child.stdout.on('data', (chunk) => {
        if (stdoutData.length < 500000) {
          stdoutData += chunk.toString();
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderrData.length < 100000) {
          stderrData += chunk.toString();
        }
      });

      child.on('error', (err) => {
        this.activeProcesses.delete(jobId);
        resolve({
          jobId,
          scannerId: this.id,
          scannerVersion: this.version,
          target: validatedTarget,
          status: 'failed',
          findingsCount: 0,
          findings: [],
          durationMs: Date.now() - startTime,
          summary: `Nuclei process execution error: ${err.message}`,
          evidenceChecksum: 'none',
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          cancellationSupported: true,
          executionMode: 'cli_binary',
          cliBinaryDetected: true
        });
      });

      child.on('close', (code) => {
        this.activeProcesses.delete(jobId);
        const durationMs = Date.now() - startTime;

        if (isCancelled) {
          return resolve({
            jobId,
            scannerId: this.id,
            scannerVersion: this.version,
            target: validatedTarget,
            status: 'cancelled',
            findingsCount: 0,
            findings: [],
            durationMs,
            summary: 'Nuclei scan was cancelled by operator.',
            evidenceChecksum: 'none',
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            cancellationSupported: true,
            executionMode: 'cli_binary',
            cliBinaryDetected: true
          });
        }

        const findings: SecurityFinding[] = [];
        const lines = stdoutData.split('\n').filter(l => l.trim().startsWith('{'));

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const templateId = entry['template-id'] || entry.info?.name || 'unknown-template';
            const sev = (entry.info?.severity || 'info').toUpperCase();
            const findingSeverity: SecurityFinding['severity'] =
              sev === 'CRITICAL' ? 'CRITICAL' :
              sev === 'HIGH' ? 'HIGH' :
              sev === 'MEDIUM' ? 'MEDIUM' :
              sev === 'LOW' ? 'LOW' : 'INFORMATIONAL';

            const evidenceHash = crypto.createHash('sha256').update(line).digest('hex');

            findings.push({
              id: `finding_nuclei_${jobId}_${templateId}`,
              scanJobId: jobId,
              scannerId: this.id,
              scannerVersion: this.version,
              ruleId: templateId,
              cwe: entry.info?.classification?.['cwe-id']?.[0],
              cve: entry.info?.classification?.['cve-id']?.[0],
              target: validatedTarget,
              authorizedScope: request.targetScope.allowedHosts.join(', '),
              title: entry.info?.name || `Nuclei Template: ${templateId}`,
              description: entry.info?.description || `Nuclei template match on ${entry['matched-at'] || validatedTarget}`,
              severity: findingSeverity,
              confidence: 'HIGH',
              status: 'CONFIRMED',
              affectedComponent: entry['matched-at'] || validatedTarget,
              location: {
                url: entry['matched-at'] || validatedTarget
              },
              evidence: {
                hash: evidenceHash,
                rawOutputSnippet: line.slice(0, 500),
                capturedAt: new Date().toISOString()
              },
              remediation: entry.info?.remediation || 'Remediate vulnerability per ProjectDiscovery template advisory guidance.',
              discoveredAt: new Date().toISOString()
            });
          } catch {
            // Non-JSON line
          }
        }

        const summary = `Nuclei v${this.version} scanned ${validatedTarget} in ${durationMs}ms. Detected ${findings.length} findings.`;
        const evidenceChecksum = crypto.createHash('sha256').update(stdoutData).digest('hex');

        resolve({
          jobId,
          scannerId: this.id,
          scannerVersion: this.version,
          target: validatedTarget,
          status: 'completed',
          findingsCount: findings.length,
          findings,
          durationMs,
          summary,
          evidenceChecksum,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          cancellationSupported: true,
          executionMode: 'cli_binary',
          cliBinaryDetected: true
        });
      });
    });
  }

  public async cancelScan(jobId: string): Promise<boolean> {
    const proc = this.activeProcesses.get(jobId);
    if (proc) {
      proc.kill();
      this.activeProcesses.delete(jobId);
      return true;
    }
    return false;
  }
}
