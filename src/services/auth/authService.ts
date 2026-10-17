/**
 * AI HEAVEN - Multi-Provider Authentication & Identity Service
 * Enterprise PBKDF2 password security, OAuth provider status auditing,
 * session management, account linking/switching, CSRF state protection,
 * email verification, password reset, and cost/configuration transparency.
 */

import crypto from 'node:crypto';
import {
  AuthenticatedUser,
  AuthProviderStatus,
  AuthProviderType,
  AuthTokens,
  EmailVerificationTokenRecord,
  LinkedIdentity,
  OAuthStateRecord,
  PasswordResetTokenRecord,
  UserSession
} from '../../types/auth';

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
  private passwordResetTokens: Map<string, PasswordResetTokenRecord> = new Map();
  private emailVerificationTokens: Map<string, EmailVerificationTokenRecord> = new Map();
  private oauthStates: Map<string, OAuthStateRecord> = new Map();
  private isInitialized = false;

  private revokedTokens: Set<string> = new Set();

  constructor() {
    this.seedInitialUsers();
  }

  /**
   * Safe user seeding:
   * DEMO ACCOUNTS ARE STRICTLY FORBIDDEN IN PRODUCTION.
   * If NODE_ENV === 'production', zero demo accounts are seeded.
   * In development/test, demo accounts are only initialized for local test isolation.
   */
  private seedInitialUsers(): void {
    if (this.isInitialized) return;

    if (process.env.NODE_ENV === 'production') {
      // In production, no hardcoded users are permitted.
      this.isInitialized = true;
      return;
    }

    // Explicit opt-in or local development / test mode
    const isDevOrTest = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const allowDemo = process.env.ENABLE_DEV_DEMO_ACCOUNTS === 'true' || isDevOrTest;
    if (!allowDemo) {
      this.isInitialized = true;
      return;
    }

    // Seed development security researcher account with distinct per-runtime salt
    const salt1 = crypto.randomBytes(16).toString('hex');
    const hash1 = this.hashPassword(process.env.DEV_RESEARCHER_PASSWORD || 'DevResearcher2026!Local', salt1);
    const researcherUser: StoredUserAccount = {
      id: 'user_default_researcher',
      email: 'researcher@aiheaven.local',
      fullName: 'Development Security Researcher',
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
          providerUserId: 'researcher@aiheaven.local',
          email: 'researcher@aiheaven.local',
          linkedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Seed secondary development auditor account for tenant isolation testing
    const salt2 = crypto.randomBytes(16).toString('hex');
    const hash2 = this.hashPassword(process.env.DEV_AUDITOR_PASSWORD || 'DevAuditor99!StrictLocal', salt2);
    const auditorUser: StoredUserAccount = {
      id: 'user_external_auditor',
      email: 'auditor@external-org.local',
      fullName: 'External Compliance Auditor (Dev)',
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
          providerUserId: 'auditor@external-org.local',
          email: 'auditor@external-org.local',
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

    // Seed development test fixture account for bughunt platform tests (strictly absent in production)
    const saltSec = crypto.randomBytes(16).toString('hex');
    const hashSec = this.hashPassword('Researcher2026!Secure', saltSec);
    const testSecUser: StoredUserAccount = {
      id: 'user_test_researcher_fixture',
      email: 'researcher@aiheaven.security',
      fullName: 'Security Researcher (Dev Test)',
      passwordHash: hashSec,
      salt: saltSec,
      role: 'security_researcher',
      isActive: true,
      isEmailVerified: true,
      tenantId: 'tenant_researcher_test_sec',
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
    this.users.set(testSecUser.id, testSecUser);
    this.usersByEmail.set(testSecUser.email.toLowerCase(), testSecUser.id);

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
    const facebookAppId = process.env.FACEBOOK_APP_ID || '';
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || '';
    const msClientId = process.env.MICROSOFT_CLIENT_ID || '';
    const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
    const appleClientId = process.env.APPLE_CLIENT_ID || '';
    const discordClientId = process.env.DISCORD_CLIENT_ID || '';
    const discordClientSecret = process.env.DISCORD_CLIENT_SECRET || '';

    const user = userId ? this.users.get(userId) : undefined;
    const isLinked = (p: AuthProviderType) =>
      Boolean(user?.linkedIdentities.some(i => i.provider === p));

    return [
      {
        provider: 'local',
        name: 'Email & Password',
        isConfigured: true,
        isEnabled: true,
        statusLabel: 'READY',
        missingEnvVars: [],
        setupInstructions: 'Native PBKDF2 with SHA-512 (100,000 iterations). Ready immediately with password reset and verification.',
        isConnectedForUser: isLinked('local'),
        credentials: {
          publicClientIdentifiers: [],
          confidentialSecrets: ['JWT_SECRET_KEY'],
          authorizedCallbackUrl: 'N/A (Direct REST API /api/auth/login)',
          developerConsoleUrl: 'Self-hosted AI Heaven Engine',
          requiredPermissions: ['Basic email & password verification'],
          domainVerificationRequired: false
        },
        costTransparency: {
          costModel: 'Free Tier Available',
          freeTierDetails: 'Fully self-hosted; zero per-authentication or third-party license fees.',
          knownCostsDescription: '$0.00 / month (native in-memory and PostgreSQL storage).',
          isThirdPartyBillingRequired: false
        }
      },
      {
        provider: 'google',
        name: 'Continue with Google (OAuth 2.0 / GIS)',
        isConfigured: Boolean(googleClientId.trim()),
        isEnabled: true,
        statusLabel: googleClientId.trim() ? 'CONFIGURED' : 'SETUP_REQUIRED',
        missingEnvVars: googleClientId ? [] : ['VITE_GOOGLE_CLIENT_ID'],
        setupGuideUrl: 'https://developers.google.com/identity/gsi/web/guides/overview',
        setupInstructions: googleClientId
          ? 'Configured and active via Google Identity Services token flow.'
          : 'Set VITE_GOOGLE_CLIENT_ID in your environment and whitelist your domain in Google Cloud Console > Authorized JavaScript Origins.',
        clientIdPreview: googleClientId ? `${googleClientId.substring(0, 14)}...apps.googleusercontent.com` : undefined,
        isConnectedForUser: isLinked('google'),
        credentials: {
          publicClientIdentifiers: ['VITE_GOOGLE_CLIENT_ID'],
          confidentialSecrets: [], // Client-side GIS flow strictly avoids client secrets in browser
          authorizedCallbackUrl: 'Client-side postMessage or /api/auth/callback/google',
          developerConsoleUrl: 'https://console.cloud.google.com/apis/credentials',
          requiredPermissions: ['openid', 'email', 'profile'],
          domainVerificationRequired: true
        },
        costTransparency: {
          costModel: 'Free Tier Available',
          freeTierDetails: 'Google Identity Services is free with unlimited authentications.',
          knownCostsDescription: '$0.00 / month for standard consumer Google account sign-in.',
          isThirdPartyBillingRequired: false
        }
      },
      {
        provider: 'github',
        name: 'Continue with GitHub (OAuth 2.0)',
        isConfigured: Boolean(githubClientId.trim() && githubClientSecret.trim()),
        isEnabled: true,
        statusLabel: (githubClientId.trim() && githubClientSecret.trim()) ? 'CONFIGURED' : 'SETUP_REQUIRED',
        missingEnvVars: [
          ...(githubClientId ? [] : ['GITHUB_CLIENT_ID']),
          ...(githubClientSecret ? [] : ['GITHUB_CLIENT_SECRET'])
        ],
        setupGuideUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps',
        setupInstructions: githubClientId && githubClientSecret
          ? 'Configured and ready. Supports direct code exchange and personal token linking.'
          : 'Create an OAuth App on GitHub Developer Settings with Authorization Callback URL /api/auth/callback/github, then set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
        clientIdPreview: githubClientId ? `${githubClientId.substring(0, 8)}...` : undefined,
        isConnectedForUser: isLinked('github'),
        credentials: {
          publicClientIdentifiers: ['GITHUB_CLIENT_ID'],
          confidentialSecrets: ['GITHUB_CLIENT_SECRET'],
          authorizedCallbackUrl: '/api/auth/callback/github',
          developerConsoleUrl: 'https://github.com/settings/developers',
          requiredPermissions: ['read:user', 'user:email'],
          domainVerificationRequired: false
        },
        costTransparency: {
          costModel: 'Free Tier Available',
          freeTierDetails: 'GitHub OAuth is 100% free with generous standard rate limits.',
          knownCostsDescription: '$0.00 / month.',
          isThirdPartyBillingRequired: false
        }
      },
      {
        provider: 'facebook',
        name: 'Continue with Facebook (Meta Login)',
        isConfigured: Boolean(facebookAppId.trim() && facebookAppSecret.trim()),
        isEnabled: true,
        statusLabel: (facebookAppId.trim() && facebookAppSecret.trim()) ? 'CONFIGURED' : 'BLOCKED_MISSING_CREDENTIALS',
        missingEnvVars: [
          ...(facebookAppId ? [] : ['FACEBOOK_APP_ID']),
          ...(facebookAppSecret ? [] : ['FACEBOOK_APP_SECRET'])
        ],
        setupGuideUrl: 'https://developers.facebook.com/docs/facebook-login/web',
        setupInstructions: facebookAppId && facebookAppSecret
          ? 'Configured and active via Meta Graph API OAuth dialog.'
          : 'Create an app in Meta for Developers, configure Facebook Login product, set Valid OAuth Redirect URIs to /api/auth/callback/facebook, and supply FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.',
        clientIdPreview: facebookAppId ? `${facebookAppId.substring(0, 6)}...` : undefined,
        isConnectedForUser: isLinked('facebook'),
        credentials: {
          publicClientIdentifiers: ['FACEBOOK_APP_ID'],
          confidentialSecrets: ['FACEBOOK_APP_SECRET'],
          authorizedCallbackUrl: '/api/auth/callback/facebook',
          developerConsoleUrl: 'https://developers.facebook.com/apps/',
          requiredPermissions: ['email', 'public_profile'],
          domainVerificationRequired: true
        },
        costTransparency: {
          costModel: 'Free Tier Available',
          freeTierDetails: 'Facebook Login is completely free for consumer and business accounts.',
          knownCostsDescription: '$0.00 / month.',
          isThirdPartyBillingRequired: false
        }
      },
      {
        provider: 'microsoft',
        name: 'Microsoft Entra ID (Azure AD)',
        isConfigured: Boolean(msClientId.trim() && msClientSecret.trim()),
        isEnabled: false,
        statusLabel: 'BLOCKED_MISSING_CREDENTIALS',
        missingEnvVars: [
          ...(msClientId ? [] : ['MICROSOFT_CLIENT_ID']),
          ...(msClientSecret ? [] : ['MICROSOFT_CLIENT_SECRET'])
        ],
        setupGuideUrl: 'https://learn.microsoft.com/en-us/entra/identity-platform/',
        setupInstructions: 'Enterprise federated sign-in. Configure Azure Portal App Registration with Redirect URI and set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.',
        isConnectedForUser: isLinked('microsoft'),
        credentials: {
          publicClientIdentifiers: ['MICROSOFT_CLIENT_ID'],
          confidentialSecrets: ['MICROSOFT_CLIENT_SECRET'],
          authorizedCallbackUrl: '/api/auth/callback/microsoft',
          developerConsoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps',
          requiredPermissions: ['User.Read', 'openid', 'email', 'profile'],
          domainVerificationRequired: true
        },
        costTransparency: {
          costModel: 'Free with Usage Limits',
          freeTierDetails: 'Microsoft Entra ID Free tier includes up to 50,000 monthly active users.',
          knownCostsDescription: 'Free tier $0.00; P1/P2 licenses cost $6-$9/user/month if required by enterprise.',
          isThirdPartyBillingRequired: false
        }
      },
      {
        provider: 'apple',
        name: 'Sign in with Apple',
        isConfigured: Boolean(appleClientId.trim()),
        isEnabled: false,
        statusLabel: 'BLOCKED_MISSING_CREDENTIALS',
        missingEnvVars: appleClientId ? [] : ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'],
        setupGuideUrl: 'https://developer.apple.com/sign-in-with-apple/',
        setupInstructions: 'Requires Apple Developer Program Service ID, Team ID, Key ID, and Private Key configured for web redirect authentication.',
        isConnectedForUser: isLinked('apple'),
        credentials: {
          publicClientIdentifiers: ['APPLE_CLIENT_ID'],
          confidentialSecrets: ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'],
          authorizedCallbackUrl: '/api/auth/callback/apple',
          developerConsoleUrl: 'https://developer.apple.com/account/resources/identifiers/list',
          requiredPermissions: ['name', 'email'],
          domainVerificationRequired: true
        },
        costTransparency: {
          costModel: 'Requires Paid Developer Program',
          freeTierDetails: 'No per-login usage fees from Apple.',
          knownCostsDescription: 'Requires active Apple Developer Program membership ($99 USD/year).',
          isThirdPartyBillingRequired: true
        }
      },
      {
        provider: 'discord',
        name: 'Discord OAuth 2.0',
        isConfigured: Boolean(discordClientId.trim() && discordClientSecret.trim()),
        isEnabled: true,
        statusLabel: (discordClientId.trim() && discordClientSecret.trim()) ? 'CONFIGURED' : 'BLOCKED_MISSING_CREDENTIALS',
        missingEnvVars: [
          ...(discordClientId ? [] : ['DISCORD_CLIENT_ID']),
          ...(discordClientSecret ? [] : ['DISCORD_CLIENT_SECRET'])
        ],
        setupGuideUrl: 'https://discord.com/developers/docs/topics/oauth2',
        setupInstructions: 'Community authentication. Register an application in Discord Developer Portal, configure OAuth2 Redirect URI, and set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.',
        isConnectedForUser: isLinked('discord'),
        credentials: {
          publicClientIdentifiers: ['DISCORD_CLIENT_ID'],
          confidentialSecrets: ['DISCORD_CLIENT_SECRET'],
          authorizedCallbackUrl: '/api/auth/callback/discord',
          developerConsoleUrl: 'https://discord.com/developers/applications',
          requiredPermissions: ['identify', 'email'],
          domainVerificationRequired: false
        },
        costTransparency: {
          costModel: 'Free Tier Available',
          freeTierDetails: 'Discord OAuth is completely free with standard API rate limits.',
          knownCostsDescription: '$0.00 / month.',
          isThirdPartyBillingRequired: false
        }
      }
    ];
  }

  // ==========================================
  // OAUTH STATE & CSRF PROTECTION
  // ==========================================

  public generateOAuthState(provider: AuthProviderType): string {
    const state = `aih_state_${crypto.randomUUID().replace(/-/g, '')}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    this.oauthStates.set(state, {
      state,
      provider,
      expiresAt,
      createdAt: new Date().toISOString()
    });

    return state;
  }

  public verifyOAuthState(state: string, provider: AuthProviderType): boolean {
    if (!state) return false;
    const record = this.oauthStates.get(state);
    if (!record) return false;

    // Check expiration
    if (new Date(record.expiresAt) < new Date()) {
      this.oauthStates.delete(state);
      return false;
    }

    if (record.provider !== provider) {
      return false;
    }

    // Single-use CSRF token
    this.oauthStates.delete(state);
    return true;
  }

  // ==========================================
  // EMAIL VERIFICATION WORKFLOW
  // ==========================================

  public requestEmailVerification(email: string): { verificationToken: string; expiresAt: string } {
    const normalized = email.trim().toLowerCase();
    const userId = this.usersByEmail.get(normalized);
    if (!userId) {
      throw new Error('User not found.');
    }

    const token = `verify_${crypto.randomUUID().replace(/-/g, '')}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    this.emailVerificationTokens.set(token, {
      token,
      email: normalized,
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
      isConsumed: false
    });

    return { verificationToken: token, expiresAt };
  }

  public verifyEmailToken(token: string): { success: boolean; user: AuthenticatedUser } {
    const record = this.emailVerificationTokens.get(token);
    if (!record || record.isConsumed) {
      throw new Error('Invalid or already consumed email verification token.');
    }

    if (new Date(record.expiresAt) < new Date()) {
      this.emailVerificationTokens.delete(token);
      throw new Error('Email verification token has expired.');
    }

    const user = this.users.get(record.userId);
    if (!user) throw new Error('Associated user account not found.');

    user.isEmailVerified = true;
    user.updatedAt = new Date().toISOString();
    record.isConsumed = true;

    return { success: true, user: this.toAuthenticatedUser(user) };
  }

  // ==========================================
  // PASSWORD RESET WORKFLOW
  // ==========================================

  public requestPasswordReset(email: string): { resetToken: string; expiresAt: string } {
    const normalized = email.trim().toLowerCase();
    const userId = this.usersByEmail.get(normalized);
    if (!userId) {
      // Return synthetic token to prevent email enumeration timing attacks
      const syntheticToken = `reset_${crypto.randomUUID().replace(/-/g, '')}`;
      return { resetToken: syntheticToken, expiresAt: new Date(Date.now() + 3600000).toISOString() };
    }

    const token = `reset_${crypto.randomUUID().replace(/-/g, '')}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    this.passwordResetTokens.set(token, {
      token,
      email: normalized,
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
      isConsumed: false
    });

    return { resetToken: token, expiresAt };
  }

  public confirmPasswordReset(token: string, newPassword: string): { success: boolean; user: AuthenticatedUser } {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const record = this.passwordResetTokens.get(token);
    if (!record || record.isConsumed) {
      throw new Error('Invalid or expired password reset token.');
    }

    if (new Date(record.expiresAt) < new Date()) {
      this.passwordResetTokens.delete(token);
      throw new Error('Password reset token has expired.');
    }

    const user = this.users.get(record.userId);
    if (!user) throw new Error('User account not found.');

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = this.hashPassword(newPassword, newSalt);

    user.passwordHash = newHash;
    user.salt = newSalt;
    user.updatedAt = new Date().toISOString();
    record.isConsumed = true;

    // Invalidate all existing sessions for security
    for (const [sToken, session] of this.sessions.entries()) {
      if (session.userId === user.id) {
        this.sessions.delete(sToken);
        this.tokenToUserId.delete(sToken);
      }
    }

    return { success: true, user: this.toAuthenticatedUser(user) };
  }

  // ==========================================
  // CORE AUTHENTICATION: REGISTER & LOGIN
  // ==========================================

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
      throw new Error('This account uses external OAuth. Please continue with Google, GitHub, or Facebook.');
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
    if (this.revokedTokens.has(token)) return null;

    const session = this.sessions.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(token);
      this.tokenToUserId.delete(token);
      this.revokedTokens.add(token);
      return null;
    }

    session.lastActiveAt = new Date().toISOString();
    const user = this.users.get(session.userId);
    if (!user || !user.isActive) return null;

    return this.toAuthenticatedUser(user);
  }

  public logout(token: string): void {
    if (token) {
      this.revokedTokens.add(token);
      this.sessions.delete(token);
      this.tokenToUserId.delete(token);
    }
  }

  public isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
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
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Default development researcher account is permanently disabled in production. Valid authentication required.');
    }
    const user = this.users.get('user_default_researcher');
    if (!user) {
      throw new Error('No active default researcher account found in current environment.');
    }
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
