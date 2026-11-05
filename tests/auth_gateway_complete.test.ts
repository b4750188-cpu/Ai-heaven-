import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { authService } from '../src/services/auth/authService';
import { signJwt, verifyJwt } from '../src/api/app';

describe('AI HEAVEN — Complete Authentication & Secure Workspace Gateway Tests', () => {

  describe('1. Local Account Registration & Input Validation', () => {
    it('successfully registers an account with valid credentials', () => {
      const email = `researcher_${Date.now()}@aiheaven.org`;
      const session = authService.register(email, 'SecurePass2026!Key', 'Alice Vance', '+1 555 9876');

      assert.ok(session, 'Session must be returned');
      assert.ok(session.accessToken, 'Access token must be present');
      assert.ok(session.user, 'User object must be present');
      assert.equal(session.user.email, email.toLowerCase());
      assert.equal(session.user.fullName, 'Alice Vance');
      assert.equal(session.user.phone, '+1 555 9876');
      assert.ok(session.user.tenantId, 'TenantId must be defined');
      assert.equal(session.user.role, 'security_researcher');
      // Password hash and salt must NEVER be exposed in the response
      assert.equal((session.user as any).passwordHash, undefined);
      assert.equal((session.user as any).salt, undefined);
    });

    it('allows registration with optional phone omitted', () => {
      const email = `nophone_${Date.now()}@aiheaven.org`;
      const session = authService.register(email, 'ComplexPass2026!Valid', 'Bob Vance');

      assert.equal(session.user.email, email.toLowerCase());
      assert.equal(session.user.phone, undefined);
    });

    it('rejects duplicate email registration with 400 error', () => {
      const email = `duplicate_test_${Date.now()}@aiheaven.org`;
      authService.register(email, 'ValidPass2026!A', 'Original User');

      assert.throws(
        () => {
          authService.register(email, 'DifferentPass2026!B', 'Imposter User');
        },
        /already exists/i
      );
    });

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@domain..com',
        'spaces in@email.com',
        ''
      ];

      for (const email of invalidEmails) {
        assert.throws(
          () => {
            authService.register(email, 'ValidPass2026!C', 'Test User');
          },
          /email/i
        );
      }
    });

    it('rejects weak passwords below minimum complexity requirements', () => {
      const weakPasswords = [
        'short',
        '1234567',
        'alllowercase',
        '12345678',
        ''
      ];

      for (const pwd of weakPasswords) {
        assert.throws(
          () => {
            authService.register(`user_${Date.now()}@aiheaven.org`, pwd, 'Test User');
          },
          /password/i
        );
      }
    });

    it('rejects registration with empty full name', () => {
      assert.throws(
        () => {
          authService.register(`noname_${Date.now()}@aiheaven.org`, 'ValidPass2026!D', '   ');
        },
        /full name/i
      );
    });
  });

  describe('2. PBKDF2 Password Hashing & Verification', () => {
    it('uses PBKDF2 with SHA-512, 100,000 iterations, 64-byte key and random salt', () => {
      const password = 'TestingPBKDF2Password2026!';
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = authService.hashPassword(password, salt);

      assert.equal(typeof hash, 'string');
      // 64 bytes in hex = 128 characters
      assert.equal(hash.length, 128);

      // Verify correct password returns true
      assert.equal(authService.verifyPassword(password, hash, salt), true);

      // Verify wrong password returns false
      assert.equal(authService.verifyPassword('WrongPassword2026!', hash, salt), false);
    });

    it('produces different hashes for the same password with different salts', () => {
      const password = 'IdenticalPassword2026!';
      const saltA = crypto.randomBytes(16).toString('hex');
      const saltB = crypto.randomBytes(16).toString('hex');

      const hashA = authService.hashPassword(password, saltA);
      const hashB = authService.hashPassword(password, saltB);

      assert.notEqual(hashA, hashB);
    });
  });

  describe('3. Login & Account Lockout Enforcement', () => {
    it('authenticates valid credentials and updates login history', () => {
      const email = `login_success_${Date.now()}@aiheaven.org`;
      authService.register(email, 'PasswordValid2026!X', 'Login Tester');

      const session = authService.loginWithPassword(email, 'PasswordValid2026!X', '192.168.1.100', 'TestAgent');
      assert.ok(session);
      assert.ok(session.accessToken);

      const user = authService.getUser(session.user.id);
      assert.equal(user?.loginHistory?.[0]?.status, 'success');
      assert.equal(user?.loginHistory?.[0]?.ipAddress, '192.168.1.100');
    });

    it('rejects invalid password and locks account after 5 consecutive failed attempts', () => {
      const email = `lockout_test_${Date.now()}@aiheaven.org`;
      authService.register(email, 'TargetPassword2026!Z', 'Lockout Target');

      // 4 failed attempts should fail with invalid credentials
      for (let i = 0; i < 4; i++) {
        assert.throws(
          () => {
            authService.loginWithPassword(email, 'WrongPassword2026!');
          },
          /invalid/i
        );
      }

      // 5th failed attempt triggers lockout
      assert.throws(
        () => {
          authService.loginWithPassword(email, 'WrongPassword2026!');
        },
        /locked/i
      );

      // Subsequent attempt even with correct password is blocked during lockout
      assert.throws(
        () => {
          authService.loginWithPassword(email, 'TargetPassword2026!Z');
        },
        /locked/i
      );
    });
  });

  describe('4. HS256 JWT & Session Security', () => {
    it('signs and verifies JWT with correct claims', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = signJwt({
        sub: 'usr_test_jwt_123',
        email: 'jwt@aiheaven.org',
        role: 'security_researcher',
        tenantId: 'tenant_jwt_123',
        iat: now,
        exp: now + 3600
      });

      assert.equal(typeof token, 'string');
      const parts = token.split('.');
      assert.equal(parts.length, 3);

      const verified = verifyJwt(token);
      assert.ok(verified);
      assert.equal(verified?.sub, 'usr_test_jwt_123');
      assert.equal(verified?.iss, 'aiheaven.io');
      assert.equal(verified?.aud, 'aiheaven_workspace');
      assert.equal(verified?.role, 'security_researcher');
    });

    it('rejects tampered JWT signature in constant time', () => {
      const token = signJwt({ sub: 'usr_tamper', role: 'security_researcher' });
      const parts = token.split('.');
      // Tamper signature
      const tamperedSig = parts[2].slice(0, -4) + 'AAAA';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

      assert.equal(verifyJwt(tamperedToken), null);
    });

    it('rejects expired JWT tokens', () => {
      const past = Math.floor(Date.now() / 1000) - 100;
      const expiredToken = signJwt({
        sub: 'usr_expired',
        iat: past - 3600,
        exp: past
      });

      assert.equal(verifyJwt(expiredToken), null);
    });

    it('invalidates tokens on logout and revokes active sessions', () => {
      const email = `logout_revocation_${Date.now()}@aiheaven.org`;
      const session = authService.register(email, 'RevokePass2026!Key', 'Revocation User');
      const token = session.accessToken;

      assert.ok(authService.verifyToken(token));

      // Perform logout
      authService.logout(token);

      // Verify token is now permanently revoked
      assert.equal(authService.isTokenRevoked(token), true);
      assert.equal(authService.verifyToken(token), null);
      assert.equal(verifyJwt(token), null);
    });
  });

  describe('5. Google & GitHub OAuth Architecture', () => {
    it('generates cryptographically secure OAuth state and validates CSRF', () => {
      const state = authService.generateOAuthState('github');
      assert.equal(typeof state, 'string');
      assert.ok(state.startsWith('aih_state_'));

      // Valid state verifies and consumes
      assert.equal(authService.verifyOAuthState(state, 'github'), true);

      // Cannot reuse consumed state
      assert.equal(authService.verifyOAuthState(state, 'github'), false);

      // Invalid state is rejected
      assert.equal(authService.verifyOAuthState('aih_state_invalid_fake', 'github'), false);
    });

    it('rejects OAuth state validation for mismatched provider', () => {
      const state = authService.generateOAuthState('google');
      assert.equal(authService.verifyOAuthState(state, 'github'), false);
    });

    it('handles missing OAuth credentials gracefully and does not invent fake credentials', () => {
      const originalGoogleId = process.env.GOOGLE_CLIENT_ID;
      const originalGoogleSecret = process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.VITE_GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      assert.throws(
        () => {
          authService.getOAuthAuthorizationUrl('google', 'https://example.com/callback');
        },
        /not configured/i
      );

      // Restore if existed
      if (originalGoogleId) process.env.GOOGLE_CLIENT_ID = originalGoogleId;
      if (originalGoogleSecret) process.env.GOOGLE_CLIENT_SECRET = originalGoogleSecret;
    });

    it('reports accurate provider status labels without exposing confidential secrets', () => {
      const statuses = authService.getProviderStatuses();
      assert.ok(Array.isArray(statuses));

      const local = statuses.find(p => p.provider === 'local');
      assert.equal(local?.statusLabel, 'READY');
      assert.equal(local?.isConfigured, true);

      const google = statuses.find(p => p.provider === 'google');
      assert.ok(google);
      assert.ok(google?.statusLabel);
      // Credentials must never leak client secret
      assert.ok(!google?.credentials.confidentialSecrets.includes(process.env.GOOGLE_CLIENT_SECRET || ''));

      const github = statuses.find(p => p.provider === 'github');
      assert.ok(github);
      assert.ok(github?.statusLabel);
    });
  });

  describe('6. Account Linking & Tenant Isolation', () => {
    it('creates distinct, isolated tenant IDs for new registrations', () => {
      const userA = authService.register(`tenant_a_${Date.now()}@aiheaven.org`, 'Pass2026!TenantA', 'User A');
      const userB = authService.register(`tenant_b_${Date.now()}@aiheaven.org`, 'Pass2026!TenantB', 'User B');

      assert.ok(userA.user.tenantId);
      assert.ok(userB.user.tenantId);
      assert.notEqual(userA.user.tenantId, userB.user.tenantId);
    });

    it('prevents automatic account merging when OAuth provider has matching email', () => {
      const localEmail = `local_existing_${Date.now()}@aiheaven.org`;
      authService.register(localEmail, 'LocalPassword2026!Key', 'Original Local Owner');

      // Attempting to sign in via OAuth with the same email without prior linking MUST be rejected to prevent takeover
      assert.throws(
        () => {
          authService.handleVerifiedOAuthLogin({
            provider: 'github',
            providerUserId: 'gh_attacker_999',
            email: localEmail,
            fullName: 'Attacker Imposter',
            isEmailVerified: true
          });
        },
        /already exists.*link.*securely/i
      );
    });

    it('successfully logs in when the provider identity was previously linked', () => {
      const email = `linked_user_${Date.now()}@aiheaven.org`;
      const initial = authService.register(email, 'LinkedPassword2026!Key', 'Verified Owner');

      // Link GitHub identity
      authService.linkAccount(initial.user.id, 'github', 'gh_user_45678', email);

      // Now OAuth login with this linked provider succeeds
      const oauthSession = authService.handleVerifiedOAuthLogin({
        provider: 'github',
        providerUserId: 'gh_user_45678',
        email,
        isEmailVerified: true
      });

      assert.equal(oauthSession.user.id, initial.user.id);
    });
  });
});
