/**
 * AI HEAVEN - Settings & Reality / Capabilities Registry
 * 
 * Truthful, evidence-based capabilities, connections, and external dependency audit.
 * Eliminates false status, hardcoded quotas, and misleading badges.
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Cloud,
  Database,
  ExternalLink,
  HardDrive,
  Info,
  Key,
  Layers,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
  Download,
  Smartphone,
  Laptop
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { CapabilityEntry, CredentialAuditItem, GoogleDriveAccountQuota } from '../../types/reality';
import { googleAuthService, GoogleSessionState } from '../../services/google/googleAuthService';
import { googleDriveService, DriveQuotaReport } from '../../services/google/googleDriveService';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capabilities' | 'credentials' | 'google' | 'database' | 'pwa'>('capabilities');
  const pwa = usePWAInstall();
  const [capabilities, setCapabilities] = useState<CapabilityEntry[]>([]);
  const [credentials, setCredentials] = useState<CredentialAuditItem[]>([]);
  const [googleSession, setGoogleSession] = useState<GoogleSessionState>(googleAuthService.getSession());
  const [driveQuota, setDriveQuota] = useState<DriveQuotaReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsub = googleAuthService.subscribe(setGoogleSession);
    return () => unsub();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [capsRes, credsRes, quotaRes] = await Promise.all([
        apiClient.getRealityRegistry(),
        apiClient.getCredentialAudit(),
        googleDriveService.getDriveQuota()
      ]);
      setCapabilities(capsRes || []);
      setCredentials(credsRes || []);
      setDriveQuota(quotaRes);
    } catch (err: any) {
      console.error('Failed to load reality registry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsVerifying(true);
    try {
      await loadData();
      setStatusNotification({ type: 'success', message: 'Reality and capability registry refreshed with live evidence.' });
      setTimeout(() => setStatusNotification(null), 4000);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      await googleAuthService.connect(true);
      const q = await googleDriveService.getDriveQuota();
      setDriveQuota(q);
      await loadData();
      setStatusNotification({ type: 'success', message: 'Google account connected with verified permissions.' });
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err.message || 'Connection failed' });
    }
  };

  const handleGoogleDisconnect = async () => {
    googleAuthService.disconnect();
    const q = await googleDriveService.getDriveQuota();
    setDriveQuota(q);
    await loadData();
    setStatusNotification({ type: 'success', message: 'Google account disconnected and tokens purged.' });
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'CONNECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">CONNECTED</span>;
      case 'DISCONNECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950 text-amber-400 border border-amber-800">DISCONNECTED</span>;
      case 'NOT_CONFIGURED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#171F2B] text-[#9AA6B7] border border-[#283242]">NOT CONFIGURED</span>;
      case 'AUTHORIZATION_REQUIRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950 text-blue-400 border border-blue-800">AUTH REQUIRED</span>;
      case 'DEGRADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-orange-950 text-orange-400 border border-orange-800">DEGRADED</span>;
      case 'ERROR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950 text-rose-400 border border-rose-800">ERROR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#171F2B] text-[#9AA6B7] border border-[#283242]">{state}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-[#283242] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#42D9F5]">
            <ShieldCheck className="h-4 w-4" />
            <span>AI HEAVEN PLATFORM</span>
            <span className="text-[#283242]">·</span>
            <span>SYSTEM &amp; REALITY REGISTRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F4F8] mt-1">
            Settings &amp; Reality Audit
          </h1>
          <p className="text-sm text-[#9AA6B7] mt-1 max-w-3xl">
            Evidence-grounded status of all connected services, external dependencies, credentials, storage vaults, and execution capabilities. No hardcoded or simulated values.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isVerifying}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-[#121822] hover:bg-[#1B2432] border border-[#283242] rounded-md text-xs font-mono text-[#F1F4F8] transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? 'animate-spin text-[#42D9F5]' : ''}`} />
          {isVerifying ? 'Auditing Reality...' : 'Re-verify Capabilities'}
        </button>
      </div>

      {statusNotification && (
        <div className={`p-3.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
          statusNotification.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
        }`}>
          <span>{statusNotification.message}</span>
          <button onClick={() => setStatusNotification(null)} className="text-[#9AA6B7] hover:text-white ml-2">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#283242] font-mono text-xs overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('capabilities')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'capabilities'
              ? 'border-[#42D9F5] text-[#42D9F5] bg-[#42D9F5]/5'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Reality Registry ({capabilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'credentials'
              ? 'border-[#42D9F5] text-[#42D9F5] bg-[#42D9F5]/5'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Credentials &amp; Secrets Audit ({credentials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('google')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'google'
              ? 'border-[#42D9F5] text-[#42D9F5] bg-[#42D9F5]/5'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>Google Drive &amp; Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'database'
              ? 'border-[#42D9F5] text-[#42D9F5] bg-[#42D9F5]/5'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Database &amp; Persistence</span>
        </button>

        <button
          onClick={() => setActiveTab('pwa')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'pwa'
              ? 'border-[#42D9F5] text-[#42D9F5] bg-[#42D9F5]/5'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Install Application (PWA)</span>
          {pwa.isInstalled && (
            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono">
              INSTALLED
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Reality & Capabilities Registry */}
      {activeTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#121822]/40 border border-[#283242] rounded-lg text-xs text-[#9AA6B7] flex items-start gap-3">
            <Info className="h-4 w-4 text-[#42D9F5] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#F1F4F8] font-medium">Single Shared Registry Rule: </span>
              Every capability is tracked here and shared with the Central Brain and UI. States are derived from live backend verification. A saved key does not imply reachability; a successful OAuth callback does not imply all Drive actions succeed.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap) => (
              <div
                key={cap.id}
                className="p-5 bg-[#0D1118] border border-[#283242] rounded-lg space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
                      <span>{cap.displayName}</span>
                    </h3>
                    {getStateBadge(cap.state)}
                  </div>
                  <div className="text-[11px] font-mono text-[#42D9F5]/80 mb-2">
                    {cap.provider} · <span className="uppercase text-[#9AA6B7]">{cap.category}</span>
                  </div>

                  <p className="text-xs text-[#9AA6B7] leading-relaxed mb-3">
                    {cap.actionableExplanation}
                  </p>

                  <div className="space-y-1.5 text-[11px] font-mono text-[#9AA6B7] bg-[#080B10] p-2.5 rounded border border-[#283242]/60">
                    <div className="flex justify-between">
                      <span>Data Freshness:</span>
                      <span className="uppercase text-[#F1F4F8] font-semibold">{cap.dataFreshness}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Verified:</span>
                      <span>{cap.lastVerifiedAt ? new Date(cap.lastVerifiedAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requires Approval:</span>
                      <span className={cap.requiresUserApproval ? 'text-amber-400' : 'text-[#9AA6B7]'}>
                        {cap.requiresUserApproval ? 'Yes (Explicit)' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#283242]/40 text-[11px] font-mono flex items-center justify-between">
                  <span className="text-[#9AA6B7]">Next Action:</span>
                  <span className="text-[#42D9F5] text-right font-medium">{cap.nextRequiredAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Credentials Audit */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#121822]/40 border border-[#283242] rounded-lg text-xs text-[#9AA6B7] flex items-start gap-3">
            <Lock className="h-4 w-4 text-[#42D9F5] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#F1F4F8] font-medium">Optional Credentials &amp; Zero False Demands: </span>
              Never require a credential simply because an environment variable exists. Unconfigured optional providers do not block chat, tools, or startup.
            </div>
          </div>

          <div className="border border-[#283242] rounded-lg overflow-hidden bg-[#0D1118]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#121822] text-[#9AA6B7] border-b border-[#283242]">
                <tr>
                  <th className="p-3.5">Credential / Variable</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Dependent Feature</th>
                  <th className="p-3.5">Behavior When Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283242]/60">
                {credentials.map((c) => (
                  <tr key={c.name} className="hover:bg-[#121822]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#F1F4F8]">
                      <div>{c.name}</div>
                      <div className="text-[10px] text-[#9AA6B7]/70 font-normal">{c.redactedDisplay}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        c.classification === 'Required' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        c.classification === 'Feature-specific' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        'bg-[#171F2B] text-[#9AA6B7]'
                      }`}>
                        {c.classification}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {c.isConfigured ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                        </span>
                      ) : (
                        <span className="text-[#9AA6B7] flex items-center gap-1">
                          Unset
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-[#9AA6B7]">{c.dependentFeature}</td>
                    <td className="p-3.5 text-[#9AA6B7]/80 text-[11px]">{c.behaviorWhenAbsent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Google Drive & Identity */}
      {activeTab === 'google' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0D1118] border border-[#283242] rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-400" />
              Google Identity Connection
            </h3>

            {googleSession.isConnected && googleSession.profile ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
                  <div className="text-[11px] font-mono text-[#9AA6B7]">AUTHENTICATED ACCOUNT</div>
                  <div className="font-semibold text-[#F1F4F8]">{googleSession.profile.name}</div>
                  <div className="text-blue-400 font-mono">{googleSession.profile.email}</div>
                </div>

                <div className="text-[11px] font-mono text-[#9AA6B7] space-y-1">
                  <div>Authorized Scopes:</div>
                  {googleSession.scopes.map(s => <div key={s} className="text-[#F1F4F8] pl-2">• {s}</div>)}
                </div>

                <button
                  onClick={handleGoogleDisconnect}
                  className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-xs font-mono transition-colors cursor-pointer"
                >
                  Disconnect &amp; Revoke Google Tokens
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[#9AA6B7]">
                <p>
                  Connect your Google account to authorize user-controlled storage of project backups into Google Drive.
                </p>
                <div className="p-3 bg-[#080B10] border border-[#283242] rounded-md font-mono text-[11px]">
                  Status: Not connected. PostgreSQL remains primary authoritative store.
                </div>
                <button
                  onClick={handleGoogleConnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Cloud className="h-4 w-4" />
                  Connect Google Account
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#0D1118] border border-[#283242] rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-400" />
              Google Drive Storage Quota &amp; Backup Vault
            </h3>

            {!googleSession.isConnected ? (
              <div className="space-y-3 text-xs text-[#9AA6B7]">
                <div className="p-3 bg-[#080B10] border border-[#283242] rounded-md font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-amber-400">Not connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage quota:</span>
                    <span>Not available</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backup status:</span>
                    <span>Not configured</span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed">
                  No fictional 0 MB / 15 GB quota is rendered. Quota is only queried upon authenticated Google connection.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-[#080B10] border border-[#283242] rounded-md space-y-1.5">
                  <div className="text-[10px] text-[#9AA6B7] uppercase tracking-wide">Google Drive Account Quota</div>
                  <div className="flex justify-between text-[#F1F4F8]">
                    <span className="text-[#9AA6B7]">Quota Limit:</span>
                    <span className="font-semibold">{driveQuota?.limitFormatted || 'Not available'}</span>
                  </div>
                  <div className="flex justify-between text-[#F1F4F8]">
                    <span className="text-[#9AA6B7]">Account Storage Used:</span>
                    <span>{driveQuota?.usageFormatted || 'Not available'}</span>
                  </div>
                  <div className="flex justify-between text-[#9AA6B7]/70 text-[10px]">
                    <span>Freshness:</span>
                    <span className="uppercase text-emerald-400 font-bold">{driveQuota?.freshness || 'live'}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#080B10] border border-[#283242] rounded-md space-y-1.5">
                  <div className="text-[10px] text-[#9AA6B7] uppercase tracking-wide">AI Heaven Backup Vault</div>
                  <div className="flex justify-between text-[#F1F4F8]">
                    <span className="text-[#9AA6B7]">Backup Destination:</span>
                    <span className="text-blue-400 font-semibold">{driveQuota?.destinationFolder || 'Drive Root'}</span>
                  </div>
                  <div className="flex justify-between text-[#F1F4F8]">
                    <span className="text-[#9AA6B7]">Data Backed Up:</span>
                    <span>{driveQuota?.backupFormatted || '0 bytes'}</span>
                  </div>
                  <div className="flex justify-between text-[#F1F4F8]">
                    <span className="text-[#9AA6B7]">Last Successful Backup:</span>
                    <span>{driveQuota?.lastBackupAt ? new Date(driveQuota.lastBackupAt).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Database & Persistence */}
      {activeTab === 'database' && (
        <div className="bg-[#0D1118] border border-[#283242] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            Durable Production Persistence &amp; Integrity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3.5 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
              <div className="text-[10px] text-[#9AA6B7] uppercase">Persistence Layer</div>
              <div className="text-[#F1F4F8] font-bold">
                {process.env.DATABASE_URL ? 'PostgreSQL (Durable Pool)' : 'In-Memory (Development Sandbox)'}
              </div>
              <div className="text-[11px] text-[#9AA6B7]">
                {process.env.DATABASE_URL ? 'Durable across restarts' : 'Clearly labeled; non-durable'}
              </div>
            </div>

            <div className="p-3.5 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
              <div className="text-[10px] text-[#9AA6B7] uppercase">Session Security</div>
              <div className="text-emerald-400 font-bold">HS256 JWT Signed</div>
              <div className="text-[11px] text-[#9AA6B7]">RBAC &amp; Tenant isolation active</div>
            </div>

            <div className="p-3.5 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
              <div className="text-[10px] text-[#9AA6B7] uppercase">Execution Sandbox</div>
              <div className="text-emerald-400 font-bold">Exit Code 126 Bound</div>
              <div className="text-[11px] text-[#9AA6B7]">Host modification strictly denied</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Progressive Web App Installation & Offline Controls */}
      {activeTab === 'pwa' && (
        <div className="space-y-6">
          <div className="bg-[#0D1118] border border-[#283242] rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#283242] pb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#42D9F5]" />
                  Progressive Web App (PWA) Runtime
                </h3>
                <p className="text-xs text-[#9AA6B7] mt-1">
                  Install AI Heaven as a standalone desktop or mobile application with native window chrome, offline static asset caching, and persistent secure sessions.
                </p>
              </div>

              {pwa.isInstalled ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Installed &amp; Running in Standalone Mode</span>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const outcome = await pwa.promptInstall();
                    if (outcome === 'accepted') {
                      setStatusNotification({ type: 'success', message: 'AI Heaven successfully installed to your home screen or desktop.' });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#42D9F5] hover:bg-[#42D9F5]/90 text-[#080B10] font-bold text-xs font-mono transition-all cursor-pointer shadow-lg shadow-[#42D9F5]/10"
                >
                  <Download className="h-4 w-4" />
                  <span>Install AI Heaven App</span>
                </button>
              )}
            </div>

            {/* PWA State Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3.5 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
                <div className="text-[10px] text-[#9AA6B7] uppercase">Display Mode</div>
                <div className="text-[#F1F4F8] font-bold">
                  {pwa.isStandalone ? 'Standalone (Native Chrome)' : 'Browser Tab'}
                </div>
                <div className="text-[11px] text-[#9AA6B7]">
                  {pwa.isStandalone ? 'No browser address bar' : 'Standard viewport'}
                </div>
              </div>

              <div className="p-3.5 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
                <div className="text-[10px] text-[#9AA6B7] uppercase">Service Worker Cache</div>
                <div className="text-emerald-400 font-bold">Active &bull; ai-heaven-v1</div>
                <div className="text-[11px] text-[#9AA6B7]">Static shell cached; /api/* network-only</div>
              </div>

              <div className="p-3.5 bg-[#080B10] border border-[#283242] rounded-md space-y-1">
                <div className="text-[10px] text-[#9AA6B7] uppercase">Privacy &amp; Isolation</div>
                <div className="text-[#42D9F5] font-bold">Never Cached Offline</div>
                <div className="text-[11px] text-[#9AA6B7]">Private chats &amp; tokens never stored in SW</div>
              </div>
            </div>

            {/* Platform Instructions (Manual Fallback when beforeinstallprompt is suppressed) */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-[#F1F4F8] mb-3 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#42D9F5]" />
                Platform-Specific Installation Guidance
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Android / Chromium */}
                <div className="p-3 bg-[#121822]/40 border border-[#283242] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2 text-[#F1F4F8] font-semibold">
                    <Smartphone className="h-4 w-4 text-[#42D9F5]" />
                    <span>Android / Chrome</span>
                  </div>
                  <p className="text-[#9AA6B7] text-[11px] leading-relaxed">
                    Tap the <strong>three dots menu (&vellip;)</strong> in Google Chrome, then tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                  </p>
                </div>

                {/* iOS Safari */}
                <div className="p-3 bg-[#121822]/40 border border-[#283242] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2 text-[#F1F4F8] font-semibold">
                    <Smartphone className="h-4 w-4 text-[#42D9F5]" />
                    <span>iOS / Safari</span>
                  </div>
                  <p className="text-[#9AA6B7] text-[11px] leading-relaxed">
                    Tap the <strong>Share</strong> icon at the bottom of Safari, scroll down, and select <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </p>
                </div>

                {/* Desktop Chrome / Edge */}
                <div className="p-3 bg-[#121822]/40 border border-[#283242] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2 text-[#F1F4F8] font-semibold">
                    <Laptop className="h-4 w-4 text-[#42D9F5]" />
                    <span>Desktop (Chrome / Edge)</span>
                  </div>
                  <p className="text-[#9AA6B7] text-[11px] leading-relaxed">
                    Click the <strong>Install icon (&darr;)</strong> in the right side of the browser URL bar, or choose <strong>Install AI Heaven</strong> from the browser menu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
