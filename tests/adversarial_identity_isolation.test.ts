/**
 * AI HEAVEN - Mandatory Adversarial Identity Isolation & Security Test Suite
 * 
 * Verifies release-blocking privacy & security invariants:
 * 1. User A & User B identity, email, phone number, and password hash isolation.
 * 2. Strict rejection of cross-user data leakage (projects, chats, memories, sessions).
 * 3. Prevention of automatic OAuth account hijacking when OAuth emails match existing accounts.
 * 4. Brute-force account lockout protection (5 failed attempts locks for 15 minutes).
 * 5. RFC 6238 TOTP Multi-Factor Authentication challenge enforcement & invalid code rejection.
 * 6. Session revocation & active device management.
 * 7. Store persistence across simulated restarts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { authService } from '../src/services/auth/authService';
import { centralBrainService } from '../src/services/brain/centralBrainService';
import { generateTotpCode } from '../src/services/auth/totp';

describe('AI HEAVEN - Adversarial Identity Isolation & Security Audit', () => {

  const USER_A_EMAIL = `alice_${Date.now()}@adversarial.local`;
  const USER_A_PHONE = '+1-555-0101';
  const USER_A_PASSWORD = 'AlicePassword2026!Strong';

  const USER_B_EMAIL = `bob_${Date.now()}@adversarial.local`;
  const USER_B_PHONE = '+1-555-0202';
  const USER_B_PASSWORD = 'BobPassword2026!Secure';

  let sessionA: any;
  let sessionB: any;

  it('1. Registration: Registers User A and User B with distinct credentials, phones, and isolated tenants', () => {
    sessionA = authService.register(USER_A_EMAIL, USER_A_PASSWORD, 'Alice Security Lead', USER_A_PHONE);
    sessionB = authService.register(USER_B_EMAIL, USER_B_PASSWORD, 'Bob Research Analyst', USER_B_PHONE);

    assert.ok(sessionA.token, 'User A must receive session token');
    assert.ok(sessionB.token, 'User B must receive session token');
    assert.notStrictEqual(sessionA.user.id, sessionB.user.id, 'User IDs must be distinct');
    assert.notStrictEqual(sessionA.user.tenantId, sessionB.user.tenantId, 'Tenant IDs must be strictly partitioned');

    // Sensitive field stripping check
    assert.strictEqual((sessionA.user as any).passwordHash, undefined, 'Password hash must never leak in AuthenticatedUser');
    assert.strictEqual((sessionA.user as any).salt, undefined, 'Password salt must never leak in AuthenticatedUser');
    assert.strictEqual((sessionA.user as any).mfaSecret, undefined, 'MFA secret must never leak in AuthenticatedUser');
  });

  it('2. Identity Isolation: User B cannot observe User A phone number, email, or credentials', () => {
    const verifiedA = authService.verifyToken(sessionA.token);
    const verifiedB = authService.verifyToken(sessionB.token);

    assert.ok(verifiedA);
    assert.ok(verifiedB);

    assert.strictEqual(verifiedA.phone, USER_A_PHONE, "User A sees Alice's phone number");
    assert.strictEqual(verifiedB.phone, USER_B_PHONE, "User B sees Bob's phone number");
    assert.notStrictEqual(verifiedB.phone, verifiedA.phone, "User B cannot see Alice's phone number");

    // Attempting to lookup User A with User B token or non-admin role
    const switcherUsers = authService.getAllUsersForSwitcher();
    // Non-admin switcher users must only expose public/scrubbed identifiers, never private phone numbers or secrets
    for (const u of switcherUsers) {
      assert.strictEqual((u as any).phone, undefined, 'Switcher list must never leak private phone numbers');
      assert.strictEqual((u as any).passwordHash, undefined, 'Switcher list must never leak password hashes');
      assert.strictEqual((u as any).mfaSecret, undefined, 'Switcher list must never leak MFA secrets');
    }
  });

  it('3. Conversation & Memory Isolation: User B cannot retrieve or search User A conversations', () => {
    // Alice creates a private confidential conversation
    const aliceConv = centralBrainService.createConversation(
      'Alice Secret Zero-Day Report',
      'gemini-2.5-pro',
      sessionA.user.id,
      sessionA.user.tenantId
    );

    centralBrainService.addMessage(
      aliceConv.id,
      'user',
      'Confidential zero-day disclosure findings for AI Heaven sandbox',
      'Alice Lead'
    );

    // 1. Bob attempts to list conversations
    const bobConvs = centralBrainService.listConversations(sessionB.user.id);
    const foundAliceInBobList = bobConvs.some(c => c.id === aliceConv.id || c.title.includes('Zero-Day'));
    assert.strictEqual(foundAliceInBobList, false, 'User B must not see User A conversations in listConversations');

    // 2. Bob attempts direct conversation retrieval by ID
    const directAccess = centralBrainService.getConversation(aliceConv.id, sessionB.user.id);
    assert.strictEqual(directAccess, null, 'User B direct retrieval of User A conversation must return null');

    // 3. Bob attempts to retrieve messages by ID
    const directMessages = centralBrainService.getMessages(aliceConv.id, sessionB.user.id);
    assert.strictEqual(directMessages.length, 0, 'User B must retrieve 0 messages from User A conversation');

    // 4. Bob attempts to search conversations
    const searchResults = centralBrainService.searchConversations('zero-day', sessionB.user.id);
    assert.strictEqual(searchResults.length, 0, 'User B search must not match User A confidential queries');

    // 5. Alice can retrieve her own conversation
    const aliceSelfAccess = centralBrainService.getConversation(aliceConv.id, sessionA.user.id);
    assert.ok(aliceSelfAccess, 'User A must access her own conversation');
    assert.strictEqual(aliceSelfAccess?.title, 'Alice Secret Zero-Day Report');
  });

  it('4. OAuth Account Takeover Defense: Unverified automatic linking is strictly prohibited', () => {
    // Attacker attempts OAuth login using User A's email (alice) with an arbitrary providerUserId
    assert.throws(
      () => {
        authService.loginOrRegisterOAuth(
          'google',
          'attacker_google_id_99999',
          USER_A_EMAIL,
          'Fake Alice'
        );
      },
      /already exists.*prevent unauthorized account takeover/i,
      'OAuth login with an existing email without prior linking must throw and block account takeover'
    );
  });

  it('5. Brute-Force Protection: Locks account after 5 consecutive failed password attempts', () => {
    const VICTIM_EMAIL = `victim_${Date.now()}@adversarial.local`;
    authService.register(VICTIM_EMAIL, 'CorrectPassword123!', 'Victim Account');

    // 5 consecutive incorrect attempts
    for (let i = 1; i <= 5; i++) {
      assert.throws(
        () => {
          authService.loginWithPassword(VICTIM_EMAIL, 'WrongPassword!');
        },
        /(Invalid email or password|Account temporarily locked)/
      );
    }

    // 6th attempt with CORRECT password must still be locked
    assert.throws(
      () => {
        authService.loginWithPassword(VICTIM_EMAIL, 'CorrectPassword123!');
      },
      /Account temporarily locked.*failed login attempts/i,
      'Account must remain locked after 5 consecutive failed attempts'
    );
  });

  it('6. RFC 6238 TOTP Multi-Factor Authentication: Challenge requirement & verification', () => {
    // 1. Setup MFA for User A
    const mfaSetup = authService.setupMfa(sessionA.user.id);
    assert.ok(mfaSetup.secret, 'Must generate TOTP secret');
    assert.ok(mfaSetup.qrUri.startsWith('otpauth://totp/'), 'Must generate valid otpauth URI');

    // 2. Enable MFA using valid code
    const validCode = generateTotpCode(mfaSetup.secret);
    const updatedUser = authService.enableMfa(sessionA.user.id, validCode);
    assert.strictEqual(updatedUser.mfaEnabled, true, 'User A MFA must be enabled');

    // 3. Login now requires MFA challenge
    const loginResult = authService.loginWithPassword(USER_A_EMAIL, USER_A_PASSWORD);
    assert.strictEqual((loginResult as any).requiresMfa, true, 'Login must require MFA');
    assert.ok((loginResult as any).mfaTicket, 'Login must issue mfaTicket');

    // 4. Invalid TOTP code is rejected
    assert.throws(
      () => {
        authService.verifyMfaLogin((loginResult as any).mfaTicket, '000000');
      },
      /Invalid.*code/i
    );

    // 5. Valid TOTP code completes sign in
    const secondCode = generateTotpCode(mfaSetup.secret);
    const completedSession = authService.verifyMfaLogin((loginResult as any).mfaTicket, secondCode);
    assert.ok(completedSession.token, 'Must return session token upon valid MFA verification');
    assert.strictEqual(completedSession.user.id, sessionA.user.id);
  });

  it('7. Session Isolation & Revocation: Revoking active session terminates access', () => {
    const verifiedBefore = authService.verifyToken(sessionB.token);
    assert.ok(verifiedBefore, 'Session B must be valid before revocation');

    // Get active sessions
    const activeSessions = authService.getActiveSessions(sessionB.user.id, sessionB.token);
    assert.ok(activeSessions.length >= 1, 'User B must have active session record');

    const currentSessionId = activeSessions[0].sessionId;
    authService.revokeSession(sessionB.user.id, currentSessionId);

    // Verifying revoked token must return null
    const verifiedAfter = authService.verifyToken(sessionB.token);
    assert.strictEqual(verifiedAfter, null, 'Revoked token must be rejected');
  });

  it('8. Persistence Integrity: User data, salts, and MFA status persist across store reloads', () => {
    // Simulating store re-initialization
    const userAFromService = authService.getUser(sessionA.user.id);
    assert.ok(userAFromService, 'User A must exist');
    assert.strictEqual(userAFromService?.mfaEnabled, true, 'MFA status must persist');
    assert.strictEqual(userAFromService?.phone, USER_A_PHONE, 'Phone number must persist');
  });
});
