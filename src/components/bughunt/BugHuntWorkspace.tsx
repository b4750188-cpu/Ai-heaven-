/**
 * AI HEAVEN - Autonomous Bug-Bounty Hunting Platform Workspace
 * 
 * Features:
 * - Two Prominent Actions: START BUG HUNTING & CUSTOM BUG HUNT
 * - Coordinated 6 specialized security droids (Argus, Hydra, Aegis, Vulcan, Specter, Cerberus)
 * - Strict program scope authorization enforcement
 * - Cryptographic SHA-256 evidence proofs & reproducible curl PoCs
 * - Complete tenant-isolated bug hunt history and findings repository
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
  Award
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  BugHuntConfig,
  BugHuntJob,
  BugHuntScope,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'droids' | 'programs' | 'hunts'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BugHuntJob | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<VulnerabilityFinding | null>(null);

  // Custom Hunt Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customTarget, setCustomTarget] = useState('test-target.sandbox.local');
  const [customTargetType, setCustomTargetType] = useState<'domain' | 'web_api' | 'github_repo' | 'smart_contract' | 'cloud_config'>('domain');
  const [selectedDroids, setSelectedDroids] = useState<string[]>([
    'recon_droid',
    'api_fuzzer_droid',
    'auth_bypass_droid',
    'injection_droid',
    'secrets_droid',
    'verifier_droid'
  ]);
  const [permittedTechniques, setPermittedTechniques] = useState<string[]>([
    'passive_recon',
    'stack_fingerprinting',
    'api_schema_fuzzing',
    'auth_boundary_probing',
    'safe_injection_testing',
    'secret_leak_scanning'
  ]);
  const [verificationDepth, setVerificationDepth] = useState<'fast_triage' | 'deep_evidence' | 'dual_droid_consensus'>('dual_droid_consensus');
  const [reportingStyle, setReportingStyle] = useState<'hackerone' | 'bugcrowd' | 'executive'>('hackerone');
  const [scopeVerificationResult, setScopeVerificationResult] = useState<{ authorized: boolean; reason?: string } | null>(null);

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspace();
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

  // ACTION 1: START BUG HUNTING (1-Click Autonomous Flow)
  const handleStartAutonomousHunt = async () => {
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const job = await apiClient.startAutonomousBugHunt('prog_aiheaven_internal');
      setSelectedJob(job);
      setActionSuccess(`Autonomous hunt launched! Argus-01 & Cerberus-06 completed multi-stage testing on ${job.target}.`);
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
      setActionSuccess(`Custom bug hunt completed for ${customTarget} with ${job.findings.length} verified findings!`);
      await loadWorkspace();
    } catch (err: any) {
      setActionError(err.message || 'Custom hunt failed.');
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

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* Top Banner / Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Crosshair className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">AI Heaven Bug-Bounty Platform</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full">
                EVIDENCE ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Autonomous Droid Fleet &bull; Scope Enforcement &bull; Cryptographic PoC Proofs &bull; HackerOne & Bugcrowd Compliant
            </p>
          </div>
        </div>

        {/* Tenant / Auth Identity Pill */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono tracking-wider">Tenant Workspace</span>
            <span className="font-semibold text-zinc-200">{currentUser?.fullName || 'Lead Bounty Hunter'}</span>
            <span className="text-[10px] text-indigo-400 ml-1.5 font-mono">({workspace?.tenantId || 'tenant_default'})</span>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Manage Access</span>
          </button>
        </div>
      </div>

      {/* Prominent Action Callouts: START BUG HUNTING & CUSTOM BUG HUNT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ACTION 1: START BUG HUNTING (Autonomous Flow) */}
        <div className="relative group p-6 bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-indigo-800/40 hover:border-indigo-600/70 rounded-2xl transition-all shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-zinc-100">START BUG HUNTING</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                1-Click Autonomous Flow: Selects authorized programs, queries Continuity Engine for constraints, launches 6 specialized security droids, verifies PoCs with SHA-256 evidence, and produces a complete report.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleStartAutonomousHunt}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Hunting in Progress...' : 'Launch Autonomous Hunt'}</span>
            </button>
            <span className="text-[11px] text-zinc-400">Target: Internal Scope / Google / GitHub</span>
          </div>
        </div>

        {/* ACTION 2: CUSTOM BUG HUNT */}
        <div className="relative group p-6 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-zinc-100">CUSTOM BUG HUNT</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                Tailor target scope, select security droids, specify permitted probing techniques, enforce authorization boundaries, choose dual-droid verification depth, and format for HackerOne / Bugcrowd.
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => {
                setIsCustomModalOpen(true);
                handleVerifyScope(customTarget);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Custom Hunt</span>
            </button>
            <span className="text-[11px] text-zinc-400">Configure target, droids & depth</span>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Completed Hunts</span>
          <p className="text-xl font-bold text-zinc-100 mt-1">{workspace?.huntsCount || 0}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Total Findings</span>
          <p className="text-xl font-bold text-zinc-100 mt-1">{workspace?.totalFindingsCount || 0}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Cryptographically Verified</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{workspace?.verifiedFindingsCount || 0}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Critical Severity</span>
          <p className="text-xl font-bold text-rose-400 mt-1">{workspace?.criticalCount || 0}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase font-mono">Active Security Droids</span>
          <p className="text-xl font-bold text-indigo-400 mt-1">{workspace?.activeDroids?.length || 6}</p>
        </div>
      </div>

      {/* Notification Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            &times;
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
            &times;
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          Live Hunt Console
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'findings'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Verified Findings ({workspace?.totalFindingsCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('droids')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'droids'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Security Droids (6)
        </button>
        <button
          onClick={() => setActiveTab('programs')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'programs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Eligible Bounty Programs
        </button>
      </div>

      {/* TAB 1: LIVE HUNT CONSOLE & RECENT JOBS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Selected Hunt Execution & Evidence */}
          <div className="lg:col-span-2 space-y-4">
            {selectedJob ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-100">{selectedJob.title}</h3>
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full font-mono">
                        {selectedJob.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Target: <span className="text-indigo-400 font-mono">{selectedJob.target}</span> &bull; ID: {selectedJob.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadReport(selectedJob)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Multi-Droid Orchestration Progress</span>
                    <span className="font-mono text-indigo-400">{selectedJob.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${selectedJob.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Live Droid Execution Logs Terminal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                      Droid Execution Audit Trail
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{selectedJob.logs.length} events</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1.5">
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
                              : 'text-zinc-300'
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
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Discovered Vulnerabilities ({selectedJob.findings.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.findings.map(finding => (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedFinding(finding)}
                        className="p-3 bg-zinc-950/70 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
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
                            <span className="text-xs font-semibold text-zinc-200">{finding.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {finding.cweId}: {finding.cweName} &bull; <span className="font-mono text-zinc-500">{finding.affectedComponent}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                          </span>
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                <Crosshair className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-200">No Active Hunt Selected</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Click 'START BUG HUNTING' above to execute an autonomous multi-droid security audit.
                </p>
              </div>
            )}
          </div>

          {/* Right Col: Recent Hunts List & Finding Details */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recent Bug Hunts</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {workspace?.recentHunts?.map(hunt => (
                  <div
                    key={hunt.id}
                    onClick={() => setSelectedJob(hunt)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedJob?.id === hunt.id
                        ? 'bg-indigo-950/30 border-indigo-500/60'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200">{hunt.title}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(hunt.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                      <span>Target: {hunt.target}</span>
                      <span className="text-emerald-400 font-medium">{hunt.findings.length} findings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Finding Detail Drawer if clicked */}
            {selectedFinding && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold text-zinc-200">Proof-of-Concept & Evidence</h4>
                  <button onClick={() => setSelectedFinding(null)} className="text-xs text-zinc-500 hover:text-zinc-300">
                    Close
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-zinc-100">{selectedFinding.title}</p>
                  <p className="text-[11px] text-zinc-400">{selectedFinding.description}</p>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono">Cryptographic SHA-256 Proof Seal:</span>
                    <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[10px] text-indigo-400 break-all flex items-center justify-between">
                      <span>{selectedFinding.evidenceHash}</span>
                      <button onClick={() => copyToClipboard(selectedFinding.evidenceHash)} title="Copy hash">
                        <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 ml-1 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono">Reproducible Curl Command:</span>
                    <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[10px] text-zinc-300 whitespace-pre-wrap flex items-start justify-between">
                      <code>{selectedFinding.curlCommand}</code>
                      <button onClick={() => copyToClipboard(selectedFinding.curlCommand)} title="Copy curl">
                        <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 ml-1 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">Remediation:</span> {selectedFinding.remediation}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED FINDINGS */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100">Tenant-Isolated Vulnerability Findings</h3>
            <span className="text-xs text-zinc-400">All findings verified with reproducible sandbox evidence</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace?.recentHunts?.flatMap(h => h.findings).map(f => (
              <div key={f.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
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
                    <h4 className="text-xs font-semibold text-zinc-100 mt-1">{f.title}</h4>
                    <p className="text-[11px] text-zinc-400">{f.cweId}: {f.cweName}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">{f.description}</p>

                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1 font-mono text-[10px]">
                  <span className="text-zinc-500">Evidence SHA-256 Seal:</span>
                  <p className="text-indigo-400 break-all">{f.evidenceHash}</p>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Verified by: <strong className="text-zinc-300">{f.verifiedByDroidId}</strong></span>
                  <button
                    onClick={() => copyToClipboard(f.curlCommand)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy PoC Curl
                  </button>
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
              <h3 className="text-sm font-bold text-zinc-100">Specialized Security Droid Fleet</h3>
              <p className="text-xs text-zinc-400">Autonomous agents coordinated by Central Brain with explicit role permissions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workspace?.activeDroids?.map(droid => (
              <div key={droid.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{droid.name}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">{droid.codename} &bull; {droid.version}</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                </div>

                <p className="text-xs font-medium text-indigo-300">{droid.role}</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{droid.description}</p>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Specialized Capabilities:</span>
                  <div className="flex flex-wrap gap-1">
                    {droid.capabilities.map(cap => (
                      <span key={cap} className="px-1.5 py-0.5 text-[9px] bg-zinc-950 text-zinc-300 border border-zinc-800 rounded font-mono">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
                  <span>Verified Findings Produced:</span>
                  <strong className="text-emerald-400 font-mono">{droid.findingsCount}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BOUNTY PROGRAMS */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100">Authorized Bug Bounty Programs & Scope</h3>
            <span className="text-xs text-zinc-400">Strict rules of engagement and authorization validation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workspace?.authorizedPrograms?.map(prog => (
              <div key={prog.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-100">{prog.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full font-mono uppercase">
                    {prog.platform}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">In Scope Targets:</span>
                  <div className="space-y-1">
                    {prog.inScope.map((s, idx) => (
                      <div key={idx} className="p-1.5 bg-zinc-950 rounded border border-zinc-800 text-[11px] font-mono text-zinc-300">
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
                  <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 flex justify-between">
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
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-100">Configure Custom Bug Hunt</h3>
              </div>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                &times;
              </button>
            </div>

            <form onSubmit={handleLaunchCustomHunt} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Target Scope Asset</label>
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
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={customTargetType}
                    onChange={e => setCustomTargetType(e.target.value as any)}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs"
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
                <label className="block text-zinc-300 font-medium mb-1.5">Selected Security Droids</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'recon_droid', label: 'Argus-01 (Recon & Stack)' },
                    { id: 'api_fuzzer_droid', label: 'Hydra-02 (API BOLA/IDOR)' },
                    { id: 'auth_bypass_droid', label: 'Aegis-03 (OAuth/Auth Bypass)' },
                    { id: 'injection_droid', label: 'Vulcan-04 (Deep Injection)' },
                    { id: 'secrets_droid', label: 'Specter-05 (Vault & Source Leaks)' },
                    { id: 'verifier_droid', label: 'Cerberus-06 (Evidence Lock)' }
                  ].map(d => (
                    <label key={d.id} className="flex items-center gap-2 p-2 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDroids.includes(d.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedDroids([...selectedDroids, d.id]);
                          else setSelectedDroids(selectedDroids.filter(x => x !== d.id));
                        }}
                        className="rounded border-zinc-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-[11px] text-zinc-300">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Verification Depth & Reporting Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Verification Depth</label>
                  <select
                    value={verificationDepth}
                    onChange={e => setVerificationDepth(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs"
                  >
                    <option value="dual_droid_consensus">Dual-Droid Consensus (Cerberus Verified)</option>
                    <option value="deep_evidence">Deep Sandbox PoC Reproduction</option>
                    <option value="fast_triage">Fast Surface Triage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Reporting Format</label>
                  <select
                    value={reportingStyle}
                    onChange={e => setReportingStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs"
                  >
                    <option value="hackerone">HackerOne Vulnerability Report</option>
                    <option value="bugcrowd">Bugcrowd VRT Taxonomy</option>
                    <option value="executive">Executive PDF / Compliance Summary</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs"
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
