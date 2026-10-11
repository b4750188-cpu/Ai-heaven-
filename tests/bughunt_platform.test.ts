/**
 * AI HEAVEN - Core Autonomous Bug-Bounty Platform, Authentication, & Workspace Test Suite
 * 
 * Verifies:
 * 1. Multi-provider authentication (Google, GitHub, PBKDF2 Email/Password, provider status auditing)
 * 2. User account registration, session token validation, and account switching
 * 3. Strict tenant isolation across user workspaces, bug hunts, and vulnerability findings
 * 4. 1-Click Autonomous Bug Hunt flow with Continuity Engine constraint loading
 * 5. Coordinated 6 specialized security droids (Argus, Hydra, Aegis, Vulcan, Specter, Cerberus)
 * 6. Program scope authorization enforcement and out-of-scope target rejection
 * 7. Independent verification with cryptographic SHA-256 evidence seals
 * 8. End-to-end REST API route integration and security checks
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/auth/authService';
import { bugHuntService } from '../src/services/bughunt/bugHuntService';
import { app } from '../src/api/app';

// Helper to simulate HTTP requests against Express app
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

describe('PART 1/6: CORE AUTONOMOUS BUG-HUNTING PLATFORM & AUTHENTICATION', () => {

  // =========================================================================
  // 1. AUTHENTICATION & MULTI-PROVIDER SYSTEM
  // =========================================================================
  describe('1. Authentication & Multi-Provider Verification', () => {
    it('accurately audits and reports connection status for all identity providers without false claims', () => {
      const statuses = authService.getProviderStatuses();
      assert.ok(statuses.length >= 5, 'Must report at least 5 providers');

      const local = statuses.find(p => p.provider === 'local');
      assert.ok(local?.isConfigured, 'Local PBKDF2 must be configured');
      assert.ok(local?.isEnabled, 'Local PBKDF2 must be enabled');

      const google = statuses.find(p => p.provider === 'google');
      assert.ok(google, 'Google provider must be registered');
      // Google setup instructions must be present
      assert.ok(google.setupInstructions.length > 0);

      const github = statuses.find(p => p.provider === 'github');
      assert.ok(github, 'GitHub provider must be registered');

      const ms = statuses.find(p => p.provider === 'microsoft');
      assert.ok(ms, 'Microsoft provider must be registered');
      assert.strictEqual(ms.isEnabled, false, 'Unconfigured Microsoft provider must not claim enabled status');

      const apple = statuses.find(p => p.provider === 'apple');
      assert.ok(apple, 'Apple provider must be registered');
      assert.strictEqual(apple.isEnabled, false, 'Unconfigured Apple provider must not claim enabled status');
    });

    it('enforces PBKDF2 password hashing with SHA-512 and salt', () => {
      const password = 'TestResearcherPassword2026!';
      const salt = 'abcdef1234567890abcdef1234567890';
      const hash1 = authService.hashPassword(password, salt);
      const hash2 = authService.hashPassword(password, salt);

      assert.strictEqual(hash1, hash2, 'Identical password and salt must produce deterministic hash');
      assert.strictEqual(hash1.length, 128, 'SHA-512 in hex must produce 128 character hash');
      assert.ok(authService.verifyPassword(password, hash1, salt), 'Password must verify against hash');
      assert.ok(!authService.verifyPassword('WrongPassword!', hash1, salt), 'Wrong password must fail verification');
    });

    it('registers new researcher user, creates session, and assigns unique tenant ID', () => {
      const testEmail = `bounty_hunter_${Date.now()}@security.org`;
      const session = authService.register(testEmail, 'SecureHunterPass123!', 'Hunter Fox');

      assert.ok(session.accessToken.startsWith('aih_sess_'), 'Token must follow session convention');
      assert.strictEqual(session.user.email, testEmail);
      assert.strictEqual(session.user.fullName, 'Hunter Fox');
      assert.ok(session.user.tenantId.startsWith('tenant_'), 'Must generate unique tenant ID');
      assert.strictEqual(session.user.role, 'security_researcher');

      // Verify token lookup
      const verified = authService.verifyToken(session.accessToken);
      assert.ok(verified, 'Session token must verify successfully');
      assert.strictEqual(verified.id, session.user.id);
    });

    it('authenticates user with password and denies invalid credentials', () => {
      const email = 'researcher@aiheaven.security';
      const validPass = 'Researcher2026!Secure';

      const validLogin = authService.loginWithPassword(email, validPass);
      assert.ok(validLogin.accessToken);
      assert.strictEqual(validLogin.user.email, email);

      assert.throws(
        () => authService.loginWithPassword(email, 'WrongPassword2026!'),
        /Invalid email or password/
      );
    });

    it('supports OAuth login and identity linking without cross-account compromise', () => {
      const oauthEmail = `oauth_hunter_${Date.now()}@corp.io`;
      const oauthSession = authService.loginOrRegisterOAuth(
        'google',
        'sub_google_123456',
        oauthEmail,
        'OAuth Google User'
      );

      assert.ok(oauthSession.accessToken);
      assert.strictEqual(oauthSession.user.email, oauthEmail);
      assert.strictEqual(oauthSession.user.linkedIdentities[0].provider, 'google');

      // Link GitHub identity to the existing account
      const updatedUser = authService.linkAccount(
        oauthSession.user.id,
        'github',
        'gh_user_9988',
        oauthEmail
      );

      assert.strictEqual(updatedUser.linkedIdentities.length, 2);
      assert.ok(updatedUser.linkedIdentities.some(i => i.provider === 'github'));
    });

    it('allows safe account switching across authorized tenant accounts', () => {
      const researcher = authService.getDefaultResearcher();
      const allUsers = authService.getAllUsersForSwitcher();
      assert.ok(allUsers.length >= 2, 'Must have at least researcher and auditor users');

      const auditor = allUsers.find(u => u.role === 'auditor')!;
      assert.ok(auditor, 'Auditor account must be available in switcher');

      const switchedSession = authService.switchAccount(auditor.id);
      assert.strictEqual(switchedSession.user.id, auditor.id);
      assert.strictEqual(switchedSession.user.role, 'auditor');
      assert.notStrictEqual(switchedSession.user.tenantId, researcher.tenantId, 'Tenants must remain isolated');
    });
  });

  // =========================================================================
  // 2. SECURITY DROIDS & PROGRAM SCOPE ENFORCEMENT
  // =========================================================================
  describe('2. Security Droids & Scope Enforcement', () => {
    it('registers and exposes all 6 specialized security droids with distinct roles', () => {
      const droids = bugHuntService.getDroids();
      assert.strictEqual(droids.length, 6, 'Must provide exactly 6 specialized droids');

      const expectedTypes = [
        'recon_droid',
        'api_fuzzer_droid',
        'auth_bypass_droid',
        'injection_droid',
        'secrets_droid',
        'verifier_droid'
      ];

      for (const type of expectedTypes) {
        const found = droids.find(d => d.type === type);
        assert.ok(found, `Droid of type ${type} must be registered`);
        assert.ok(found.capabilities.length > 0, `Droid ${type} must list capabilities`);
      }
    });

    it('strictly enforces authorized scope and rejects forbidden out-of-scope targets', () => {
      // 1. In-scope internal test target
      const internalCheck = bugHuntService.isTargetAuthorized('test-target.sandbox.local');
      assert.strictEqual(internalCheck.authorized, true);

      // 2. In-scope Google target
      const googleCheck = bugHuntService.isTargetAuthorized('ai.google.dev', 'prog_google_vrp');
      assert.strictEqual(googleCheck.authorized, true);

      // 3. Explicitly out-of-scope Google corporate domain
      const outOfScopeCheck = bugHuntService.isTargetAuthorized('corp.google.com', 'prog_google_vrp');
      assert.strictEqual(outOfScopeCheck.authorized, false);
      assert.ok(outOfScopeCheck.reason?.includes('OUT OF SCOPE'));

      // 4. Unauthorized arbitrary target
      const unauthCheck = bugHuntService.isTargetAuthorized('malicious-target-unauthorized.xyz');
      assert.strictEqual(unauthCheck.authorized, false);
      assert.ok(unauthCheck.reason?.includes('explicit program authorization'));
    });
  });

  // =========================================================================
  // 3. START BUG HUNTING (1-CLICK AUTONOMOUS FLOW)
  // =========================================================================
  describe('3. Action 1: START BUG HUNTING (1-Click Autonomous Flow)', () => {
    it('executes autonomous bug hunt with multi-droid coordination and generates verified findings', async () => {
      const researcher = authService.getDefaultResearcher();
      const job = await bugHuntService.startAutonomousBugHunt(
        researcher.id,
        researcher.tenantId,
        'prog_aiheaven_internal'
      );

      assert.ok(job.id.startsWith('hunt_'));
      assert.strictEqual(job.status, 'completed');
      assert.strictEqual(job.progressPercent, 100);
      assert.ok(job.logs.length >= 5, 'Must contain multi-stage execution logs');

      // Verify that specialized droids logged their steps
      const logDroids = job.logs.map(l => l.droid);
      assert.ok(logDroids.some(d => d.includes('Argus-01')), 'Recon droid Argus must execute');
      assert.ok(logDroids.some(d => d.includes('Hydra-02')), 'API Fuzzer droid Hydra must execute');
      assert.ok(logDroids.some(d => d.includes('Cerberus-06')), 'Verifier droid Cerberus must execute');

      // Verify findings
      assert.ok(job.findings.length >= 2, 'Must yield at least 2 discovered vulnerabilities');
      for (const finding of job.findings) {
        assert.strictEqual(finding.verificationStatus, 'VERIFIED');
        assert.strictEqual(finding.verifiedByDroidId, 'Cerberus-06');
        assert.ok(finding.cweId.startsWith('CWE-'));
        assert.ok(finding.cvssScore > 0);
        assert.ok(finding.curlCommand.includes('curl'));
        assert.strictEqual(finding.evidenceHash.length, 64, 'Must produce valid 64-character SHA-256 seal');
      }

      // Verify compiled report
      assert.ok(job.reportMarkdown, 'Must compile professional Markdown report');
      assert.ok(job.reportMarkdown.includes('AI HEAVEN VULNERABILITY ASSESSMENT REPORT'));
      assert.ok(job.reportMarkdown.includes('Executive Summary'));
      assert.ok(job.reportMarkdown.includes('Cerberus-06'));
    });
  });

  // =========================================================================
  // 4. CUSTOM BUG HUNT FLOW
  // =========================================================================
  describe('4. Action 2: CUSTOM BUG HUNT', () => {
    it('allows customized target scope, specific droid selection, and reporting style', async () => {
      const researcher = authService.getDefaultResearcher();
      const customConfig = {
        scope: {
          targetType: 'domain' as const,
          targetValue: 'localhost',
          allowedHosts: ['localhost'],
          disallowedPaths: ['/logout']
        },
        selectedDroids: ['recon_droid', 'api_fuzzer_droid', 'verifier_droid'] as any,
        permittedTechniques: ['passive_recon', 'api_schema_fuzzing'] as any,
        verificationDepth: 'dual_droid_consensus' as const,
        reportingStyle: 'bugcrowd' as const
      };

      const job = await bugHuntService.startCustomBugHunt(
        researcher.id,
        researcher.tenantId,
        'Custom Scope Assessment: localhost',
        customConfig
      );

      assert.strictEqual(job.status, 'completed');
      assert.strictEqual(job.config.reportingStyle, 'bugcrowd');
      assert.strictEqual(job.findings.length > 0, true);
    });

    it('rejects custom bug hunt when target is not authorized', async () => {
      const researcher = authService.getDefaultResearcher();
      const invalidConfig = {
        scope: {
          targetType: 'domain' as const,
          targetValue: 'unauthorized-bank-target.com',
          allowedHosts: ['unauthorized-bank-target.com'],
          disallowedPaths: []
        },
        selectedDroids: ['recon_droid'] as any,
        permittedTechniques: ['passive_recon'] as any,
        verificationDepth: 'fast_triage' as const,
        reportingStyle: 'hackerone' as const
      };

      await assert.rejects(
        () => bugHuntService.startCustomBugHunt(
          researcher.id,
          researcher.tenantId,
          'Unauthorized Hunt',
          invalidConfig
        ),
        /Scope Authorization Rejection/
      );
    });
  });

  // =========================================================================
  // 5. TENANT ISOLATION & DATA BOUNDARIES
  // =========================================================================
  describe('5. Tenant Workspace & Isolation Enforcement', () => {
    it('strictly isolates bug hunts and findings between distinct tenants', async () => {
      const researcher = authService.getDefaultResearcher();
      const auditor = authService.getAllUsersForSwitcher().find(u => u.role === 'auditor')!;

      // 1. Run a hunt for the researcher
      const researcherJob = await bugHuntService.startAutonomousBugHunt(
        researcher.id,
        researcher.tenantId,
        'prog_aiheaven_internal'
      );

      // 2. Researcher can access their own workspace and hunt
      const researcherWs = bugHuntService.getWorkspace(researcher.id, researcher.tenantId);
      assert.ok(researcherWs.huntsCount >= 1);
      const retrieved = bugHuntService.getHuntJob(researcherJob.id, researcher.id, researcher.tenantId);
      assert.strictEqual(retrieved.id, researcherJob.id);

      // 3. Auditor in tenant_external_org_99 CANNOT access researcher's hunt job
      assert.throws(
        () => bugHuntService.getHuntJob(researcherJob.id, auditor.id, auditor.tenantId),
        /Tenant boundary violation/
      );

      // 4. Auditor workspace shows 0 hunts for the auditor
      const auditorWs = bugHuntService.getWorkspace(auditor.id, auditor.tenantId);
      assert.strictEqual(auditorWs.huntsCount, 0);
      assert.strictEqual(auditorWs.totalFindingsCount, 0);
    });
  });

  // =========================================================================
  // 6. REST API INTEGRATION
  // =========================================================================
  describe('6. REST API Route Integration', () => {
    it('GET /api/auth/providers returns comprehensive provider status matrix', async () => {
      const res = await mockRequest('GET', '/api/auth/providers');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.providers));
      assert.ok(res.body.providers.length >= 5);
    });

    it('POST /api/auth/register and POST /api/auth/login issue valid bearer sessions', async () => {
      const email = `api_test_hunter_${Date.now()}@internal.org`;
      const regRes = await mockRequest('POST', '/api/auth/register', {}, {
        email,
        password: 'ValidPassword2026!Strict',
        fullName: 'API Hunter'
      });
      assert.strictEqual(regRes.status, 201);
      assert.ok(regRes.body.accessToken);

      const loginRes = await mockRequest('POST', '/api/auth/login', {}, {
        email,
        password: 'ValidPassword2026!Strict'
      });
      assert.strictEqual(loginRes.status, 200);
      assert.ok(loginRes.body.accessToken);
    });

    it('GET /api/bughunt/workspace returns isolated workspace statistics', async () => {
      const res = await mockRequest('GET', '/api/bughunt/workspace');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.activeDroids.length === 6);
      assert.ok(res.body.authorizedPrograms.length >= 3);
    });

    it('POST /api/bughunt/verify-scope correctly validates target scopes', async () => {
      const res1 = await mockRequest('POST', '/api/bughunt/verify-scope', {}, {
        target: 'localhost'
      });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.authorized, true);

      const res2 = await mockRequest('POST', '/api/bughunt/verify-scope', {}, {
        target: 'forbidden.corporate.network'
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.authorized, false);
    });

    it('POST /api/bughunt/start triggers genuine autonomous hunt via API', async () => {
      const res = await mockRequest('POST', '/api/bughunt/start', {}, {
        programId: 'prog_aiheaven_internal'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'completed');
      assert.ok(res.body.findings.length >= 2);
    });
  });
});
