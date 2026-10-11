/**
 * AI HEAVEN - Multi-Provider Authentication, Identity, and Session Types
 * Compliant with enterprise security standards: PBKDF2 hashing, OAuth 2.0,
 * account linking/switching, tenant isolation, and CSRF protection.
 */

export type AuthProviderType = 'local' | 'google' | 'github' | 'microsoft' | 'apple';

export interface LinkedIdentity {
  provider: AuthProviderType;
  providerUserId: string;
  email: string;
  linkedAt: string;
  lastLoginAt: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'security_researcher' | 'auditor';
  isActive: boolean;
  isEmailVerified: boolean;
  avatarUrl?: string;
  tenantId: string;
  linkedIdentities: LinkedIdentity[];
  activeSessionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthProviderStatus {
  provider: AuthProviderType;
  name: string;
  isConfigured: boolean;
  isEnabled: boolean;
  missingEnvVars: string[];
  setupGuideUrl?: string;
  setupInstructions: string;
  clientIdPreview?: string;
  isConnectedForUser: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface LoginRequest {
  email: string;
  password?: string;
  provider?: AuthProviderType;
  oauthToken?: string;
  code?: string;
  state?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  fullName: string;
}

export interface LinkAccountRequest {
  provider: AuthProviderType;
  providerUserId: string;
  email: string;
  tokenOrCode?: string;
}

export interface AccountSwitchRequest {
  targetUserId: string;
}
