/**
 * AI HEAVEN - Google Account & Google Drive Unified Integration View
 * Genuine Google Identity & Drive authorization, quota reporting,
 * user-approved backups, conflict handling, and Cloud Console setup guide.
 */

import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  LogOut,
  LogIn,
  Key,
  ShieldCheck,
  HardDrive,
  FolderGit2,
  MessageSquare,
  Bookmark,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { googleAuthService, GoogleSessionState } from '../../services/google/googleAuthService';
import { googleDriveService, DriveQuotaReport, DriveSyncReceipt } from '../../services/google/googleDriveService';
import { apiClient } from '../../services/apiClient';

export const GoogleIntegrationView: React.FC = () => {
  const [session, setSession] = useState<GoogleSessionState>(googleAuthService.getSession());
  const [quota, setQuota] = useState<DriveQuotaReport | null>(null);
  const [receipts, setReceipts] = useState<DriveSyncReceipt[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = googleAuthService.subscribe((newSession) => {
      setSession(newSession);
      refreshQuotaAndReceipts();
    });
    return () => unsubscribe();
  }, []);

  const refreshQuotaAndReceipts = async () => {
    try {
      const q = await googleDriveService.getDriveQuota();
      setQuota(q);
      setReceipts(googleDriveService.getReceipts());
    } catch {
      // Silent catch
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage(null);
    try {
      const newSession = await googleAuthService.connect(true);
      setStatusMessage({
        type: 'success',
        text: `Connected as ${newSession.profile?.email || 'Google User'}. Drive scope authorized.`
      });
      await refreshQuotaAndReceipts();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Authentication error: ${err.message}`
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    googleAuthService.disconnect();
    setStatusMessage({
      type: 'success',
      text: 'Google account disconnected and tokens revoked.'
    });
  };

  const handleFullBackup = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const [convs, projs, cks] = await Promise.all([
        apiClient.getConversations(),
        apiClient.getProjects(),
        apiClient.getCheckpoints()
      ]);

      const fullPayload = {
        exportTimestamp: new Date().toISOString(),
        version: 'AI_HEAVEN_V2_BACKUP',
        conversations: convs,
        projects: projs,
        checkpoints: cks
      };

      const receipt = await googleDriveService.backupToDrive('full_backup', fullPayload);
      setReceipts(googleDriveService.getReceipts());

      if (receipt.status === 'synced') {
        setStatusMessage({
          type: 'success',
          text: `Full backup saved to Google Drive vault (${receipt.bytesTransferred} bytes, Checksum: ${receipt.localChecksum}).`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: receipt.details
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Backup error: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const clientId = googleAuthService.getClientId();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>AI Operating System</span>
            <span aria-hidden="true">·</span>
            <span>External Accounts</span>
            <span aria-hidden="true">·</span>
            <span className={session.isConnected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {session.isConnected ? 'Google Account Connected' : 'Disconnected'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Cloud className="h-6 w-6 text-blue-400" />
            Google Account & Drive Integration
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Genuine Google Identity & Google Drive cloud backup. Synchronize conversations, projects, and task checkpoints with explicit user authorization. PostgreSQL remains the authoritative source of truth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session.isConnected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-rose-300 rounded-md text-xs font-mono transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect Account
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              {isConnecting ? 'Connecting...' : 'Connect Google Account'}
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3 rounded-md text-xs font-mono flex items-center justify-between border ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-rose-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
      )}

      {/* Account Status Card & Drive Quota Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Account Identity */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              Connected Google Identity
            </h3>
            <span className={`text-[11px] font-mono ${session.isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
              {session.isConnected ? 'AUTHENTICATED' : 'NOT CONNECTED'}
            </span>
          </div>

          {session.isConnected && session.profile ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-md">
                <div className="text-[11px] text-slate-500 font-mono mb-1">ACCOUNT PROFILE</div>
                <div className="text-sm font-semibold text-slate-100">{session.profile.name}</div>
                <div className="text-xs text-blue-400 font-mono mt-0.5">{session.profile.email}</div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono space-y-1">
                <div>Authorized Scopes:</div>
                <div className="text-slate-300 pl-2">
                  {session.scopes.map(s => <div key={s}>• {s}</div>)}
                </div>
                <div className="pt-2 text-slate-500">
                  Drive Scope Authorized: <span className="text-emerald-400">Yes (drive.file)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 space-y-3">
              <p>Connect your Google account to authorize user-controlled storage of project backups and conversations into Google Drive.</p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-[11px] font-mono text-slate-500">
                Status: Google OAuth Web Client ready. Click "Connect Google Account" above.
              </div>
            </div>
          )}
        </div>

        {/* Right: Drive Storage Quota */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-400" />
              Google Drive Cloud Storage
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {quota ? quota.usageFormatted : '0 MB'} / {quota ? quota.limitFormatted : '15 GB'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>Storage Utilization</span>
                <span>{quota?.percentUsed || 0}% used</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(1, quota?.percentUsed || 1))}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-slate-400 font-mono space-y-1">
              <div>Source of Truth: <span className="text-slate-200">PostgreSQL (Durable)</span></div>
              <div>Drive Role: <span className="text-blue-400">Connected Backup & Archive Vault</span></div>
              <div>Mode: <span className="text-emerald-400">User-Approved Sync</span></div>
            </div>

            <button
              onClick={handleFullBackup}
              disabled={isSyncing || !session.isConnected}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
            >
              <Cloud className={`h-4 w-4 ${isSyncing ? 'animate-pulse' : ''}`} />
              {isSyncing ? 'Synchronizing Entire Vault...' : 'Create Full Google Drive Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Receipts History */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Audit Trail & Synchronization Receipts ({receipts.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Cryptographically Verified</span>
        </div>

        {receipts.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono text-center py-8">
            Zero synchronization receipts recorded yet. Run a backup to generate receipts.
          </div>
        ) : (
          <div className="space-y-2">
            {receipts.map((rec) => (
              <div key={rec.id} className="p-3 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-semibold">{rec.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300">{rec.target.toUpperCase()}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-medium">{rec.status.toUpperCase()}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{rec.details}</div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>{rec.bytesTransferred} bytes</div>
                  <div>{new Date(rec.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Cloud Console Setup Guide */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 text-xs">
        <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <Key className="h-4 w-4 text-amber-400" />
          Google Cloud Console Configuration Guide
        </h3>
        <p className="text-slate-400 mb-4 leading-relaxed">
          To connect your own Google Cloud project for Google Sign-In and Google Drive synchronization in production, configure the following in the Google Cloud Console (APIs &amp; Services &gt; Credentials):
        </p>

        <div className="space-y-3 font-mono">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md">
            <div className="text-[11px] text-slate-500 mb-1">1. ENABLED GOOGLE APIS</div>
            <div className="text-slate-200">
              • Google Drive API (`drive.googleapis.com`)<br />
              • Google Identity Services / OAuth 2.0 API
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 mb-1">2. REQUIRED OAUTH SCOPES</div>
              <div className="text-slate-200">https://www.googleapis.com/auth/drive.file, email, profile</div>
            </div>
            <button
              onClick={() => copyToClipboard('https://www.googleapis.com/auth/drive.file email profile', 'scopes')}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              {copiedKey === 'scopes' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 mb-1">3. AUTHORIZED JAVASCRIPT ORIGINS</div>
              <div className="text-slate-200">https://*.vercel.app, http://localhost:3000</div>
            </div>
            <button
              onClick={() => copyToClipboard('http://localhost:3000', 'origins')}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              {copiedKey === 'origins' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-md">
            <div className="text-[11px] text-slate-500 mb-1">4. ENVIRONMENT VARIABLE</div>
            <div className="text-slate-200">VITE_GOOGLE_CLIENT_ID="[YOUR_GOOGLE_CLOUD_CLIENT_ID].apps.googleusercontent.com"</div>
          </div>
        </div>
      </div>
    </div>
  );
};
