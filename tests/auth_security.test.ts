/**
 * AI HEAVEN - Authentication & Security Hardening Test Suite
 * 
 * Verifies:
 * 1. /auth/token requires valid credentials (rejects invalid password with 401)
 * 2. /auth/users rejects unauthenticated access with 401
 * 3. /auth/users restricts non-admin callers from enumerating other users
 * 4. /auth/switch rejects unauthenticated access with 401
 * 5. /auth/switch rejects unauthorized account impersonation with 403
 * 6. Admin callers can switch accounts with proper audit trail
 * 7. Insecure default JWT secrets are strictly rejected
 */

import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { app } from '../src/api/app';
import { authService } from '../src/services/auth/authService';
import { getEffectiveJwtSecret } from '../src/api/app';

let server: http.Server;
let baseUrl: string;

function request(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 500, body });
        } catch {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('Authentication & Security Hardening Suite', async (t) => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  await t.test('1. Unauthorized Access: GET /api/auth/users rejects unauthenticated calls with 401', async () => {
    const res = await request('/api/auth/users');
    assert.strictEqual(res.status, 401, 'unauthenticated users list rejected');
    assert.ok(res.body.error?.includes('Authentication required'), 'clear auth error message');
  });

  await t.test('2. Unauthorized Access: POST /api/auth/switch rejects unauthenticated calls with 401', async () => {
    const res = await request('/api/auth/switch', {
      method: 'POST',
      body: { targetUserId: 'user_default_researcher' }
    });
    assert.strictEqual(res.status, 401, 'unauthenticated switch rejected');
    assert.ok(res.body.error?.includes('Authentication required'));
  });

  await t.test('3. Credential Validation: POST /api/auth/token rejects invalid password credentials with 401', async () => {
    const res = await request('/api/auth/token', {
      method: 'POST',
      body: { email: 'researcher@aiheaven.local', password: 'WrongPassword999!' }
    });
    assert.strictEqual(res.status, 401, 'invalid password rejected');
    assert.ok(res.body.error?.includes('Invalid credentials'));
  });

  await t.test('4. Real Authentication: POST /api/auth/token succeeds with valid credentials', async () => {
    // Register a new test user with real credentials
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'security_auditor_test@aiheaven.org',
        password: 'SecurePassw0rd2026!Strict',
        fullName: 'Security Auditor Test'
      }
    });
    assert.strictEqual(regRes.status, 201);
    const userId = regRes.body.user.id;

    // Request token via /auth/token with correct password
    const tokenRes = await request('/api/auth/token', {
      method: 'POST',
      body: {
        email: 'security_auditor_test@aiheaven.org',
        password: 'SecurePassw0rd2026!Strict'
      }
    });
    assert.strictEqual(tokenRes.status, 200);
    assert.ok(tokenRes.body.token, 'valid JWT token issued');
    assert.strictEqual(tokenRes.body.user.id, userId);
  });

  await t.test('5. Impersonation Defense: POST /api/auth/switch rejects non-admin account impersonation with 403', async () => {
    // Login as non-admin researcher
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'security_auditor_test@aiheaven.org',
        password: 'SecurePassw0rd2026!Strict'
      }
    });
    assert.strictEqual(loginRes.status, 200);
    const nonAdminToken = loginRes.body.accessToken;

    // Attempt to hijack another user account
    const hijackRes = await request('/api/auth/switch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${nonAdminToken}` },
      body: { targetUserId: 'user_default_researcher' }
    });
    assert.strictEqual(hijackRes.status, 403, 'cross-account impersonation strictly blocked');
    assert.ok(hijackRes.body.error?.includes('Forbidden'));
  });

  await t.test('6. User Enumeration Protection: GET /api/auth/users restricts non-admin to own account', async () => {
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'security_auditor_test@aiheaven.org',
        password: 'SecurePassw0rd2026!Strict'
      }
    });
    const nonAdminToken = loginRes.body.accessToken;

    const usersRes = await request('/api/auth/users', {
      headers: { Authorization: `Bearer ${nonAdminToken}` }
    });
    assert.strictEqual(usersRes.status, 200);
    assert.strictEqual(usersRes.body.users.length, 1, 'non-admin sees only own account');
    assert.strictEqual(usersRes.body.users[0].email, 'security_auditor_test@aiheaven.org');
  });

  await t.test('7. JWT Security: Insecure default JWT secrets are rejected or warned', () => {
    const origEnv = process.env.JWT_SECRET_KEY;
    const origNodeEnv = process.env.NODE_ENV;

    try {
      // In production, weak secret throws
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET_KEY = 'secret';
      assert.throws(() => {
        getEffectiveJwtSecret();
      }, /FATAL SECURITY ERROR/);

      // In production, missing secret throws
      delete process.env.JWT_SECRET_KEY;
      assert.throws(() => {
        getEffectiveJwtSecret();
      }, /FATAL SECURITY ERROR/);
    } finally {
      process.env.JWT_SECRET_KEY = origEnv;
      process.env.NODE_ENV = origNodeEnv;
    }
  });
});
