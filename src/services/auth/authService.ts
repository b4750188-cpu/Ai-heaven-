/**
 * AI HEAVEN - Multi-Provider Authentication & Identity Service
 * Enterprise PBKDF2 password security, OAuth provider status auditing,
 * session management, account linking/switching, and tenant boundary enforcement.
 */

import crypto from 'node:crypto';
import {
  AuthenticatedUser,
  AuthProviderStatus,
  AuthProviderType,
  AuthTokens,
  LinkedIdentity,
  UserSession
} from '../../types/auth';
import { postgresManager } from '../../db/postgres';

interface StoredUserAccount {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  salt?: string;
  role: 'user' | 'admin' | 'security_researcher' | 'auditor';
  isActive: boolean;
  isEmailVerified: boolean;
  avatarUrl?: string;
  tenantId: string;
  linkedIdentities: LinkedIdentity[];
  createdAt: string;
  updatedAt: string;
}

class AuthService {
  private users: Map<string, StoredUserAccount> = new Map();
  private usersByEmail: Map<string, string> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private tokenToUserId: Map<string, string> = new Map();
  private isInitialized = false;

  constructor() {
    this.seedInitialUsers();
  }

  private seedInitialUsers(): void {
    if (this.isInitialized) return;

    // Seed primary security researcher account
    const salt1 = crypto.randomBytes(16).toString('hex');
    const hash1 = this.hashPassword('Researcher2026!Secure', salt1);
    const researcherUser: StoredUserAccount = {
      id: 'user_default_researcher',
      email: 'researcher@aiheaven.security',
      fullName: 'Lead Bounty Hunter',
      passwordHash: hash1,
      salt: salt1,
      role: 'security_researcher',
      isActive: true,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      tenantId: 'tenant_researcher_01',
      linkedIdentities: [
        {
          provider: 'local',
          providerUserId: 'researcher@aiheaven.security',
          email: 'researcher@aiheaven.security',
          linkedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Seed secondary auditor account for tenant isolation testing
    const salt2 = crypto.randomBytes(16).toString('hex');
    const hash2 = this.hashPassword('AuditorPass99!Strict', salt2);
    const auditorUser: StoredUserAccount = {
      id: 'user_external_auditor',
      email: 'auditor@external-org.net',
      fullName: 'External Compliance Auditor',
      passwordHash: hash2,
      salt: salt2,
      role: 'auditor',
      isActive: true,
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      tenantId: 'tenant_external_org_99',
      linkedIdentities: [
        {
          provider: 'local',
          providerUserId: 'auditor@external-org.net',
          email: 'auditor@external-org.net',
          linkedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.set(researcherUser.id, researcherUser);
    this.usersByEmail.set(researcherUser.email.toLowerCase(), researcherUser.id);

    this.users.set(auditorUser.id, auditorUser);
    this.usersByEmail.set(auditorUser.email.toLowerCase(), auditorUser.id);

    this.isInitialized = true;
  }

  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const computed = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  }

  public getProviderStatuses(userId?: string): AuthProviderStatus[] {
    const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    const githubClientId = process.env.GITHUB_CLIENT_ID || '';
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    const msClientId = process.env.MICROSOFT_CLIENT_ID || '';
    const appleClientId = process.env.APPLE_CLIENT_ID || '';

    const user = userId ? this.users.get(userId) : undefined;
    const isLinked = (p: AuthProviderType) =>
      Boolean(user?.linkedIdentities.some(i => i.provider === p));

    return [
      {
        provider: 'local',
        name: 'Email & Password',
        isConfigured: true,
        isEnabled: true,
        missingEnvVars: [],
        setupInstructions: 'Native PBKDF2 with SHA-512 (100,000 iterations). Ready immediately with password reset and verification.',
        isConnectedForUser: isLinked('local')
      },
      {
        provider: 'google',
        name: 'Google Identity Services (OAuth 2.0)',
        isConfigured: Boolean(googleClientId.trim()),
        isEnabled: true,
        missingEnvVars: googleClientId ? [] : ['VITE_GOOGLE_CLIENT_ID'],
        setupGuideUrl: 'https://developers.google.com/identity/gsi/web/guides/overview',
        setupInstructions: googleClientId
          ? 'Configured and active via Google Identity Services token flow.'
          : 'Set VITE_GOOGLE_CLIENT_ID in your environment and whitelist your domain in Google Cloud Console > Authorized JavaScript Origins.',
        clientIdPreview: googleClientId ? `${googleClientId.substring(0, 14)}...apps.googleusercontent.com` : undefined,
        isConnectedForUser: isLinked('google')
      },
      {
        provider: 'github',
        name: 'GitHub OAuth',
        isConfigured: Boolean(githubClientId.trim() && githubClientSecret.trim()),
        isEnabled: true,
        missingEnvVars: [
          ...(githubClientId ? [] : ['GITHUB_CLIENT_ID']),
          ...(githubClientSecret ? [] : ['GITHUB_CLIENT_SECRET'])
        ],
        setupGuideUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps',
        setupInstructions: githubClientId && githubClientSecret
          ? 'Configured and ready. Supports direct code exchange and personal token linking.'
          : 'Create an OAuth App on GitHub Developer Settings with Authorization Callback URL /api/auth/callback/github, then set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
        clientIdPreview: githubClientId ? `${githubClientId.substring(0, 8)}...` : undefined,
        isConnectedForUser: isLinked('github')
      },
      {
        provider: 'microsoft',
        name: 'Microsoft Entra ID (Azure AD)',
        isConfigured: Boolean(msClientId.trim()),
        isEnabled: false,
        missingEnvVars: msClientId ? [] : ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        setupGuideUrl: 'https://learn.microsoft.com/en-us/entra/identity-platform/',
        setupInstructions: 'Enterprise federated sign-in. To enable, configure Azure App Registration with Redirect URI and set MICROSOFT_CLIENT_ID.',
        isConnectedForUser: isLinked('microsoft')
      },
      {
        provider: 'apple',
        name: 'Sign in with Apple',
        isConfigured: Boolean(appleClientId.trim()),
        isEnabled: false,
        missingEnvVars: appleClientId ? [] : ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID'],
        setupGuideUrl: 'https://developer.apple.com/sign-in-with-apple/',
        setupInstructions: 'Requires Apple Developer Program Service ID, Team ID, and Private Key configured for web redirect authentication.',
        isConnectedForUser: isLinked('apple')
      }
    ];
  }

  public register(email: string, password: string, fullName: string): AuthTokens {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid email address is required.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (this.usersByEmail.has(normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = `user_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const now = new Date().toISOString();
    const newUser: StoredUserAccount = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim() || normalizedEmail.split('@')[0],
      passwordHash,
      salt,
      role: 'security_researcher',
      isActive: true,
      isEmailVerified: false,
      tenantId,
      linkedIdentities: [
        {
          provider: 'local',
          providerUserId: normalizedEmail,
          email: normalizedEmail,
          linkedAt: now,
          lastLoginAt: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    this.users.set(userId, newUser);
    this.usersByEmail.set(normalizedEmail, userId);

    return this.createSession(newUser);
  }

  public loginWithPassword(email: string, password: string): AuthTokens {
    const normalizedEmail = email.trim().toLowerCase();
    const userId = this.usersByEmail.get(normalizedEmail);
    if (!userId) {
      throw new Error('Invalid email or password.');
    }

    const user = this.users.get(userId);
    if (!user || !user.isActive) {
      throw new Error('User account is disabled or suspended.');
    }

    if (!user.passwordHash || !user.salt) {
      throw new Error('This account uses external OAuth. Please continue with Google or GitHub.');
    }

    const isMatch = this.verifyPassword(password, user.passwordHash, user.salt);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Update last login
    user.updatedAt = new Date().toISOString();
    const localIdentity = user.linkedIdentities.find(i => i.provider === 'local');
    if (localIdentity) {
      localIdentity.lastLoginAt = new Date().toISOString();
    }

    return this.createSession(user);
  }

  public loginOrRegisterOAuth(
    provider: AuthProviderType,
    providerUserId: string,
    email: string,
    fullName?: string,
    avatarUrl?: string
  ): AuthTokens {
    const normalizedEmail = email.trim().toLowerCase();
    let existingUserId = this.usersByEmail.get(normalizedEmail);

    // If account with this email exists, link or update identity
    if (existingUserId) {
      const user = this.users.get(existingUserId);
      if (!user) throw new Error('Account lookup error.');

      const existingIdentity = user.linkedIdentities.find(
        i => i.provider === provider && i.providerUserId === providerUserId
      );

      if (existingIdentity) {
        existingIdentity.lastLoginAt = new Date().toISOString();
      } else {
        user.linkedIdentities.push({
          provider,
          providerUserId,
          email: normalizedEmail,
          linkedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          avatarUrl
        });
      }
      user.updatedAt = new Date().toISOString();
      return this.createSession(user);
    }

    // Create new account via OAuth
    const userId = `user_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();

    const newUser: StoredUserAccount = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName?.trim() || normalizedEmail.split('@')[0],
      role: 'security_researcher',
      isActive: true,
      isEmailVerified: true, // OAuth provider verified
      avatarUrl,
      tenantId,
      linkedIdentities: [
        {
          provider,
          providerUserId,
          email: normalizedEmail,
          linkedAt: now,
          lastLoginAt: now,
          avatarUrl
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    this.users.set(userId, newUser);
    this.usersByEmail.set(normalizedEmail, userId);

    return this.createSession(newUser);
  }

  public linkAccount(userId: string, provider: AuthProviderType, providerUserId: string, email: string): AuthenticatedUser {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');

    const alreadyLinked = user.linkedIdentities.some(i => i.provider === provider);
    if (alreadyLinked) {
      throw new Error(`Account already has a linked ${provider} identity.`);
    }

    user.linkedIdentities.push({
      provider,
      providerUserId,
      email: email.trim().toLowerCase(),
      linkedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
    user.updatedAt = new Date().toISOString();

    return this.toAuthenticatedUser(user);
  }

  public unlinkAccount(userId: string, provider: AuthProviderType): AuthenticatedUser {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');

    if (user.linkedIdentities.length <= 1) {
      throw new Error('Cannot disconnect the only linked authentication method.');
    }

    user.linkedIdentities = user.linkedIdentities.filter(i => i.provider !== provider);
    user.updatedAt = new Date().toISOString();

    return this.toAuthenticatedUser(user);
  }

  public switchAccount(targetUserId: string): AuthTokens {
    const user = this.users.get(targetUserId);
    if (!user) throw new Error('Target user account not found.');
    if (!user.isActive) throw new Error('Target user account is disabled.');
    return this.createSession(user);
  }

  public createSession(user: StoredUserAccount): AuthTokens {
    const token = `aih_sess_${crypto.randomUUID().replace(/-/g, '')}_${Date.now()}`;
    const sessionId = `sess_${crypto.randomUUID().substring(0, 8)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    this.sessions.set(token, session);
    this.tokenToUserId.set(token, user.id);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 7 * 24 * 60 * 60,
      user: this.toAuthenticatedUser(user)
    };
  }

  public verifyToken(token: string): AuthenticatedUser | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(token);
      this.tokenToUserId.delete(token);
      return null;
    }

    session.lastActiveAt = new Date().toISOString();
    const user = this.users.get(session.userId);
    if (!user || !user.isActive) return null;

    return this.toAuthenticatedUser(user);
  }

  public logout(token: string): void {
    this.sessions.delete(token);
    this.tokenToUserId.delete(token);
  }

  public getUser(userId: string): AuthenticatedUser | null {
    const user = this.users.get(userId);
    if (!user) return null;
    return this.toAuthenticatedUser(user);
  }

  public getAllUsersForSwitcher(): Array<{ id: string; email: string; fullName: string; role: string; tenantId: string }> {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      tenantId: u.tenantId
    }));
  }

  public getDefaultResearcher(): AuthenticatedUser {
    const user = this.users.get('user_default_researcher');
    if (!user) throw new Error('Default researcher user missing.');
    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: StoredUserAccount): AuthenticatedUser {
    let activeSessionsCount = 0;
    for (const sess of this.sessions.values()) {
      if (sess.userId === user.id) activeSessionsCount++;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      linkedIdentities: [...user.linkedIdentities],
      activeSessionsCount: Math.max(activeSessionsCount, 1),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export const authService = new AuthService();
