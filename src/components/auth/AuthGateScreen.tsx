/**
 * AI HEAVEN - Mobile-First Authentication Gate Screen
 * Displayed before entering the protected workspace.
 * Features:
 * - Direct authentication gate matching Android mobile guidelines
 * - Dark glass UI using #080B10, #0D1118, #121822, #171F2B, #283242
 * - Real PBKDF2 Password Authentication & Registration (empty inputs, zero dummy credentials)
 * - Official Google and GitHub OAuth Authorization flows (with live configuration badges & setup guidance)
 * - Password visibility toggle
 * - Touch-friendly >= 44px buttons, safe area support, error and loading states
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  Github,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  ChevronRight,
  Phone,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  Info,
  Copy,
  Check
} from 'lucide-react';
import { SkullLogo } from '../common/SkullLogo';
import { apiClient } from '../../services/apiClient';
import { AuthenticatedUser } from '../../types/auth';

interface AuthGateScreenProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
  isBackendConnected: boolean;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onAuthenticated,
  isBackendConnected
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'mfa'>('signin');
  // Clear empty initial inputs - no hardcoded identities or default passwords
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mfaTicket, setMfaTicket] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live provider statuses
  const [providers, setProviders] = useState<any[]>([]);
  const [providerConfigModal, setProviderConfigModal] = useState<any | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Available users list for quick dev identity switching (admin/dev only)
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const list = await apiClient.getAuthProviders();
      if (Array.isArray(list)) {
        setProviders(list);
      }
    } catch {
      // Best effort in dev mode
    }
  };

  const loadUsers = async () => {
    try {
      const users = await apiClient.getAllUsersForSwitcher();
      if (Array.isArray(users) && users.length > 0) {
        setAvailableUsers(users);
      }
    } catch {
      // Best effort in dev mode
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide email and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.loginWithPassword(email.trim(), password);
      if (res.requiresMfa) {
        setMfaTicket(res.mfaTicket);
        setMode('mfa');
        setSuccess('Password accepted. Enter your 6-digit TOTP code to continue.');
        return;
      }
      setSuccess('Identity verified. Opening workspace...');
      setTimeout(() => {
        onAuthenticated(res.user);
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit authentication code.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.verifyMfaLogin(mfaTicket, mfaCode.trim());
      setSuccess('Multi-factor authentication verified. Opening workspace...');
      setTimeout(() => {
        onAuthenticated(res.user);
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'MFA verification failed. Please check code or request new challenge.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) {
      setError('Please fill in all required fields (Full Name, Email, Password).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.registerAccount(email.trim(), password, fullName.trim(), phone.trim() || undefined);
      setSuccess('Account created! Initializing secure workspace session...');
      setTimeout(() => {
        onAuthenticated(res.user);
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check the provided information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const targetProvider = providers.find((p: any) => p.provider === provider);
    if (!targetProvider || !targetProvider.isConfigured) {
      setProviderConfigModal(targetProvider || {
        provider,
        name: provider === 'google' ? 'Google' : 'GitHub',
        missingEnvVars: provider === 'google' ? ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] : ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
        setupInstructions: `Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in environment to enable official OAuth.`
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.startOAuthPopup(provider);
      setSuccess(`${provider === 'google' ? 'Google' : 'GitHub'} verified. Entering workspace...`);
      setTimeout(() => {
        onAuthenticated(res.user);
      }, 400);
    } catch (err: any) {
      setError(err?.message || `${provider} OAuth sign-in failed.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToUser = async (targetUser: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.switchAccount(targetUser.id);
      setSuccess(`Switched to ${targetUser.fullName || targetUser.email}. Entering workspace...`);
      setTimeout(() => {
        onAuthenticated(res.user);
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Failed to switch identity.');
    } finally {
      setIsLoading(false);
    }
  };

  const googleProvider = providers.find((p: any) => p.provider === 'google');
  const githubProvider = providers.find((p: any) => p.provider === 'github');

  const copyCallbackUrl = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-[#F1F4F8] flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8 selection:bg-[#42D9F5]/20 selection:text-[#42D9F5] pt-safe pb-safe">
      {/* Top Bar Branding */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl border border-[#283242] bg-[#121822] flex items-center justify-center shadow-md">
            <SkullLogo className="h-5 w-5" />
          </div>
          <div>
            <span className="font-mono font-bold text-sm text-[#F1F4F8] tracking-wider">AI HEAVEN</span>
            <span className="block text-[10px] font-mono text-[#9AA6B7]">SECURE WORKSPACE GATEWAY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isBackendConnected ? 'bg-[#34D399]' : 'bg-[#FBBF24]'}`} />
          <span className="text-[10px] font-mono text-[#9AA6B7]">
            {isBackendConnected ? 'LIVE ENGINE' : 'LOCAL CACHE'}
          </span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="rounded-2xl border border-[#283242] bg-[#0D1118]/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl space-y-6">
          {/* Header Title */}
          <div className="space-y-1 text-center">
            <h1 className="text-xl sm:text-2xl font-bold font-sans text-[#F1F4F8] tracking-tight">
              {mode === 'signin' && 'Welcome to AI Heaven'}
              {mode === 'signup' && 'Create Your Researcher Account'}
              {mode === 'reset' && 'Password Recovery'}
              {mode === 'mfa' && 'Multi-Factor Challenge'}
            </h1>
            <p className="text-xs text-[#9AA6B7] leading-relaxed">
              {mode === 'signin' && 'Sign in to access Central Brain, Autonomous Droids, and Bug Hunt.'}
              {mode === 'signup' && 'Register your verified operator identity with cryptographic audit logging.'}
              {mode === 'reset' && 'Enter your token and set a new password.'}
              {mode === 'mfa' && 'Enter your 6-digit TOTP authenticator code.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-[#121822] p-1 border border-[#283242]">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
              className={`py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[#171F2B] text-[#42D9F5] shadow-xs'
                  : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className={`py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#171F2B] text-[#42D9F5] shadow-xs'
                  : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-xl border border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171] text-xs flex items-center gap-2.5 font-mono animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399] text-xs flex items-center gap-2.5 font-mono animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="researcher@organization.com"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-3 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-[11px] font-mono text-[#42D9F5] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-10 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA6B7] hover:text-[#F1F4F8] p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-[#42D9F5] hover:bg-[#38c4de] text-[#080B10] font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50 touch-target-44"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Enter Protected Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    placeholder="Alice Smith"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-3 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="alice@aiheaven.org"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-3 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  Phone Number <span className="text-[#9AA6B7]/60">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 555 0100 (Optional)"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-3 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters (letter + number/symbol)"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-10 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA6B7] hover:text-[#F1F4F8] p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-[#42D9F5] hover:bg-[#38c4de] text-[#080B10] font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50 touch-target-44"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Create &amp; Enter Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="p-3 rounded-xl border border-[#42D9F5]/30 bg-[#42D9F5]/10 text-xs text-[#42D9F5] font-mono flex items-center gap-2.5">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Two-Factor Authentication is active for this account.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  6-Digit Authenticator Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA6B7]" />
                  <input
                    type="text"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    autoFocus
                    placeholder="123456"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] pl-10 pr-3 py-2.5 text-base tracking-widest font-mono text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:border-[#42D9F5] focus:outline-none focus:ring-1 focus:ring-[#42D9F5] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="w-full h-11 rounded-xl bg-[#42D9F5] hover:bg-[#38c4de] text-[#080B10] font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50 touch-target-44"
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <span>Verify &amp; Enter Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('signin'); setMfaCode(''); setMfaTicket(''); setError(null); }}
                className="w-full text-center text-xs font-mono text-[#9AA6B7] hover:text-[#F1F4F8] cursor-pointer pt-2"
              >
                &larr; Cancel &amp; Return to Sign In
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@organization.com"
                  className="w-full rounded-xl border border-[#283242] bg-[#121822] px-3.5 py-2.5 text-xs text-[#F1F4F8] focus:border-[#42D9F5] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const res = await apiClient.requestPasswordReset(email);
                    setSuccess(res.message || 'If an account exists, password recovery instructions have been dispatched.');
                    if (res.devResetToken) {
                      setResetToken(res.devResetToken);
                    }
                  } catch (err: any) {
                    setError(err?.message || 'Failed to request reset token');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading || !email}
                className="w-full h-10 rounded-xl bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-xs font-mono font-semibold text-[#42D9F5] transition-colors"
              >
                Request Recovery Token
              </button>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                    Recovery Token
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value.trim())}
                    placeholder="Enter received recovery token (reset_...)"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] px-3.5 py-2.5 text-xs text-[#F1F4F8] focus:border-[#42D9F5] focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-[#9AA6B7] uppercase tracking-wider">
                    New Password (Min 8 Characters)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-[#283242] bg-[#121822] px-3.5 py-2.5 text-xs text-[#F1F4F8] focus:border-[#42D9F5] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await apiClient.confirmPasswordReset(resetToken, newPassword);
                      setSuccess('Password updated securely! Signing in...');
                      setTimeout(() => onAuthenticated(res.user), 500);
                    } catch (err: any) {
                      setError(err?.message || 'Failed to reset password');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading || !resetToken || !newPassword}
                  className="w-full h-10 rounded-xl bg-[#34D399] hover:bg-[#2fb884] text-[#080B10] font-mono font-bold text-xs disabled:opacity-50"
                >
                  Confirm &amp; Sign In
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="w-full text-center text-xs font-mono text-[#9AA6B7] hover:text-[#F1F4F8] cursor-pointer pt-2"
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}

          {/* Social / OAuth Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#283242]" />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
              <span className="bg-[#0D1118] px-2 text-[#9AA6B7]">Or continue with</span>
            </div>
          </div>

          {/* OAuth Buttons with Real Live Configuration Badges */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className={`h-14 rounded-xl border p-2 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-target-44 ${
                googleProvider?.isConfigured
                  ? 'border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-[#F1F4F8]'
                  : 'border-[#283242]/70 bg-[#0D1118] hover:bg-[#121822] text-[#9AA6B7]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
                <Sparkles className="h-3.5 w-3.5 text-[#42D9F5]" />
                <span>Google</span>
              </div>
              <span className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.2 rounded ${
                googleProvider?.isConfigured
                  ? 'bg-[#34D399]/15 text-[#34D399]'
                  : 'bg-[#FBBF24]/15 text-[#FBBF24]'
              }`}>
                {googleProvider?.isConfigured ? 'READY' : 'SETUP REQUIRED'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={isLoading}
              className={`h-14 rounded-xl border p-2 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-target-44 ${
                githubProvider?.isConfigured
                  ? 'border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-[#F1F4F8]'
                  : 'border-[#283242]/70 bg-[#0D1118] hover:bg-[#121822] text-[#9AA6B7]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
                <Github className="h-3.5 w-3.5 text-[#F1F4F8]" />
                <span>GitHub</span>
              </div>
              <span className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.2 rounded ${
                githubProvider?.isConfigured
                  ? 'bg-[#34D399]/15 text-[#34D399]'
                  : 'bg-[#FBBF24]/15 text-[#FBBF24]'
              }`}>
                {githubProvider?.isConfigured ? 'READY' : 'SETUP REQUIRED'}
              </span>
            </button>
          </div>

          {/* Development Quick-Access Switcher (when available) */}
          {availableUsers.length > 0 && (
            <div className="pt-2 border-t border-[#283242]/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#9AA6B7]">
                <span>FAST PROFILE SWITCH</span>
                <Users className="h-3.5 w-3.5 text-[#42D9F5]" />
              </div>
              <div className="space-y-1.5">
                {availableUsers.slice(0, 2).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSwitchToUser(u)}
                    className="w-full flex items-center justify-between p-2 rounded-lg border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-left transition-colors cursor-pointer"
                  >
                    <div className="truncate">
                      <div className="text-xs font-mono text-[#F1F4F8] font-semibold truncate">{u.fullName || u.email}</div>
                      <div className="text-[10px] font-mono text-[#42D9F5] truncate">{u.role} &bull; {u.email}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9AA6B7] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provider Setup Guidance Modal */}
      {providerConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-[#283242] bg-[#0D1118] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 flex items-center justify-center">
                  <Info className="h-5 w-5 text-[#FBBF24]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-[#F1F4F8]">
                    {providerConfigModal.name || providerConfigModal.provider} OAuth Setup
                  </h3>
                  <p className="text-[11px] font-mono text-[#FBBF24]">Configuration Required on Server</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProviderConfigModal(null)}
                className="text-[#9AA6B7] hover:text-[#F1F4F8] p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-[#9AA6B7] leading-relaxed">
                Official {providerConfigModal.name || providerConfigModal.provider} OAuth authorization requires valid server credentials. No client secrets are ever stored in the browser bundle.
              </p>

              <div className="p-3 rounded-xl border border-[#283242] bg-[#121822] space-y-2">
                <div className="text-[11px] font-semibold text-[#42D9F5]">Required Environment Variables:</div>
                <div className="space-y-1">
                  {(providerConfigModal.missingEnvVars || []).map((v: string) => (
                    <div key={v} className="flex items-center gap-2 text-[11px] text-[#F87171]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
                      <code>{v}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#283242] bg-[#121822] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#42D9F5]">Authorized Redirect Callback URL:</span>
                  <button
                    type="button"
                    onClick={() => copyCallbackUrl(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/${providerConfigModal.provider}`)}
                    className="flex items-center gap-1 text-[10px] text-[#9AA6B7] hover:text-[#42D9F5] cursor-pointer"
                  >
                    {copiedCallback ? <Check className="h-3 w-3 text-[#34D399]" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedCallback ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-[#080B10] border border-[#283242] text-[10px] text-[#34D399] break-all select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/${providerConfigModal.provider}` : `/api/auth/callback/${providerConfigModal.provider}`}
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-[#283242] bg-[#121822] text-[11px] text-[#9AA6B7] leading-relaxed">
                {providerConfigModal.setupInstructions}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProviderConfigModal(null)}
                className="h-9 px-4 rounded-xl bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-xs font-mono font-medium text-[#F1F4F8] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="w-full max-w-md mx-auto text-center space-y-1 text-[11px] font-mono text-[#9AA6B7]">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5 text-[#34D399]" />
          <span>PBKDF2 Password Hashing &bull; HS256 JWT Signed Sessions</span>
        </div>
        <p className="text-[10px] text-[#9AA6B7]/60">
          AI Heaven Universal Interoperability Platform &copy; 2026
        </p>
      </div>
    </div>
  );
};
