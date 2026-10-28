/**
 * AI HEAVEN - SOURCE: Collective Knowledge Pool & Droid Family System Tests
 * Tests epistemic verification guards, secret redaction, deduplication,
 * Graphiti relationships, strict multi-tenant isolation, and inter-droid communication.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/api/app';
import { sourceKnowledgeService } from '../src/services/source/sourceKnowledgeService';
import { droidFamilyService } from '../src/services/family/droidFamilyService';
import { knowledgeSanitizer } from '../src/services/source/knowledgeSanitizer';

// Native HTTP mock request helper
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

describe('AI Heaven - SOURCE Collective Knowledge & Droid Family Tests', () => {

  describe('1. Secret Redaction & Epistemic Speculation Guard', () => {
    it('redacts sensitive API keys and secrets before saving', () => {
      const raw = 'Configured upstream AIzaSyB1234567890abcdef1234567890abcdef with sk-proj123456789012345678901234';
      const result = knowledgeSanitizer.sanitize('Test Config', raw, 'UNVERIFIED');

      assert.strictEqual(result.isClean, false);
      assert.ok(result.secretsDetected.length >= 1, 'Must detect at least 1 secret');
      assert.ok(!result.redactedContent.includes('AIzaSyB'), 'Must redact Google API key');
      assert.ok(result.redactedContent.includes('[REDACTED_SECRET]'));
    });

    it('demotes unverified claims with speculative language from VERIFIED to INFERRED', () => {
      const speculative = 'Maybe the server fails because we guess the port is closed. Anecdotal report.';
      const result = knowledgeSanitizer.sanitize('Port Guess', speculative, 'VERIFIED');

      assert.strictEqual(result.adjustedStatus, 'INFERRED', 'Speculation must be demoted to INFERRED');
      assert.ok(result.warnings.some(w => w.includes('speculative language')));
    });

    it('demotes claims marked VERIFIED without proof to UNVERIFIED', () => {
      const assertionWithoutProof = 'Database timeout occurs after exactly 3000ms';
      const result = knowledgeSanitizer.sanitize('DB Timeout', assertionWithoutProof, 'VERIFIED', []);

      assert.strictEqual(result.adjustedStatus, 'UNVERIFIED', 'Unbacked claim must be demoted to UNVERIFIED');
      assert.ok(result.warnings.some(w => w.includes('without verifiable evidence')));
    });
  });

  describe('2. Knowledge Contribution, Deduplication & Retrieval', () => {
    const familyA = `fam_test_contribute_${Date.now()}`;
    const tenantA = `tenant_test_${Date.now()}`;

    it('contributes a verified solution procedure with evidence and SHA-256 seal', () => {
      const res = sourceKnowledgeService.contributeKnowledge({
        familyId: familyA,
        tenantId: tenantA,
        title: 'Safe Database Connection Pool Teardown',
        content: 'Always invoke pool.end() inside afterEach hooks to avoid leaked TCP sockets.',
        category: 'solution_procedure',
        requestedStatus: 'VERIFIED',
        contributor: { type: 'droid', id: 'cerberus_06', name: 'Cerberus-06' },
        tags: ['postgres', 'connection_pool', 'teardown'],
        evidence: [
          {
            id: 'ev_1',
            evidenceType: 'test_result',
            snippet: 'Zero open sockets detected post test completion across 240 test suites.',
            sha256Seal: 'a'.repeat(64)
          }
        ]
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.entry.verificationStatus, 'VERIFIED');
      assert.strictEqual(res.entry.versions.length, 1);
      assert.ok(res.entry.evidence[0].sha256Seal);
    });

    it('detects near-identical duplicates and returns existing entry without creating duplicates', () => {
      const duplicateRes = sourceKnowledgeService.contributeKnowledge({
        familyId: familyA,
        tenantId: tenantA,
        title: 'Safe Database Connection Pool Teardown',
        content: 'Always invoke pool.end() inside afterEach hooks to avoid leaked TCP sockets.',
        category: 'solution_procedure',
        contributor: { type: 'droid', id: 'vulcan_04', name: 'Vulcan-04' }
      });

      assert.strictEqual(duplicateRes.success, true);
      assert.strictEqual(duplicateRes.isDuplicate, true, 'Must detect duplicate entry');
      assert.ok(duplicateRes.warnings[0].includes('Knowledge already exists'));
    });

    it('searches knowledge pool using keyword, category, and status filters', () => {
      const searchRes = sourceKnowledgeService.searchKnowledge({
        familyId: familyA,
        query: 'sockets teardown',
        category: 'solution_procedure',
        verificationStatus: 'VERIFIED'
      });

      assert.ok(searchRes.entries.length >= 1);
      assert.strictEqual(searchRes.entries[0].title, 'Safe Database Connection Pool Teardown');
      assert.ok(searchRes.facets.byCategory['solution_procedure'] >= 1);
    });
  });

  describe('3. Graphiti Knowledge Graph Relationships', () => {
    const familyRel = `fam_rel_test_${Date.now()}`;
    const tenantRel = `tenant_rel_${Date.now()}`;

    it('links knowledge entries with SUPPORTS, REFUTES, and SUPERSEDES relations', () => {
      // Entry 1: Initial claim
      const e1 = sourceKnowledgeService.contributeKnowledge({
        familyId: familyRel,
        tenantId: tenantRel,
        title: 'Initial API Rate Limit is 100 req/s',
        content: 'Documented rate limit appears to be 100 requests per second based on legacy header.',
        category: 'research_discovery',
        contributor: { type: 'droid', id: 'argus_01', name: 'Argus-01' }
      }).entry;

      // Entry 2: Newer empirical proof that supersedes Entry 1
      const e2 = sourceKnowledgeService.contributeKnowledge({
        familyId: familyRel,
        tenantId: tenantRel,
        title: 'Empirical API Rate Limit is 250 req/s with Burst Allowance',
        content: 'Fuzzing verified that token-bucket refill allows up to 250 req/s with 500 burst.',
        category: 'solution_procedure',
        contributor: { type: 'droid', id: 'hydra_02', name: 'Hydra-02' }
      }).entry;

      // Link e2 SUPERSEDES e1
      const relRes = sourceKnowledgeService.addRelationship({
        familyId: familyRel,
        sourceEntryId: e2.id,
        targetEntryId: e1.id,
        relationType: 'SUPERSEDES',
        rationale: 'Empirical load test invalidated legacy header claim'
      });

      assert.strictEqual(relRes.success, true);

      // Verify e1 is now marked OUTDATED and points to e2
      const updatedE1 = sourceKnowledgeService.getEntry(familyRel, e1.id);
      assert.strictEqual(updatedE1?.verificationStatus, 'OUTDATED');
      assert.strictEqual(updatedE1?.supersededByEntryId, e2.id);

      // Verify e2 records relationship
      const updatedE2 = sourceKnowledgeService.getEntry(familyRel, e2.id);
      assert.strictEqual(updatedE2?.relationships[0].relationType, 'SUPERSEDES');
    });

    it('marks target entry as DISPUTED when relation is REFUTES', () => {
      const e1 = sourceKnowledgeService.contributeKnowledge({
        familyId: familyRel,
        tenantId: tenantRel,
        title: 'Claim: All endpoints support Bearer auth',
        content: 'All endpoints accept Bearer tokens without exception.',
        category: 'research_discovery',
        contributor: { type: 'droid', id: 'aegis_03', name: 'Aegis-03' }
      }).entry;

      const e2 = sourceKnowledgeService.contributeKnowledge({
        familyId: familyRel,
        tenantId: tenantRel,
        title: 'Dispute: /health rejects Authorization header',
        content: 'Health endpoint requires anonymous access and returns 400 when auth is provided.',
        category: 'correction_verification',
        contributor: { type: 'droid', id: 'cerberus_06', name: 'Cerberus-06' }
      }).entry;

      sourceKnowledgeService.addRelationship({
        familyId: familyRel,
        sourceEntryId: e2.id,
        targetEntryId: e1.id,
        relationType: 'REFUTES',
        rationale: 'Empirical test proves health endpoint rejects auth headers'
      });

      const updatedE1 = sourceKnowledgeService.getEntry(familyRel, e1.id);
      assert.strictEqual(updatedE1?.verificationStatus, 'DISPUTED');
    });
  });

  describe('4. Separate Droid Family & Strict Multi-Tenant Isolation', () => {
    const userA = { id: `user_alpha_${Date.now()}`, email: 'alice@google.corp', fullName: 'Alice Google' };
    const userB = { id: `user_beta_${Date.now()}`, email: 'bob@google.corp', fullName: 'Bob Google' };

    it('provisions unique, idempotent Droid Families for separate user accounts', () => {
      const familyA = droidFamilyService.getOrCreateFamily(userA);
      const familyB = droidFamilyService.getOrCreateFamily(userB);

      assert.notStrictEqual(familyA.familyId, familyB.familyId, 'Families must have distinct IDs');
      assert.strictEqual(familyA.ownerUserId, userA.id);
      assert.strictEqual(familyB.ownerUserId, userB.id);

      // Verify idempotent recovery
      const restoredA = droidFamilyService.getOrCreateFamily(userA);
      assert.strictEqual(restoredA.familyId, familyA.familyId, 'Subsequent login must restore same family');
    });

    it('strictly isolates SOURCE knowledge pools: User B cannot retrieve User A data', () => {
      const familyA = droidFamilyService.getOrCreateFamily(userA);
      const familyB = droidFamilyService.getOrCreateFamily(userB);

      // User A writes confidential knowledge
      const privateEntryA = sourceKnowledgeService.contributeKnowledge({
        familyId: familyA.familyId,
        tenantId: familyA.tenantId,
        title: 'Alice Highly Confidential Finding',
        content: 'Secret algorithmic heuristic for quantum optimization.',
        category: 'research_discovery',
        contributor: { type: 'user', id: userA.id, name: userA.fullName }
      }).entry;

      // User B attempts to search User A's pool
      const bSearch = sourceKnowledgeService.searchKnowledge({
        familyId: familyB.familyId,
        query: 'algorithmic heuristic'
      });
      assert.strictEqual(bSearch.entries.length, 0, 'User B search must NOT return User A knowledge');

      // User B attempts direct retrieval by ID
      const bDirectGet = sourceKnowledgeService.getEntry(familyB.familyId, privateEntryA.id);
      assert.strictEqual(bDirectGet, null, 'User B direct get of User A entry must return null (access denied)');
    });
  });

  describe('5. Inter-Droid Family Communications & Loop Protection', () => {
    const userComm = { id: `user_comm_${Date.now()}`, email: 'comm@aiheaven.org', fullName: 'Comm Lead' };
    const family = droidFamilyService.getOrCreateFamily(userComm);

    it('supports peer droid inquiries with automated peer responses', () => {
      const res = droidFamilyService.sendFamilyMessage({
        familyId: family.familyId,
        fromDroidId: 'argus_01',
        toDroidId: 'hydra_02',
        messageType: 'status_query',
        subject: 'Querying Hydra current objective and status',
        payload: { query: 'status' }
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.message);
      assert.strictEqual(res.message?.acknowledged, true);

      // Check that peer response was automatically appended to message log
      const messages = droidFamilyService.getFamilyMessages(family.familyId);
      const response = messages.find(m => m.fromDroidId === 'hydra_02' && m.messageType === 'peer_response');
      assert.ok(response, 'Peer droid must automatically respond to status inquiry');
      assert.ok(response?.payload.allowedTools);
    });

    it('prevents infinite delegation loops by enforcing maximum delegation depth', () => {
      const correlationId = `cycle_${Date.now()}`;

      // Simulate 5 chained delegations
      for (let i = 0; i < 5; i++) {
        const step = droidFamilyService.sendFamilyMessage({
          familyId: family.familyId,
          fromDroidId: i % 2 === 0 ? 'vulcan_04' : 'cerberus_06',
          toDroidId: i % 2 === 0 ? 'cerberus_06' : 'vulcan_04',
          messageType: 'task_delegation',
          subject: `Chained delegation step ${i + 1}`,
          payload: { depth: i + 1 },
          correlationId
        });
        assert.strictEqual(step.success, true);
      }

      // 6th delegation should be blocked by loop protection
      const blocked = droidFamilyService.sendFamilyMessage({
        familyId: family.familyId,
        fromDroidId: 'vulcan_04',
        toDroidId: 'cerberus_06',
        messageType: 'task_delegation',
        subject: 'Excessive delegation attempt',
        payload: { depth: 6 },
        correlationId
      });

      assert.strictEqual(blocked.success, false);
      assert.ok(blocked.error?.includes('Delegation loop detected'));
    });
  });

  describe('6. SOURCE REST API Endpoints', () => {
    it('GET /api/source/pool returns family-scoped knowledge entries with facets', async () => {
      const res = await mockRequest('GET', '/api/source/pool');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.familyId);
      assert.ok(Array.isArray(res.body.entries));
      assert.ok(res.body.facets);
    });

    it('POST /api/source/entries creates sanitized knowledge entry and returns 201', async () => {
      const res = await mockRequest('POST', '/api/source/entries', {}, {
        title: 'REST Endpoint Verification Procedure',
        content: 'Validate HTTP status codes and headers in automated testing without third-party mocks.',
        category: 'solution_procedure',
        requestedStatus: 'UNVERIFIED',
        tags: ['rest', 'api', 'testing']
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.entry.title, 'REST Endpoint Verification Procedure');
    });

    it('GET /api/family/current returns user family with 9 droids and Central Brain context', async () => {
      const res = await mockRequest('GET', '/api/family/current');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.familyId);
      assert.strictEqual(res.body.members.length, 9);
      assert.ok(res.body.centralBrainContext);
    });

    it('POST /api/family/messages dispatches inter-droid signal and returns 200', async () => {
      const res = await mockRequest('POST', '/api/family/messages', {}, {
        fromDroidId: 'argus_01',
        toDroidId: 'vulcan_04',
        messageType: 'tool_inquiry',
        subject: 'Can you probe endpoint /api/login for injection vulnerabilities?',
        payload: { target: '/api/login' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message.id);
    });
  });

});
