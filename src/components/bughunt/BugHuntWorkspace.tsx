/**
 * AI HEAVEN - Autonomous Bug-Bounty Hunting Platform Workspace
 * 
 * Features:
 * - Two Prominent Actions: START BUG HUNTING & CUSTOM BUG HUNT
 * - Coordinated 11 specialized security droids fleet
 * - Official HackerOne status, credentials audit, and Scope Snapshots
 * - 6-tier finding classification (VERIFIED, NEEDS REVIEW, SUSPECTED, FALSE POSITIVE, NOT REPRODUCIBLE, BLOCKED)
 * - Interrupted job resurrection and pre-flight scope re-verification
 * - Cryptographic SHA-256 evidence proofs & sensitive data redaction
 * - Complete tenant-isolated bug hunt history
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  Terminal,
  Play,
  Settings,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Download,
  ExternalLink,
  ChevronRight,
  Bot,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Globe,
  Sliders,
  Cpu,
  Layers,
  Sparkles,
  Award,
  Pause,
  RotateCcw,
  Eye,
  Check,
  Ban
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  BugHuntConfig,
  BugHuntJob,
  BugHuntScope,
  FindingReviewStatus,
  SecurityDroid,
  SecurityProgram,
  UserBugHuntWorkspace,
  VulnerabilityFinding
} from '../../types/bughunt';
import { AuthenticatedUser } from '../../types/auth';

interface BugHuntWorkspaceProps {
  currentUser: AuthenticatedUser | null;
  onOpenAuth: () => void;
}

export const BugHuntWorkspace: React.FC<BugHuntWorkspaceProps> = ({
  currentUser,
  onOpenAuth
}) => {
  const [workspace, setWorkspace] = useState<UserBugHuntWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'droids' | 'hackerone' | 'programs' | 'hunts'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BugHuntJob | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<VulnerabilityFinding | null>(null);
  const [findingFilter, setFindingFilter] = useState<string>('ALL');

  // HackerOne Integration state
  const [h1Status, setH1Status] = useState<any>(null);
  const [h1Programs, setH1Programs] = useState<any[]>([]);

  // Custom Hunt Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customTarget, setCustomTarget] = useState('test-target.sandbox.local');
  const [customTargetType, setCustomTargetType] = useState<'domain' | 'web_api' | 'github_repo' | 'smart_contract' | 'cloud_config'>('domain');
  const [selectedDroids, setSelectedDroids] = useState<string[]>([
    'commander_droid',
    'recon_droid',
    'research_droid',
    'source_code_droid',
    'api_fuzzer_droid',
    'dependency_droid',
    'injection_droid',
    'secrets_droid',
    'verifier_droid',
    'adversarial_review_droid',
    'remediation_droid',
    'reporting_droid'
  ]);
  const [permittedTechniques, setPermittedTechniques] = useState<string[]>([
    'passive_recon',
    'stack_fingerprinting',
    'api_schema_fuzzing',
    'auth_boundary_probing',
    'safe_injection_testing',
    'secret_leak_scanning',
    'sast_code_audit',
    'dependency_audit'
  ]);
  const [verificationDepth, setVerificationDepth] = useState<'fast_triage' | 'deep_evidence' | 'dual_droid_consensus'>('dual_droid_consensus');
  const [reportingStyle, setReportingStyle] = useState<'hackerone' | 'bugcrowd' | 'executive'>('hackerone');
  const [scopeVerificationResult, setScopeVerificationResult] = useState<{ authorized: boolean; reason?: string } | null>(null);

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspace();
    loadHackerOneDetails();
  }, [currentUser]);

  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getBugHuntWorkspace();
      setWorkspace(data);
      if (data.recentHunts?.length > 0 && !selectedJob) {
        setSelectedJob(data.recentHunts[0]);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to load workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHackerOneDetails = async () => {
    try {
      const [status, progs] = await Promise.all([
        apiClient.getHackerOneStatus(),
        apiClient.getHackerOnePrograms()
      ]);
      setH1Status(status);
      setH1Programs(progs);
    } catch {
      // Best effort
    }
  };

  // ACTION 1: START BUG HUNTING (1-Click Autonomous Flow)
  const handleStartAutonomousHunt = async () => {
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const job = await apiClient.startAutonomousBugHunt('prog_aiheaven_internal');
      setSelectedJob(job);
      setActionSuccess(`Autonomous hunt launched! Multi-droid fleet completed multi-stage testing on ${job.target}.`);
      await loadWorkspace();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start autonomous hunt.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check Scope
  const handleVerifyScope = async (targetVal: string) => {
    try {
      const result = await apiClient.verifyTargetScope(targetVal);
      setScopeVerificationResult(result);
    } catch {
      setScopeVerificationResult({ authorized: false, reason: 'Failed to evaluate scope rules.' });
    }
  };

  // ACTION 2: CUSTOM BUG HUNT
  const handleLaunchCustomHunt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const config: BugHuntConfig = {
        scope: {
          targetType: customTargetType,
          targetValue: customTarget,
          allowedHosts: [customTarget, `*.${customTarget}`],
          disallowedPaths: ['/logout', '/delete', '/admin/reset']
        },
        selectedDroids: selectedDroids as any,
        permittedTechniques: permittedTechniques as any,
        verificationDepth,
        reportingStyle
      };

      const job = await apiClient.startCustomBugHunt(`Custom Hunt: ${customTarget}`, config);
      setSelectedJob(job);
      setIsCustomModalOpen(false);
      setActionSuccess(`Custom bug hunt completed for ${customTarget} with ${job.findings.length} findings!`);
      await loadWorkspace();
    } catch (err: any) {
      setActionError(err.message || 'Custom hunt failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Hunt
  const handleCancelHunt = async (huntId: string) => {
    try {
      const updated = await apiClient.cancelBugHunt(huntId, 'Operator cancellation');
      setSelectedJob(updated);
      setActionSuccess('Bug hunt cancelled cleanly.');
      await loadWorkspace();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel hunt.');
    }
  };

  // Resume Hunt
  const handleResumeHunt = async (huntId: string) => {
    setIsLoading(true);
    try {
      const updated = await apiClient.resumeBugHunt(huntId);
      setSelectedJob(updated);
      setActionSuccess('Bug hunt resumed with pre-flight scope re-check verified.');
      await loadWorkspace();
    } catch (err: any) {
      setActionError(err.message || 'Failed to resume hunt.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setActionSuccess('Copied to clipboard.');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const downloadReport = (job: BugHuntJob) => {
    if (!job.reportMarkdown) return;
    const blob = new Blob([job.reportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vulnerability-Report-${job.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateFindingStatus = async (findingId: string, newStatus: string, notes?: string) => {
    try {
      const updated = await apiClient.updateFindingStatus(findingId, newStatus, notes);
      setActionSuccess(`Finding status updated to ${newStatus}.`);
      if (selectedFinding && selectedFinding.id === findingId) {
        setSelectedFinding(updated);
      }
      await loadWorkspace();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update finding status.');
    }
  };

  const handleSubmitToHackerOne = async (findingId: string) => {
    try {
      const res = await apiClient.submitFindingToHackerOne(findingId);
      if (res.success) {
        setActionSuccess(res.message);
      } else {
        setActionError(res.message);
      }
    } catch (err: any) {
      setActionError(err.message || 'HackerOne submission failed.');
    }
  };

  const allFindings = workspace?.recentHunts?.flatMap(h => h.findings) || [];
  const filteredFindings = findingFilter === 'ALL'
    ? allFindings
    : allFindings.filter(f => f.verificationStatus === findingFilter);

  return (
    <div className="min-h-full bg-[#080B10] text-[#F1F4F8] p-4 sm:p-6 space-y-6">
      {/* Top Banner / Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#121822] border border-[#283242] rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#42D9F5]/10 border border-[#42D9F5]/30 flex items-center justify-center text-[#42D9F5]">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#F1F4F8]">AI Heaven Bug-Bounty Platform</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#42D9F5]/10 text-[#42D9F5] border border-[#42D9F5]/30 rounded font-mono">
                EVIDENCE ENGINE
              </span>
            </div>
            <p className="text-xs text-[#9AA6B7] mt-0.5">
              11-Droid Fleet &bull; HackerOne Scope Snapshots &bull; SHA-256 Proof Seals &bull; Sensitive Data Redacted
            </p>
          </div>
        </div>

        {/* Tenant / Auth Identity Box */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-[#171F2B] border border-[#283242] rounded-lg text-xs font-mono">
            <span className="text-[#9AA6B7]/70 block text-[10px] uppercase tracking-wider">Tenant Workspace</span>
            <span className="font-semibold text-[#F1F4F8]">{currentUser?.fullName || 'Lead Bounty Hunter'}</span>
            <span className="text-[10px] text-[#42D9F5] ml-1.5">({workspace?.tenantId || 'tenant_researcher_01'})</span>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-2 bg-[#171F2B] hover:bg-[#202b3c] text-[#F1F4F8] text-xs font-medium rounded-lg border border-[#283242] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#9AA6B7]" />
            <span>Manage Access</span>
          </button>
        </div>
      </div>

      {/* Prominent Action Callouts: START BUG HUNTING & CUSTOM BUG HUNT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ACTION 1: START BUG HUNTING (Autonomous Flow) */}
        <div className="relative group p-6 bg-[#121822] border border-[#283242] hover:border-[#42D9F5]/60 rounded-xl transition-all shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
                <h3 className="text-base font-bold text-[#F1F4F8]">START BUG HUNTING</h3>
              </div>
              <p className="text-xs text-[#9AA6B7] leading-relaxed max-w-md">
                1-Click Autonomous Flow: Captures immutable Scope Snapshot, delegates to 11 security droids, verifies PoCs in virtual sandbox, redacts sensitive data, and compiles HackerOne/Bugcrowd report.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#42D9F5]/10 text-[#42D9F5] border border-[#42D9F5]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleStartAutonomousHunt}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#42D9F5] hover:bg-[#38c4de] text-[#080B10] text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Hunting in Progress...' : 'Launch Autonomous Hunt'}</span>
            </button>
            <span className="text-[11px] text-[#9AA6B7] font-mono">Target: Internal Scope / Google / GitHub</span>
          </div>
        </div>

        {/* ACTION 2: CUSTOM BUG HUNT */}
        <div className="relative group p-6 bg-[#121822] border border-[#283242] hover:border-[#8A83FF]/60 rounded-xl transition-all shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#8A83FF]" />
                <h3 className="text-base font-bold text-[#F1F4F8]">CUSTOM BUG HUNT</h3>
              </div>
              <p className="text-xs text-[#9AA6B7] leading-relaxed max-w-md">
                Tailor target scope, select security droids, specify permitted probing techniques, enforce authorization boundaries, choose dual-droid verification depth, and format for HackerOne / Bugcrowd.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#8A83FF]/10 text-[#8A83FF] border border-[#8A83FF]/30 flex items-center justify-center shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => {
                setIsCustomModalOpen(true);
                handleVerifyScope(customTarget);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#171F2B] hover:bg-[#202b3c] text-[#F1F4F8] text-xs font-semibold rounded-lg border border-[#283242] transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Custom Hunt</span>
            </button>
            <span className="text-[11px] text-[#9AA6B7] font-mono">Configure target, droids & depth</span>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl">
          <span className="text-[10px] text-[#9AA6B7]/70 uppercase font-mono">Completed Hunts</span>
          <p className="text-xl font-bold text-[#F1F4F8] mt-1">{workspace?.huntsCount || 0}</p>
        </div>
        <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl">
          <span className="text-[10px] text-[#9AA6B7]/70 uppercase font-mono">Total Findings</span>
          <p className="text-xl font-bold text-[#F1F4F8] mt-1">{allFindings.length}</p>
        </div>
        <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl">
          <span className="text-[10px] text-[#9AA6B7]/70 uppercase font-mono">Cryptographically Verified</span>
          <p className="text-xl font-bold text-[#34D399] mt-1">{allFindings.filter(f => f.verificationStatus === 'VERIFIED').length}</p>
        </div>
        <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl">
          <span className="text-[10px] text-[#9AA6B7]/70 uppercase font-mono">HackerOne Sync</span>
          <p className="text-sm font-bold text-[#42D9F5] mt-1">
            {h1Status?.isConfigured ? 'CONNECTED' : 'BLOCKED (SETUP REQUIRED)'}
          </p>
        </div>
        <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl">
          <span className="text-[10px] text-[#9AA6B7]/70 uppercase font-mono">Security Droids Fleet</span>
          <p className="text-xl font-bold text-[#8A83FF] mt-1">{workspace?.activeDroids?.length || 11}</p>
        </div>
      </div>

      {/* Notification Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-[#34D399]/10 border border-[#34D399]/40 rounded-xl text-[#34D399] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#34D399] hover:text-[#F1F4F8]">
            &times;
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-[#F87171]/10 border border-[#F87171]/40 rounded-xl text-[#F87171] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F87171] shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-[#F87171] hover:text-[#F1F4F8]">
            &times;
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#283242] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#42D9F5] text-[#42D9F5]'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          Live Hunt Console
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'findings'
              ? 'border-[#42D9F5] text-[#42D9F5]'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Vulnerability Findings ({allFindings.length})
        </button>
        <button
          onClick={() => setActiveTab('droids')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'droids'
              ? 'border-[#42D9F5] text-[#42D9F5]'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Security Droids Fleet ({workspace?.activeDroids?.length || 11})
        </button>
        <button
          onClick={() => setActiveTab('hackerone')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'hackerone'
              ? 'border-[#42D9F5] text-[#42D9F5]'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          HackerOne Scope Snapshots
        </button>
        <button
          onClick={() => setActiveTab('programs')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'programs'
              ? 'border-[#42D9F5] text-[#42D9F5]'
              : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Eligible Bounty Targets
        </button>
      </div>

      {/* TAB 1: LIVE HUNT CONSOLE & RECENT JOBS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Selected Hunt Execution & Evidence */}
          <div className="lg:col-span-2 space-y-4">
            {selectedJob ? (
              <div className="bg-[#121822] border border-[#283242] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#F1F4F8]">{selectedJob.title}</h3>
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full font-mono">
                        {selectedJob.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[#9AA6B7] mt-0.5">
                      Target: <span className="text-indigo-400 font-mono">{selectedJob.target}</span> &bull; ID: {selectedJob.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!['completed', 'cancelled', 'failed'].includes(selectedJob.status) && (
                      <button
                        onClick={() => handleCancelHunt(selectedJob.id)}
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-200 text-xs rounded-xl border border-rose-800 flex items-center gap-1.5 transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Abort Mission</span>
                      </button>
                    )}
                    {(selectedJob.status === 'cancelled' || selectedJob.status === 'failed') && (
                      <button
                        onClick={() => handleResumeHunt(selectedJob.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Resume Mission</span>
                      </button>
                    )}
                    <button
                      onClick={() => downloadReport(selectedJob)}
                      className="px-3 py-1.5 bg-[#171F2B] hover:bg-zinc-700 text-[#F1F4F8] text-xs rounded-xl border border-[#283242] flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#9AA6B7]">
                    <span>Campaign Pipeline Progress</span>
                    <span className="font-mono text-indigo-400">{selectedJob.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#0D1118] rounded-full h-2 overflow-hidden border border-[#283242]">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${selectedJob.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Live Droid Execution Logs Terminal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#9AA6B7]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Terminal className="w-3.5 h-3.5 text-[#9AA6B7]/70" />
                      Droid Execution Audit Trail
                    </span>
                    <span className="text-[10px] text-[#9AA6B7]/70 font-mono">{selectedJob.logs.length} events</span>
                  </div>
                  <div className="bg-[#0D1118] border border-[#283242]/80 rounded-xl p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1.5">
                    {selectedJob.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-zinc-600 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-purple-400 font-semibold shrink-0">[{log.droid}]:</span>
                        <span
                          className={
                            log.level === 'error'
                              ? 'text-rose-400'
                              : log.level === 'warn'
                              ? 'text-amber-400'
                              : log.level === 'success'
                              ? 'text-emerald-300'
                              : 'text-[#F1F4F8]'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Findings summary for this job */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#F1F4F8] uppercase tracking-wider">
                    Discovered Vulnerabilities ({selectedJob.findings.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.findings.map(finding => (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedFinding(finding)}
                        className="p-3 bg-[#0D1118]/70 hover:bg-[#171F2B]/50 border border-[#283242] hover:border-[#283242] rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded font-mono ${
                                finding.severity === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : finding.severity === 'HIGH'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {finding.severity} &bull; {finding.cvssScore}
                            </span>
                            <span className="text-xs font-semibold text-[#F1F4F8]">{finding.title}</span>
                          </div>
                          <p className="text-[11px] text-[#9AA6B7]">
                            {finding.cweId}: {finding.cweName} &bull; <span className="font-mono text-[#9AA6B7]/70">{finding.affectedComponent}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5" /> {finding.verificationStatus}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#9AA6B7]/70" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#121822] border border-[#283242] rounded-2xl p-12 text-center space-y-3">
                <Crosshair className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-[#F1F4F8]">No Active Hunt Selected</h3>
                <p className="text-xs text-[#9AA6B7] max-w-sm mx-auto">
                  Click 'START BUG HUNTING' above to execute an autonomous multi-droid security audit.
                </p>
              </div>
            )}
          </div>

          {/* Right Col: Recent Hunts List & Finding Details */}
          <div className="space-y-4">
            <div className="bg-[#121822] border border-[#283242] rounded-2xl p-4 space-y-3 shadow-xl">
              <h3 className="text-xs font-semibold text-[#9AA6B7] uppercase tracking-wider">Recent Bug Hunts</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {workspace?.recentHunts?.map(hunt => (
                  <div
                    key={hunt.id}
                    onClick={() => setSelectedJob(hunt)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedJob?.id === hunt.id
                        ? 'bg-indigo-950/30 border-indigo-500/60'
                        : 'bg-[#0D1118]/60 border-[#283242] hover:border-[#283242]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#F1F4F8]">{hunt.title}</span>
                      <span className="text-[10px] text-[#9AA6B7]/70 font-mono">
                        {new Date(hunt.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-[#9AA6B7]">
                      <span>Target: {hunt.target}</span>
                      <span className="text-emerald-400 font-medium">{hunt.findings.length} findings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Finding Detail Drawer if clicked */}
            {selectedFinding && (
              <div className="bg-[#121822] border border-[#283242] rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#283242] pb-2">
                  <h4 className="text-xs font-bold text-[#F1F4F8]">Proof-of-Concept & Evidence</h4>
                  <button onClick={() => setSelectedFinding(null)} className="text-xs text-[#9AA6B7]/70 hover:text-[#F1F4F8]">
                    Close
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F1F4F8]">{selectedFinding.title}</span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      {selectedFinding.verificationStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9AA6B7]">{selectedFinding.description}</p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#9AA6B7] font-mono">
                      <span>Cryptographic SHA-256 Proof Seal:</span>
                      <span className="text-emerald-400">[Redacted Verified]</span>
                    </div>
                    <div className="p-2 bg-[#0D1118] rounded-lg border border-[#283242] font-mono text-[10px] text-indigo-400 break-all flex items-center justify-between">
                      <span>{selectedFinding.evidenceHash}</span>
                      <button onClick={() => copyToClipboard(selectedFinding.evidenceHash)} title="Copy hash">
                        <Copy className="w-3.5 h-3.5 text-[#9AA6B7]/70 hover:text-[#F1F4F8] ml-1 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-[#9AA6B7] font-mono">Reproducible Curl Command:</span>
                    <div className="p-2 bg-[#0D1118] rounded-lg border border-[#283242] font-mono text-[10px] text-[#F1F4F8] whitespace-pre-wrap flex items-start justify-between">
                      <code>{selectedFinding.curlCommand}</code>
                      <button onClick={() => copyToClipboard(selectedFinding.curlCommand)} title="Copy curl">
                        <Copy className="w-3.5 h-3.5 text-[#9AA6B7]/70 hover:text-[#F1F4F8] ml-1 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {selectedFinding.falsePositiveReviewNotes && (
                    <div className="p-2 bg-[#0D1118] rounded-lg border border-[#283242]/80 text-[10px] text-[#9AA6B7]">
                      <span className="font-semibold text-purple-300">Nemesis-09 Review:</span> {selectedFinding.falsePositiveReviewNotes}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#283242] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#9AA6B7]">
                    <div className="flex items-center gap-2">
                      <span>Review Decision:</span>
                      <select
                        value={selectedFinding.verificationStatus}
                        onChange={e => handleUpdateFindingStatus(selectedFinding.id, e.target.value)}
                        className="px-2 py-1 bg-[#0D1118] border border-[#283242] rounded text-[10px] text-[#F1F4F8] font-mono cursor-pointer"
                      >
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                        <option value="SUSPECTED">SUSPECTED</option>
                        <option value="FALSE POSITIVE">FALSE POSITIVE</option>
                        <option value="NOT REPRODUCIBLE">NOT REPRODUCIBLE</option>
                        <option value="BLOCKED">BLOCKED</option>
                      </select>
                    </div>
                    {selectedFinding.verificationStatus === 'VERIFIED' && (
                      <button
                        onClick={() => handleSubmitToHackerOne(selectedFinding.id)}
                        className="px-3 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Transmit to HackerOne</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#283242] text-[11px] text-[#9AA6B7]">
                    <span className="font-semibold text-[#F1F4F8]">Remediation:</span> {selectedFinding.remediation}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED & REVIEWED FINDINGS */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#F1F4F8]">Tenant-Isolated Vulnerability Findings</h3>
              <p className="text-xs text-[#9AA6B7]">Classified across 6 verification statuses with sensitive data redaction</p>
            </div>
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'VERIFIED', 'NEEDS REVIEW', 'SUSPECTED', 'FALSE POSITIVE', 'BLOCKED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFindingFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors ${
                    findingFilter === st
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-[#121822] text-[#9AA6B7] border-[#283242] hover:text-[#F1F4F8]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFindings.map(f => (
              <div key={f.id} className="p-4 bg-[#121822] border border-[#283242] rounded-2xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                        f.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : f.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {f.severity} &bull; CVSS {f.cvssScore}
                    </span>
                    <h4 className="text-xs font-semibold text-[#F1F4F8] mt-1">{f.title}</h4>
                    <p className="text-[11px] text-[#9AA6B7]">{f.cweId}: {f.cweName}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {f.verificationStatus}
                  </span>
                </div>

                <p className="text-xs text-[#F1F4F8] leading-relaxed">{f.description}</p>

                <div className="p-2.5 bg-[#0D1118] rounded-xl border border-[#283242]/80 space-y-1 font-mono text-[10px]">
                  <span className="text-[#9AA6B7]/70">Evidence SHA-256 Seal:</span>
                  <p className="text-indigo-400 break-all">{f.evidenceHash}</p>
                </div>

                <div className="pt-2 border-t border-[#283242]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#9AA6B7]">
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <select
                      value={f.verificationStatus}
                      onChange={e => handleUpdateFindingStatus(f.id, e.target.value)}
                      className="px-2 py-0.5 bg-[#0D1118] border border-[#283242] rounded text-[10px] text-[#F1F4F8] font-mono cursor-pointer"
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                      <option value="SUSPECTED">SUSPECTED</option>
                      <option value="FALSE POSITIVE">FALSE POSITIVE</option>
                      <option value="NOT REPRODUCIBLE">NOT REPRODUCIBLE</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.verificationStatus === 'VERIFIED' && (
                      <button
                        onClick={() => handleSubmitToHackerOne(f.id)}
                        className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[10px] flex items-center gap-1 transition-colors"
                        title="Submit verified finding to HackerOne"
                      >
                        <ShieldAlert className="w-3 h-3" /> Transmit to HackerOne
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(f.curlCommand)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy PoC Curl
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY DROIDS FLEET */}
      {activeTab === 'droids' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F1F4F8]">Specialized Security Droid Fleet</h3>
              <p className="text-xs text-[#9AA6B7]">11 autonomous agents with explicit role boundaries, SAST tools, and verifiers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workspace?.activeDroids?.map(droid => (
              <div key={droid.id} className="p-4 bg-[#121822] border border-[#283242] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F1F4F8]">{droid.name}</h4>
                      <span className="text-[10px] text-[#9AA6B7]/70 font-mono">{droid.codename} &bull; {droid.version}</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                </div>

                <p className="text-xs font-medium text-indigo-300">{droid.role}</p>
                <p className="text-[11px] text-[#9AA6B7] leading-relaxed">{droid.description}</p>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#9AA6B7]/70 uppercase tracking-wider font-mono">Specialized Capabilities:</span>
                  <div className="flex flex-wrap gap-1">
                    {droid.capabilities.map(cap => (
                      <span key={cap} className="px-1.5 py-0.5 text-[9px] bg-[#0D1118] text-[#F1F4F8] border border-[#283242] rounded font-mono">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#283242] text-[10px] text-[#9AA6B7]/70 flex justify-between">
                  <span>Verified Findings Produced:</span>
                  <strong className="text-emerald-400 font-mono">{droid.findingsCount}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HACKERONE SCOPE SNAPSHOTS */}
      {activeTab === 'hackerone' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#121822] border border-[#283242] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F1F4F8]">HackerOne v1 API Scope & Authorization</h3>
                <p className="text-xs text-[#9AA6B7] mt-0.5">Captures cryptographic Scope Snapshots and verifies rules of engagement before testing</p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border ${
                  h1Status?.isConfigured
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}
              >
                {h1Status?.connectionStatus || 'BLOCKED_MISSING_CREDENTIALS'}
              </span>
            </div>

            <p className="text-xs text-[#F1F4F8] leading-relaxed">
              {h1Status?.setupInstructions}
            </p>

            {h1Status?.missingEnvVars?.length > 0 && (
              <div className="p-3 bg-[#0D1118] rounded-xl border border-[#283242] flex items-center gap-2 text-xs">
                <span className="text-[#9AA6B7]/70">Missing Configuration:</span>
                {h1Status.missingEnvVars.map((v: string) => (
                  <code key={v} className="px-1.5 py-0.5 text-[11px] bg-red-950/60 text-red-300 border border-red-800/40 rounded font-mono">
                    {v}
                  </code>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {h1Programs.map((p: any) => (
              <div key={p.id} className="p-4 bg-[#121822] border border-[#283242] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#F1F4F8]">{p.name}</h4>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase">{p.submissionState}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">In Scope Assets:</span>
                  <div className="space-y-1">
                    {p.inScope.map((s: any, idx: number) => (
                      <div key={idx} className="p-1.5 bg-[#0D1118] rounded border border-[#283242] font-mono text-[11px] text-[#F1F4F8]">
                        {s.assetIdentifier} ({s.assetType}) &bull; {s.maxSeverity}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] text-rose-400 font-semibold uppercase">Excluded Out-of-Scope:</span>
                  <div className="flex flex-wrap gap-1">
                    {p.outOfScope.map((o: string, idx: number) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-rose-950/40 text-rose-300 border border-rose-800/40 rounded text-[10px] font-mono">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: BOUNTY PROGRAMS */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F1F4F8]">Authorized Bug Bounty Programs & Scope</h3>
            <span className="text-xs text-[#9AA6B7]">Strict rules of engagement and authorization validation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workspace?.authorizedPrograms?.map(prog => (
              <div key={prog.id} className="p-4 bg-[#121822] border border-[#283242] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#F1F4F8]">{prog.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full font-mono uppercase">
                    {prog.platform}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">In Scope Targets:</span>
                  <div className="space-y-1">
                    {prog.inScope.map((s, idx) => (
                      <div key={idx} className="p-1.5 bg-[#0D1118] rounded border border-[#283242] text-[11px] font-mono text-[#F1F4F8]">
                        {s.target} ({s.type})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">Out of Scope (Forbidden):</span>
                  <div className="flex flex-wrap gap-1">
                    {prog.outOfScope.map((out, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-rose-950/40 text-rose-300 border border-rose-800/40 rounded text-[10px] font-mono">
                        {out}
                      </span>
                    ))}
                  </div>
                </div>

                {prog.maxBounty && (
                  <div className="pt-2 border-t border-[#283242] text-[11px] text-[#9AA6B7] flex justify-between">
                    <span>Reward Range Up To:</span>
                    <strong className="text-amber-400 font-mono">{prog.maxBounty}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOM BUG HUNT MODAL */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#121822] border border-[#283242] rounded-2xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#283242] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-[#F1F4F8]">Configure Custom Bug Hunt</h3>
              </div>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-[#9AA6B7]/70 hover:text-[#F1F4F8]">
                &times;
              </button>
            </div>

            <form onSubmit={handleLaunchCustomHunt} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#F1F4F8] font-medium mb-1">Target Scope Asset</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={customTarget}
                    onChange={e => {
                      setCustomTarget(e.target.value);
                      handleVerifyScope(e.target.value);
                    }}
                    placeholder="e.g. api.target.com or localhost"
                    className="flex-1 px-3 py-2 bg-[#0D1118] border border-[#283242] rounded-xl text-[#F1F4F8] text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={customTargetType}
                    onChange={e => setCustomTargetType(e.target.value as any)}
                    className="px-3 py-2 bg-[#0D1118] border border-[#283242] rounded-xl text-[#F1F4F8] text-xs"
                  >
                    <option value="domain">Domain / Host</option>
                    <option value="web_api">REST / GraphQL API</option>
                    <option value="github_repo">GitHub Repo</option>
                    <option value="smart_contract">Smart Contract</option>
                    <option value="cloud_config">Cloud Infrastructure</option>
                  </select>
                </div>
                {scopeVerificationResult && (
                  <p
                    className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                      scopeVerificationResult.authorized ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {scopeVerificationResult.authorized ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Target authorized in scope
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" /> {scopeVerificationResult.reason}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Droids selection */}
              <div>
                <label className="block text-[#F1F4F8] font-medium mb-1.5">Selected Security Droids Fleet</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {[
                    { id: 'commander_droid', label: 'Hunt Commander (Campaign Prime)' },
                    { id: 'recon_droid', label: 'Argus-01 (Recon & Stack)' },
                    { id: 'research_droid', label: 'Athena-02 (Threat Intel & CVE)' },
                    { id: 'source_code_droid', label: 'Semgrep-03 (SAST & AST Taint)' },
                    { id: 'api_fuzzer_droid', label: 'Hydra-04 (API BOLA/IDOR)' },
                    { id: 'dependency_droid', label: 'Snyk-05 (Supply Chain & SBOM)' },
                    { id: 'injection_droid', label: 'Vulcan-06 (Deep Injection)' },
                    { id: 'secrets_droid', label: 'Specter-07 (Vault & Leaks)' },
                    { id: 'verifier_droid', label: 'Cerberus-08 (Evidence Lock)' },
                    { id: 'adversarial_review_droid', label: 'Nemesis-09 (Triage Shield)' },
                    { id: 'remediation_droid', label: 'Hephaestus-10 (Defense Patches)' },
                    { id: 'reporting_droid', label: 'Hermes-11 (Report Compiler)' }
                  ].map(d => (
                    <label key={d.id} className="flex items-center gap-2 p-2 bg-[#0D1118] rounded-lg border border-[#283242] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDroids.includes(d.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedDroids([...selectedDroids, d.id]);
                          else setSelectedDroids(selectedDroids.filter(x => x !== d.id));
                        }}
                        className="rounded border-[#283242] text-indigo-600 focus:ring-0"
                      />
                      <span className="text-[11px] text-[#F1F4F8]">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Verification Depth & Reporting Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#F1F4F8] font-medium mb-1">Verification Depth</label>
                  <select
                    value={verificationDepth}
                    onChange={e => setVerificationDepth(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0D1118] border border-[#283242] rounded-xl text-[#F1F4F8] text-xs"
                  >
                    <option value="dual_droid_consensus">Dual-Droid Consensus (Cerberus Verified)</option>
                    <option value="deep_evidence">Deep Sandbox PoC Reproduction</option>
                    <option value="fast_triage">Fast Surface Triage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#F1F4F8] font-medium mb-1">Reporting Format</label>
                  <select
                    value={reportingStyle}
                    onChange={e => setReportingStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0D1118] border border-[#283242] rounded-xl text-[#F1F4F8] text-xs"
                  >
                    <option value="hackerone">HackerOne Vulnerability Report</option>
                    <option value="bugcrowd">Bugcrowd VRT Taxonomy</option>
                    <option value="executive">Executive PDF / Compliance Summary</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#283242] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 bg-[#171F2B] hover:bg-zinc-700 text-[#F1F4F8] rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isLoading ? 'Executing...' : 'Launch Custom Bug Hunt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
