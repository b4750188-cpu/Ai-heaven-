/**
 * AI HEAVEN - Multi-Provider Authentication, Identity, and Session Types
 * Compliant with enterprise security standards: PBKDF2 hashing, OAuth 2.0,
 * account linking/switching, tenant isolation, CSRF protection, and cost transparency.
 */

export type AuthProviderType =
  | 'local'
  | 'google'
  | 'github'
  | 'facebook'
  | 'microsoft'
  | 'apple'
  | 'discord';

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

export interface ProviderCostTransparency {
  costModel: 'Free Tier Available' | 'Free with Usage Limits' | 'Requires Paid Developer Program' | 'Enterprise Subscription';
  freeTierDetails: string;
  knownCostsDescription: string;
  isThirdPartyBillingRequired: boolean;
}

export interface ProviderCredentialRequirements {
  publicClientIdentifiers: string[];
  confidentialSecrets: string[];
  authorizedCallbackUrl: string;
  developerConsoleUrl: string;
  requiredPermissions: string[];
  domainVerificationRequired: boolean;
}

export interface AuthProviderStatus {
  provider: AuthProviderType;
  name: string;
  isConfigured: boolean;
  isEnabled: boolean;
  statusLabel: 'READY' | 'CONFIGURED' | 'SETUP_REQUIRED' | 'BLOCKED_MISSING_CREDENTIALS';
  missingEnvVars: string[];
  setupGuideUrl?: string;
  setupInstructions: string;
  clientIdPreview?: string;
  isConnectedForUser: boolean;
  credentials: ProviderCredentialRequirements;
  costTransparency: ProviderCostTransparency;
}

export interface AuthTokens {
  accessToken: string;
  token?: string;
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

export interface PasswordResetTokenRecord {
  token: string;
  email: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  isConsumed: boolean;
}

export interface EmailVerificationTokenRecord {
  token: string;
  email: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  isConsumed: boolean;
}

export interface OAuthStateRecord {
  state: string;
  provider: AuthProviderType;
  expiresAt: string;
  createdAt: string;
}
