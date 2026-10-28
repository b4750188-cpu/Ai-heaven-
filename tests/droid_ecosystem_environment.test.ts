/**
 * AI HEAVEN - Interconnected Droid Ecosystem & Real Environment Discovery Tests
 * Tests multi-droid identities, authorized inter-droid messaging, persistent memory,
 * strict tenant isolation, evidence-backed capability discovery, and REST endpoints.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/api/app';
import { droidEcosystemService } from '../src/services/droid/droidEcosystemService';
import { environmentDiscoveryService } from '../src/services/environment/environmentDiscoveryService';

async function mockRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: Record<string, any>; body: any }> {
  const { createServer } = await import('node:http');

  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const address = server.address() as any;
      const port = address.port;
      const url = `http://127.0.0.1:${port}${path}`;

      const fetchHeaders: Record<string, string> = {
        'Accept': 'application/json',
        ...headers
      };
      if (body) {
        fetchHeaders['Content-Type'] = 'application/json';
      }

      fetch(url, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined
      })
        .then(async res => {
          const text = await res.text();
          let json: any;
          try {
            json = JSON.parse(text);
          } catch {
            json = text;
          }
          server.close();
          resolve({
            status: res.status,
            headers: Object.fromEntries(res.headers.entries()),
            body: json
          });
        })
        .catch(err => {
          server.close();
          reject(err);
        });
    });
  });
}

describe('AI Heaven - Interconnected Droid Ecosystem & Environment Tests', () => {

  describe('1. Real Environment Discovery & Health Monitoring', () => {
    it('discovers genuine system runtime without fabricated values', async () => {
      const report = await environmentDiscoveryService.getDiscoveryReport(true);
      
      assert.ok(report.timestamp, 'Report must contain ISO timestamp');
      assert.ok(report.runtime.nodeVersion.startsWith('v'), 'Must report real Node version');
      assert.ok(report.runtime.pid > 0, 'Must report genuine process PID');
      assert.ok(['linux', 'darwin', 'win32'].includes(report.runtime.platform), 'Platform must be valid OS');
      assert.ok(report.runtime.memory.rssMb > 0, 'RSS memory must be positive number');
      assert.ok(report.runtime.cpuCount >= 1, 'Must report at least 1 CPU core');
    });

    it('verifies Node.js >= 22 requirement for Capacitor 8 Android builds', async () => {
      const report = await environmentDiscoveryService.getDiscoveryReport(true);
      const major = parseInt(process.versions.node.split('.')[0], 10);

      assert.strictEqual(
        report.android.verifiedNodeMeetsRequirement,
        major >= 22,
        `Node ${major} compliance check must match reality`
      );
      assert.strictEqual(report.android.appId, 'org.aiheaven.app');
      assert.strictEqual(report.android.appName, 'AI Heaven');
    });

    it('reports capability matrix with evidence strings and honest constraints', async () => {
      const report = await environmentDiscoveryService.getDiscoveryReport(true);
      assert.ok(Array.isArray(report.capabilityMatrix), 'Capability matrix must be an array');
      assert.ok(report.capabilityMatrix.length >= 5, 'Must report at least 5 verified capabilities');

      const gpuCap = report.capabilityMatrix.find(c => c.capability.includes('GPU'));
      assert.ok(gpuCap, 'Should include GPU capability check');
      assert.strictEqual(gpuCap?.status, 'restricted', 'Bare metal GPU must be restricted in container sandbox');

      const droidCap = report.capabilityMatrix.find(c => c.capability.includes('Droid Messaging'));
      assert.ok(droidCap, 'Should include Droid Messaging capability');
      assert.strictEqual(droidCap?.status, 'verified_active');
    });

    it('reports accurate database persistence mode and storage path', async () => {
      const report = await environmentDiscoveryService.getDiscoveryReport(true);
      assert.ok(['postgresql', 'authoritative_local_store'].includes(report.database.mode));
      assert.ok(report.database.persistentStoragePath.includes('.data'));
    });
  });

  describe('2. Interconnected Droid Identity, Status & Tool Permissions', () => {
    it('registers all 9 core security & orchestration droids', () => {
      const droids = droidEcosystemService.listDroids();
      assert.ok(droids.length >= 9, 'Must have at least 9 droids registered');

      const expectedIds = [
        'central_brain_00',
        'argus_01',
        'hydra_02',
        'aegis_03',
        'vulcan_04',
        'specter_05',
        'cerberus_06',
        'daedalus_07',
        'athena_08'
      ];

      for (const id of expectedIds) {
        const droid = droidEcosystemService.getDroid(id);
        assert.ok(droid, `Droid '${id}' must be registered`);
        assert.ok(droid.codename, `Droid '${id}' must have codename`);
        assert.ok(droid.capabilities.length > 0, `Droid '${id}' must have capabilities`);
        assert.ok(droid.allowedTools.length > 0, `Droid '${id}' must have whitelisted tools`);
        assert.ok(droid.permissions.allowedMessageChannels.length > 0, `Droid '${id}' must have allowed channels`);
      }
    });

    it('enforces least-privilege tool isolation per droid identity', () => {
      const cerberus = droidEcosystemService.getDroid('cerberus_06');
      assert.ok(cerberus?.allowedTools.includes('tool_sha256_hasher'), 'Cerberus must have SHA-256 hasher tool');
      assert.ok(!cerberus?.allowedTools.includes('tool_git_dumper'), 'Cerberus must NOT have Specter tools');

      const daedalus = droidEcosystemService.getDroid('daedalus_07');
      assert.strictEqual(daedalus?.permissions.networkAccess, false, 'Daedalus patch forge must have zero network access');
    });
  });

  describe('3. Authenticated Inter-Droid Messaging Bus', () => {
    it('transmits messages between authorized droids with cryptographic HMAC seal', () => {
      const result = droidEcosystemService.sendMessage({
        fromDroidId: 'argus_01',
        toDroidId: 'hydra_02',
        channel: 'coordination',
        messageType: 'task_coordination',
        subject: 'Identified REST endpoints for BOLA inspection',
        payload: { endpoints: ['/api/user/profile', '/api/wallet/balance'] },
        requiresAck: true
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.message, 'Must return created message');
      assert.ok(result.message?.signature, 'Must have HMAC-SHA256 signature');
      assert.strictEqual(result.message?.acknowledged, true, 'Direct message must be acknowledged');
      assert.strictEqual(result.message?.acknowledgedBy, 'hydra_02');

      const isValidSig = droidEcosystemService.verifyMessageSignature(result.message!);
      assert.strictEqual(isValidSig, true, 'Cryptographic signature must verify');
    });

    it('rejects message transmission when sender droid lacks channel permission', () => {
      const result = droidEcosystemService.sendMessage({
        fromDroidId: 'daedalus_07', // only has 'remediation', 'findings', 'coordination'
        toDroidId: 'argus_01',
        channel: 'recon', // daedalus is NOT permitted on 'recon' channel
        messageType: 'status_sync',
        subject: 'Unauthorized transmission attempt',
        payload: {}
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('not authorized to transmit on channel'));
    });

    it('rejects messages involving non-existent droids', () => {
      const result = droidEcosystemService.sendMessage({
        fromDroidId: 'fake_droid_999',
        toDroidId: 'argus_01',
        channel: 'recon',
        messageType: 'status_sync',
        subject: 'Spoofed sender',
        payload: {}
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('is not registered'));
    });

    it('triggers Cerberus-06 independent verification and SHA-256 seal when findings are shared', () => {
      const result = droidEcosystemService.sendMessage({
        fromDroidId: 'vulcan_04',
        toDroidId: 'cerberus_06',
        channel: 'findings',
        messageType: 'finding_share',
        subject: 'Time-based blind SQLi anomaly in /api/reports',
        payload: {
          target: 'https://ai.google.dev/api/reports',
          title: 'Blind SQLi in report export parameter',
          severity: 'HIGH',
          cvssScore: 8.2
        }
      });

      assert.strictEqual(result.success, true);

      const findings = droidEcosystemService.listSharedFindings();
      const verified = findings.find(f => f.title === 'Blind SQLi in report export parameter');
      assert.ok(verified, 'Finding must be recorded in shared findings registry');
      assert.strictEqual(verified?.verifiedByDroidId, 'cerberus_06');
      assert.strictEqual(verified?.status, 'verified');
      assert.ok(verified?.evidenceHash, 'Must generate SHA-256 evidence seal');
    });
  });

  describe('4. Scoped Droid Memory & Strict Tenant Isolation', () => {
    it('stores and retrieves droid memory within a tenant partition', () => {
      const tenantA = 'tenant_company_alpha';
      const testKey = `recon_cache_${Date.now()}`;
      const result = droidEcosystemService.setMemory({
        tenantId: tenantA,
        droidId: 'argus_01',
        key: testKey,
        value: { subdomains: ['api.alpha.com', 'admin.alpha.com'] },
        sensitivity: 'confidential',
        tags: ['dns', 'surface']
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.entry.version, 1);

      const retrieved = droidEcosystemService.getMemory(tenantA, 'argus_01', testKey);
      assert.ok(retrieved);
      assert.deepStrictEqual((retrieved?.value as any).subdomains, ['api.alpha.com', 'admin.alpha.com']);
    });

    it('strictly isolates tenant memory: Tenant B cannot access Tenant A data', () => {
      const tenantA = 'tenant_company_alpha';
      const tenantB = 'tenant_company_beta';

      // Tenant A stores private secret recon data
      droidEcosystemService.setMemory({
        tenantId: tenantA,
        droidId: 'specter_05',
        key: 'leaked_internal_token_secret',
        value: { token: 'alpha_secret_token_9988' },
        sensitivity: 'restricted'
      });

      // Tenant B tries to query Tenant A's key
      const leakAttempt = droidEcosystemService.getMemory(tenantB, 'specter_05', 'leaked_internal_token_secret');
      assert.strictEqual(leakAttempt, null, 'Tenant B MUST NOT access Tenant A droid memory');

      // Tenant B lists all memories: must not contain any Tenant A entries
      const tenantBMemories = droidEcosystemService.listMemories(tenantB);
      const containsAlphaToken = tenantBMemories.some(m => JSON.stringify(m).includes('alpha_secret_token_9988'));
      assert.strictEqual(containsAlphaToken, false, 'Tenant B memory list must never leak Tenant A memories');
    });
  });

  describe('5. Task Coordination & Dependency Awareness', () => {
    it('assigns task to droid and tracks progress to completion', () => {
      const assignRes = droidEcosystemService.assignTask('argus_01', {
        title: 'Map wildcard TLS certificates for target program'
      });
      assert.strictEqual(assignRes.success, true);
      assert.strictEqual(assignRes.task?.status, 'in_progress');

      const droid = droidEcosystemService.getDroid('argus_01');
      assert.strictEqual(droid?.status, 'running');

      // Update progress
      droidEcosystemService.updateTaskProgress('argus_01', 50);
      assert.strictEqual(droid?.currentTask?.progress, 50);

      // Complete task
      droidEcosystemService.updateTaskProgress('argus_01', 100);
      assert.strictEqual(droid?.status, 'idle');
      assert.strictEqual(droid?.currentTask?.status, 'completed');
    });

    it('sets task to blocked when dependent droid is currently running', () => {
      // Set dependency droid to running
      droidEcosystemService.assignTask('vulcan_04', { title: 'Executing deep fuzzing' });

      // Cerberus depends on vulcan_04
      const result = droidEcosystemService.assignTask('cerberus_06', {
        title: 'Verify Vulcan PoC traces',
        dependsOnDroidId: 'vulcan_04'
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.task?.status, 'blocked');
      assert.strictEqual(result.task?.dependsOnDroidId, 'vulcan_04');
    });
  });

  describe('6. REST Endpoints for Ecosystem & Environment', () => {
    it('GET /api/environment/discovery returns 200 with runtime and capability matrix', async () => {
      const res = await mockRequest('GET', '/api/environment/discovery');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.runtime);
      assert.ok(res.body.deployment);
      assert.ok(res.body.database);
      assert.ok(Array.isArray(res.body.capabilityMatrix));
    });

    it('GET /api/droids/ecosystem returns full snapshot with droids, tasks, and messages', async () => {
      const res = await mockRequest('GET', '/api/droids/ecosystem');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.droids));
      assert.ok(res.body.droids.length >= 9);
      assert.ok(Array.isArray(res.body.recentMessages));
    });

    it('POST /api/droids/message transmits and returns message receipt', async () => {
      const res = await mockRequest('POST', '/api/droids/message', {}, {
        fromDroidId: 'hydra_02',
        toDroidId: 'cerberus_06',
        channel: 'findings',
        messageType: 'finding_share',
        subject: 'BOLA bypass in endpoint /api/user/settings',
        payload: { target: 'https://ai.google.dev/api/user/settings', title: 'BOLA parameter pollution', severity: 'MEDIUM' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message.signature);
    });

    it('GET /api/droids/:droidId returns 404 for unknown droid', async () => {
      const res = await mockRequest('GET', '/api/droids/non_existent_droid_123');
      assert.strictEqual(res.status, 404);
    });
  });

});
