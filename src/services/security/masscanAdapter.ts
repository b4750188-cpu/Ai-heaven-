/**
 * AI HEAVEN - Genuine Upstream Masscan Scanner Adapter
 * Upstream Reference: https://github.com/robertdavidgraham/masscan
 * License: AGPLv3
 * 
 * Provides safe, authorized high-speed port discovery with conservative rate limits,
 * strict target allowlisting, argument array process spawning, cancellation,
 * and cryptographic evidence hashing.
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

export class MasscanAdapter implements ISecurityScannerAdapter {
  public readonly id = 'masscan' as const;
  public readonly name = 'Masscan High-Speed TCP Port Discovery';
  public readonly upstreamUrl = 'https://github.com/robertdavidgraham/masscan';
  public readonly upstreamLicense = 'AGPLv3';
  public readonly category = 'HIGH_SPEED_DISCOVERY' as const;
  public readonly runtimeRequirement = 'local_binary' as const;
  public status: 'operational' | 'adapter_ready' | 'service_required' = 'service_required';
  public operationalState: ToolOperationalState = 'NOT_VERIFIED';
  public version = '1.3.2';
  private executablePath: string | null = null;
  private activeProcesses: Map<string, { kill: () => void }> = new Map();

  constructor() {
    this.detectExecutable();
  }

  private detectExecutable(): void {
    try {
      const pathBuf = execSync('which masscan 2>/dev/null', { encoding: 'utf-8' }).trim();
      if (pathBuf && pathBuf.length > 0) {
        this.executablePath = pathBuf;
        try {
          const verOutput = execSync(`${pathBuf} --version 2>&1`, { encoding: 'utf-8', timeout: 3000 });
          const verMatch = verOutput.match(/Masscan version ([0-9.]+)/i);
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
      version: this.version,
      executablePath: this.executablePath || undefined,
      message: this.isAvailable()
        ? `Genuine Masscan binary v${this.version} detected at ${this.executablePath}`
        : 'Masscan binary not installed or not found in system PATH'
    };
  }

  private async validateTarget(target: string, allowedHosts: string[]): Promise<string> {
    const cleanTarget = target.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].trim();
    if (!cleanTarget) {
      throw new Error('Masscan validation error: Target cannot be empty.');
    }

    // Disallow global internet scan ranges
    if (cleanTarget === '0.0.0.0' || cleanTarget.includes('/0')) {
      throw new Error('Safety Barrier: Broad-scope 0.0.0.0/0 scanning is strictly forbidden.');
    }

    const isAllowed = allowedHosts.some(allowed => {
      if (allowed === '*' || allowed === cleanTarget) return true;
      if (allowed.startsWith('*.') && cleanTarget.endsWith(allowed.slice(1))) return true;
      return false;
    });

    if (!isAllowed) {
      throw new Error(`Scope Violation: Target '${cleanTarget}' is not in permitted scope allowlist [${allowedHosts.join(', ')}].`);
    }

    const isIP = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(cleanTarget);
    if (!isIP) {
      try {
        const resolved = await dns.promises.lookup(cleanTarget);
        if (!resolved?.address) {
          throw new Error(`DNS resolution failed for target '${cleanTarget}'`);
        }
        return resolved.address;
      } catch (err: any) {
        throw new Error(`DNS resolution check failed for target '${cleanTarget}': ${err.message}`);
      }
    }

    return cleanTarget;
  }

  public async executeScan(request: ScanJobRequest): Promise<ScanJobResult> {
    const startTime = Date.now();
    const jobId = `masscan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

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
        summary: 'Masscan scan cannot execute: genuine upstream binary is NOT_INSTALLED.',
        evidenceChecksum: 'none',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        cancellationSupported: true,
        executionMode: 'blocked_scope',
        cliBinaryDetected: false
      };
    }

    let targetIp: string;
    try {
      targetIp = await this.validateTarget(
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
        summary: `Masscan pre-flight scope validation failed: ${err.message}`,
        evidenceChecksum: 'none',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        cancellationSupported: true,
        executionMode: 'blocked_scope'
      };
    }

    // Enforce conservative rate limits: default 100 packets/sec (never exceed 500)
    const userRate = parseInt(String(request.parameters?.rate || 100), 10);
    const safeRate = Math.min(Math.max(userRate || 100, 10), 500);
    const ports = request.parameters?.ports || '80,443,3000,8080';

    const args: string[] = [
      targetIp,
      '-p', String(ports),
      '--rate', String(safeRate),
      '--wait', '2'
    ];

    return new Promise<ScanJobResult>((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let isCancelled = false;

      const child = spawn(this.executablePath!, args, {
        timeout: 25000,
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
          target: targetIp,
          status: 'failed',
          findingsCount: 0,
          findings: [],
          durationMs: Date.now() - startTime,
          summary: `Masscan execution error: ${err.message}`,
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
            target: targetIp,
            status: 'cancelled',
            findingsCount: 0,
            findings: [],
            durationMs,
            summary: 'Masscan scan was aborted by operator or kill switch.',
            evidenceChecksum: 'none',
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            cancellationSupported: true,
            executionMode: 'cli_binary',
            cliBinaryDetected: true
          });
        }

        const combinedOutput = stdoutData + '\n' + stderrData;
        const findings: SecurityFinding[] = [];
        const portMatches = combinedOutput.split('\n').filter(line => line.includes('Discovered open port'));

        for (const line of portMatches) {
          const match = line.match(/Discovered open port ([0-9]+)\/([a-z]+) on ([0-9.]+)/i);
          if (match) {
            const portNum = match[1];
            const protocol = match[2];
            const ip = match[3];

            const evidenceHash = crypto.createHash('sha256').update(`${ip}:${portNum}:${line}`).digest('hex');

            findings.push({
              id: `finding_masscan_${jobId}_${portNum}`,
              scanJobId: jobId,
              scannerId: this.id,
              scannerVersion: this.version,
              ruleId: `masscan-open-${portNum}`,
              target: targetIp,
              authorizedScope: request.targetScope.allowedHosts.join(', '),
              title: `High-Speed Port Discovery: ${portNum}/${protocol} Open`,
              description: `Masscan detected open port ${portNum} on ${ip} at rate ${safeRate} pps.`,
              severity: (portNum === '22' || portNum === '3389' || portNum === '23') ? 'MEDIUM' : 'INFORMATIONAL',
              confidence: 'HIGH',
              status: 'CONFIRMED',
              affectedComponent: `port/${portNum}`,
              location: {
                url: `${targetIp}:${portNum}`,
                path: `network://${targetIp}:${portNum}`
              },
              evidence: {
                hash: evidenceHash,
                rawOutputSnippet: line.trim(),
                capturedAt: new Date().toISOString()
              },
              remediation: 'Verify that this open port is intended for public inbound access.',
              discoveredAt: new Date().toISOString()
            });
          }
        }

        const summary = `Masscan v${this.version} scanned ${targetIp} at ${safeRate} pps in ${durationMs}ms. Found ${findings.length} open ports.`;
        const evidenceChecksum = crypto.createHash('sha256').update(combinedOutput).digest('hex');

        resolve({
          jobId,
          scannerId: this.id,
          scannerVersion: this.version,
          target: targetIp,
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
