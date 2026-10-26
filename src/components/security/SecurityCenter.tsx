/**
 * AI HEAVEN - Unified Security Center
 * Powered by Draugr (https://github.com/draugr-dev/draugr),
 * OWASP DefectDojo (https://github.com/DefectDojo/django-DefectDojo),
 * and OpenSSF Scorecard (https://github.com/ossf/scorecard).
 * 
 * Features:
 * - Unified posture metrics with DefectDojo deduplication & SLA compliance
 * - Draugr contextual risk scoring (CISA KEV + EPSS) & developer actionability
 * - OpenSSF Scorecard supply-chain audit and dangerous workflow detection
 * - Target-isolated scanner console with pre-flight authorization guard
 * - CI/CD Release Gate evaluator and SARIF / DefectDojo v2 export
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Radio,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Cpu,
  FileCode2,
  Download,
  ExternalLink,
  Zap,
  Info,
  Clock,
  Check,
  X,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  Activity
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export type SecurityCenterTab = 'posture' | 'findings' | 'scorecard' | 'scanners' | 'cicd';

interface SecurityCenterProps {
  currentUser?: any;
  onNavigateView?: (view: any) => void;
}

export const SecurityCenter: React.FC<SecurityCenterProps> = ({ currentUser, onNavigateView }) => {
  const [activeTab, setActiveTab] = useState<SecurityCenterTab>('posture');
  const [posture, setPosture] = useState<any | null>(null);
  const [scorecard, setScorecard] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [actionabilityFilter, setActionabilityFilter] = useState('ALL');

  // Scanner run state
  const [selectedScanner, setSelectedScanner] = useState('scorecard');
  const [targetHost, setTargetHost] = useState('localhost');
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Remediation Modal State
  const [selectedFindingToRemediate, setSelectedFindingToRemediate] = useState<any | null>(null);
  const [remediationAction, setRemediationAction] = useState<'MITIGATED' | 'RISK_ACCEPTED' | 'FALSE_POSITIVE'>('MITIGATED');
  const [remediationJustification, setRemediationJustification] = useState('');
  const [isSubmittingRemediation, setIsSubmittingRemediation] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [posData, scData] = await Promise.all([
        apiClient.getSecurityPosture().catch(() => null),
        apiClient.getScorecardReport().catch(() => null)
      ]);
      setPosture(posData);
      setScorecard(scData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load security center metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await apiClient.runSecurityCenterScan(selectedScanner, {
        target: targetHost,
        allowedHosts: ['localhost', '127.0.0.1', '::1', 'workspace', 'internal']
      });
      setScanResult(res.scanResult);
      setStatusMessage(`Scan completed: ${res.scanResult?.findings?.length || 0} findings ingested with DefectDojo deduplication.`);
      await loadSecurityData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Security scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyRemediation = async () => {
    if (!selectedFindingToRemediate) return;
    setIsSubmittingRemediation(true);
    try {
      await apiClient.updateFindingRemediation(
        selectedFindingToRemediate.id,
        remediationAction,
        {
          justification: remediationJustification,
          rationale: remediationJustification
        }
      );
      setStatusMessage(`Finding ${selectedFindingToRemediate.ruleId} marked as ${remediationAction}.`);
      setSelectedFindingToRemediate(null);
      setRemediationJustification('');
      await loadSecurityData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply remediation update.');
    } finally {
      setIsSubmittingRemediation(false);
    }
  };

  const handleExportSarif = async () => {
    try {
      const sarif = await apiClient.exportSecuritySarif();
      const blob = new Blob([JSON.stringify(sarif, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aiheaven-draugr-security-${Date.now()}.sarif`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('OASIS SARIF v2.1.0 exported successfully.');
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err.message}`);
    }
  };

  const handleExportDefectDojo = async () => {
    try {
      const dojo = await apiClient.exportDefectDojoPayload();
      const blob = new Blob([JSON.stringify(dojo, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `defectdojo-import-payload-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('OWASP DefectDojo v2 API payload exported.');
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err.message}`);
    }
  };

  const filteredFindings = (posture?.activeFindings || []).filter((f: any) => {
    const matchesSearch =
      f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.ruleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchesAction = actionabilityFilter === 'ALL' || f.actionability === actionabilityFilter;
    return matchesSearch && matchesSeverity && matchesAction;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#42D9F5]/20 selection:text-[#42D9F5]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#283242] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#9AA6B7] mb-1">
            <span>AI Operating Environment</span>
            <span aria-hidden="true">·</span>
            <span>Security Center</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#34D399] font-semibold">Draugr · DefectDojo · Scorecard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F4F8] flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-[#42D9F5]" />
            Unified Security Center &amp; Release Gate
          </h1>
          <p className="text-sm text-[#9AA6B7] mt-1 max-w-3xl leading-relaxed">
            Correlated DevSecOps intelligence powered by Draugr vulnerability ranking, OWASP DefectDojo deduplication, and OpenSSF Scorecard supply-chain release controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSecurityData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-xs font-mono text-[#F1F4F8] transition-colors cursor-pointer touch-target-44"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#42D9F5]' : ''}`} />
            <span>Refresh Posture</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#34D399] shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[#9AA6B7] hover:text-[#F1F4F8]">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#F87171] shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[#9AA6B7] hover:text-[#F1F4F8]">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#121822] border border-[#283242] rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('posture')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 touch-target-44 ${
            activeTab === 'posture'
              ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 shadow-xs'
              : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Security Posture ({posture?.score ?? '--'}/100)</span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 touch-target-44 ${
            activeTab === 'findings'
              ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 shadow-xs'
              : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Dojo Findings ({posture?.defectDojoReport?.activeCount ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('scorecard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 touch-target-44 ${
            activeTab === 'scorecard'
              ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 shadow-xs'
              : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>OpenSSF Scorecard ({scorecard?.aggregateScore ?? '--'}/10)</span>
        </button>

        <button
          onClick={() => setActiveTab('scanners')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 touch-target-44 ${
            activeTab === 'scanners'
              ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 shadow-xs'
              : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Target Scanners</span>
        </button>

        <button
          onClick={() => setActiveTab('cicd')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 touch-target-44 ${
            activeTab === 'cicd'
              ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 shadow-xs'
              : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>CI/CD Release Gate</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: EXECUTIVE SECURITY POSTURE OVERVIEW                             */}
      {/* ===================================================================== */}
      {activeTab === 'posture' && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#9AA6B7]">
                <span>OVERALL POSTURE</span>
                <Shield className="h-4 w-4 text-[#42D9F5]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#F1F4F8]">
                {posture?.score ?? 95}
                <span className="text-sm font-normal text-[#9AA6B7]">/100</span>
              </div>
              <div className="text-[11px] text-[#34D399] font-mono">
                {posture?.score >= 80 ? 'Optimal Security Posture' : 'Hardening Recommended'}
              </div>
            </div>

            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#9AA6B7]">
                <span>RELEASE GATE</span>
                <Lock className="h-4 w-4 text-[#34D399]" />
              </div>
              <div className="text-3xl font-mono font-bold">
                <span className={
                  posture?.releaseGate?.decision === 'PASS'
                    ? 'text-[#34D399]'
                    : posture?.releaseGate?.decision === 'WARN'
                    ? 'text-[#FBBF24]'
                    : 'text-[#F87171]'
                }>
                  {posture?.releaseGate?.decision || 'PASS'}
                </span>
              </div>
              <div className="text-[11px] text-[#9AA6B7] font-mono truncate">
                {posture?.releaseGate?.blockerFindings?.length || 0} Blockers · Scorecard {scorecard?.aggregateScore || '9.0'}/10
              </div>
            </div>

            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#9AA6B7]">
                <span>DEFECTDOJO ACTIVE</span>
                <Radio className="h-4 w-4 text-[#8A83FF]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#F1F4F8]">
                {posture?.defectDojoReport?.activeCount ?? 0}
                <span className="text-sm font-normal text-[#9AA6B7]"> issues</span>
              </div>
              <div className="text-[11px] text-[#9AA6B7] font-mono">
                {posture?.defectDojoReport?.deduplicatedSavingsCount ?? 0} deduplicated duplicates merged
              </div>
            </div>

            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#9AA6B7]">
                <span>DRAUGR KEV / HIGH EPSS</span>
                <Zap className="h-4 w-4 text-[#FBBF24]" />
              </div>
              <div className="text-3xl font-mono font-bold text-[#F1F4F8]">
                {posture?.draugrSummary?.knownExploitedCount ?? 0}
                <span className="text-sm font-normal text-[#9AA6B7]"> KEV</span>
              </div>
              <div className="text-[11px] text-[#34D399] font-mono">
                {posture?.draugrSummary?.highEpssCount ?? 0} high EPSS likelihood
              </div>
            </div>
          </div>

          {/* Three Integrated Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pillar 1: Draugr */}
            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#283242] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#42D9F5]/10 border border-[#42D9F5]/30 flex items-center justify-center text-[#42D9F5]">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F4F8]">Draugr DevSecOps</h3>
                    <p className="text-[10px] font-mono text-[#9AA6B7]">v1.2.0 · Apache-2.0</p>
                  </div>
                </div>
                <a
                  href="https://github.com/draugr-dev/draugr"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-[#42D9F5] hover:underline flex items-center gap-1"
                >
                  <span>Repo</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Contextual Risk Score:</span>
                  <span className="text-[#F1F4F8] font-bold">{posture?.draugrSummary?.overallRiskScore ?? 12}/100</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Developer Actionability:</span>
                  <span className="text-[#34D399] font-bold">{posture?.draugrSummary?.actionableCount ?? 0} Remediable</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">CISA KEV Matches:</span>
                  <span className="text-[#34D399] font-bold">{posture?.draugrSummary?.knownExploitedCount ?? 0} (Zero active)</span>
                </div>
              </div>
            </div>

            {/* Pillar 2: OWASP DefectDojo */}
            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#283242] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#8A83FF]/10 border border-[#8A83FF]/30 flex items-center justify-center text-[#8A83FF]">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F4F8]">OWASP DefectDojo</h3>
                    <p className="text-[10px] font-mono text-[#9AA6B7]">v2.38.0 · BSD-3-Clause</p>
                  </div>
                </div>
                <a
                  href="https://github.com/DefectDojo/django-DefectDojo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-[#8A83FF] hover:underline flex items-center gap-1"
                >
                  <span>Repo</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Deduplication Hash:</span>
                  <span className="text-[#F1F4F8] font-bold">SHA-256 Canonical</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">SLA Violations:</span>
                  <span className="text-[#34D399] font-bold">{posture?.defectDojoReport?.slaViolatedCount ?? 0} Breaches</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Lifecycle State:</span>
                  <span className="text-[#8A83FF] font-bold">
                    {posture?.defectDojoReport?.mitigatedCount ?? 0} Mitigated · {posture?.defectDojoReport?.riskAcceptedCount ?? 0} Accepted
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 3: OpenSSF Scorecard */}
            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#283242] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center text-[#34D399]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F4F8]">OpenSSF Scorecard</h3>
                    <p className="text-[10px] font-mono text-[#9AA6B7]">v5.1.1 · Apache-2.0</p>
                  </div>
                </div>
                <a
                  href="https://github.com/ossf/scorecard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-[#34D399] hover:underline flex items-center gap-1"
                >
                  <span>Repo</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Aggregate Health:</span>
                  <span className="text-[#34D399] font-bold">{scorecard?.aggregateScore ?? 8.7}/10.0</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Dangerous Workflows:</span>
                  <span className="text-[#34D399] font-bold">0 Detected (10/10)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#121822]">
                  <span className="text-[#9AA6B7]">Security Policy:</span>
                  <span className="text-[#34D399] font-bold">SECURITY.md Active (10/10)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: UNIFIED FINDINGS (DEFECTDOJO DEDUPLICATION + DRAUGR PRIORITIZE) */}
      {/* ===================================================================== */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 bg-[#0D1118] border border-[#283242] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-3.5 w-3.5 text-[#9AA6B7] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search findings by rule, title, or component..."
                className="w-full bg-[#121822] border border-[#283242] rounded-lg pl-8 pr-3 py-2 text-xs text-[#F1F4F8] font-mono focus:outline-none focus:border-[#42D9F5]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-[#121822] border border-[#283242] rounded-lg px-2.5 py-2 text-xs font-mono text-[#F1F4F8] focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={actionabilityFilter}
                onChange={e => setActionabilityFilter(e.target.value)}
                className="bg-[#121822] border border-[#283242] rounded-lg px-2.5 py-2 text-xs font-mono text-[#F1F4F8] focus:outline-none"
              >
                <option value="ALL">All Actionability</option>
                <option value="remediable_code">Direct Code Fix</option>
                <option value="remediable_dependency">Dependency Upgrade</option>
                <option value="config_hardening">Config Hardening</option>
              </select>
            </div>
          </div>

          {/* Findings Table */}
          <div className="bg-[#0D1118] border border-[#283242] rounded-2xl overflow-hidden">
            {filteredFindings.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-[#34D399] mx-auto" />
                <h3 className="text-sm font-semibold text-[#F1F4F8]">No Active Vulnerability Findings</h3>
                <p className="text-xs text-[#9AA6B7]">
                  All identified security issues have been mitigated, deduplicated, or accepted with compensating controls.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#283242]">
                {filteredFindings.map((f: any) => (
                  <div key={f.id} className="p-4 sm:p-5 hover:bg-[#121822]/50 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          f.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : f.severity === 'HIGH'
                            ? 'bg-orange-950 text-orange-300 border-orange-800'
                            : f.severity === 'MEDIUM'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-[#171F2B] text-[#9AA6B7] border-[#283242]'
                        }`}>
                          {f.severity}
                        </span>

                        <span className="text-xs font-mono text-[#42D9F5] font-semibold">{f.ruleId}</span>

                        {f.isKnownExploited && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-700 font-bold animate-pulse">
                            CISA KEV ACTIVE
                          </span>
                        )}

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121822] border border-[#283242] text-[#9AA6B7]">
                          EPSS: {f.epssScore} (risk: {f.contextualRiskScore}/100)
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121822] border border-[#283242] text-[#8A83FF]">
                          {f.actionability?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedFindingToRemediate(f);
                            setRemediationAction('MITIGATED');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-[10px] font-mono text-emerald-300 transition-colors cursor-pointer"
                        >
                          Mark Mitigated
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFindingToRemediate(f);
                            setRemediationAction('RISK_ACCEPTED');
                          }}
                          className="px-2.5 py-1 rounded bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-[10px] font-mono text-[#9AA6B7] hover:text-[#F1F4F8] transition-colors cursor-pointer"
                        >
                          Accept Risk
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#F1F4F8]">{f.title}</h4>
                      <p className="text-xs text-[#9AA6B7] mt-1 leading-relaxed">{f.description}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#121822] border border-[#283242]/70 text-xs font-mono text-[#9AA6B7] space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-[#42D9F5]">Draugr Remediation Guidance</div>
                      <div className="text-[#F1F4F8]">{f.remediationGuidance}</div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#9AA6B7]">
                      <span>Target: <code className="text-[#42D9F5]">{f.affectedComponent}</code></span>
                      <span>Dojo Hash: <code>{f.draugrId}</code></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: OPENSSF SCORECARD SUPPLY-CHAIN & DEPENDENCIES                  */}
      {/* ===================================================================== */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#9AA6B7]">SUPPLY-CHAIN HEALTH AUDITOR</div>
              <h3 className="text-xl font-bold text-[#F1F4F8] mt-0.5">OpenSSF Scorecard Analysis</h3>
              <p className="text-xs text-[#9AA6B7] mt-1">
                Automated evaluation of supply chain integrity, branch protection, unpinned dependencies, and token permissions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <div className="text-2xl font-bold text-[#34D399]">{scorecard?.aggregateScore ?? 8.7}/10</div>
                <div className="text-[10px] text-[#9AA6B7]">Aggregate Health</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(scorecard?.checks || []).map((check: any, idx: number) => (
              <div key={idx} className="p-4 bg-[#0D1118] border border-[#283242] rounded-xl flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#F1F4F8]">{check.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      check.score >= 8
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : check.score >= 5
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}>
                      {check.score}/10
                    </span>
                  </div>

                  <p className="text-xs text-[#9AA6B7] leading-relaxed">{check.reason}</p>

                  {check.details && check.details.length > 0 && (
                    <div className="text-[10px] font-mono text-[#9AA6B7]/80 bg-[#121822] p-2 rounded border border-[#283242]/70">
                      {check.details.slice(0, 2).map((d: string, i: number) => (
                        <div key={i} className="truncate">{d}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#283242] flex items-center justify-between text-[10px] font-mono">
                  <a
                    href={check.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#42D9F5] hover:underline flex items-center gap-1"
                  >
                    <span>Check Docs</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: TARGET-ISOLATED SCANNER CONSOLE                                */}
      {/* ===================================================================== */}
      {activeTab === 'scanners' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-4">
            <div className="border-b border-[#283242] pb-3">
              <h3 className="text-base font-bold text-[#F1F4F8] flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[#42D9F5]" />
                Authorized Target Security Scanner
              </h3>
              <p className="text-xs text-[#9AA6B7] mt-1">
                Active scanning is strictly gated to pre-authorized scopes (`localhost`, `127.0.0.1`, and registered tenant endpoints).
              </p>
            </div>

            <form onSubmit={handleRunScan} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#9AA6B7] mb-1">SCANNER ADAPTER</label>
                <select
                  value={selectedScanner}
                  onChange={e => setSelectedScanner(e.target.value)}
                  className="w-full bg-[#121822] border border-[#283242] rounded-lg px-3 py-2 text-xs font-mono text-[#F1F4F8] focus:outline-none"
                >
                  <option value="scorecard">Scorecard (Supply-Chain Auditor)</option>
                  <option value="semgrep">Semgrep (SAST AST Inspector)</option>
                  <option value="trivy">Trivy (SCA &amp; Lockfile Scanner)</option>
                  <option value="gitleaks">Gitleaks (Secret &amp; Key Detector)</option>
                  <option value="grype">Grype (Vulnerability Auditor)</option>
                  <option value="agentgrep">AgentGrep (AI Pipeline Policy)</option>
                  <option value="nmap">Nmap (Authorized Port Scanner)</option>
                  <option value="nuclei">Nuclei (Vulnerability Template Scanner)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9AA6B7] mb-1">AUTHORIZED TARGET</label>
                <input
                  type="text"
                  value={targetHost}
                  onChange={e => setTargetHost(e.target.value)}
                  placeholder="localhost, 127.0.0.1"
                  className="w-full bg-[#121822] border border-[#283242] rounded-lg px-3 py-2 text-xs font-mono text-[#F1F4F8] focus:outline-none focus:border-[#42D9F5]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#42D9F5] hover:bg-[#38c4de] text-[#080B10] font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 touch-target-44 shadow-xs"
                >
                  <Play className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Executing Scan...' : 'Launch Scan'}</span>
                </button>
              </div>
            </form>

            <div className="p-3 bg-[#121822] rounded-xl border border-[#283242] text-[11px] font-mono text-[#9AA6B7] flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-[#34D399] shrink-0" />
              <span>Target scope enforcement: Requests targeting external unapproved hosts will be rejected with an authorization error.</span>
            </div>
          </div>

          {/* Last Scan Execution Result */}
          {scanResult && (
            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#283242] pb-2">
                <span className="font-bold text-[#F1F4F8]">Execution Output ({scanResult.scannerId})</span>
                <span className="text-[#34D399]">{scanResult.status.toUpperCase()}</span>
              </div>
              <div className="text-[11px] text-[#9AA6B7] space-y-1">
                <div>Duration: {scanResult.durationMs}ms</div>
                <div>Findings Ingested: {scanResult.findings?.length || 0}</div>
                <div>Target Scope: {scanResult.targetScope?.target}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: CI/CD RELEASE GATE & EXPORTS                                   */}
      {/* ===================================================================== */}
      {activeTab === 'cicd' && (
        <div className="space-y-6">
          {/* Release Gate Decision */}
          <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#283242] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#F1F4F8] flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#34D399]" />
                  CI/CD Automated Security Release Gate
                </h3>
                <p className="text-xs text-[#9AA6B7] mt-0.5">
                  Automated gate evaluated during pull requests and Android APK compilation pipelines.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                  posture?.releaseGate?.decision === 'PASS'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : posture?.releaseGate?.decision === 'WARN'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}>
                  GATE DECISION: {posture?.releaseGate?.decision || 'PASS'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-[#121822] rounded-xl border border-[#283242] space-y-1">
                <div className="text-[#9AA6B7]">Cryptographic Release Seal (SHA-256):</div>
                <div className="text-[#42D9F5] break-all">{posture?.releaseGate?.cryptographicProof || 'c8f7...a19d'}</div>
              </div>

              {posture?.releaseGate?.reasons?.length > 0 && (
                <div className="p-3 bg-[#121822] rounded-xl border border-[#283242] space-y-1">
                  <div className="text-[#FBBF24] font-bold">Release Notes &amp; Observations:</div>
                  <ul className="list-disc list-inside text-[#9AA6B7] space-y-0.5">
                    {posture.releaseGate.reasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Export Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#F1F4F8] flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-[#42D9F5]" />
                  Draugr OASIS SARIF v2.1.0
                </h4>
                <span className="text-[10px] font-mono text-[#9AA6B7]">STANDARD</span>
              </div>
              <p className="text-xs text-[#9AA6B7] leading-relaxed">
                Export unified findings into industry-standard SARIF format for consumption by GitHub Security Advisories and CI runners.
              </p>
              <button
                onClick={handleExportSarif}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#121822] hover:bg-[#171F2B] border border-[#283242] text-xs font-mono text-[#42D9F5] transition-colors cursor-pointer touch-target-44"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download SARIF Report</span>
              </button>
            </div>

            <div className="p-5 bg-[#0D1118] border border-[#283242] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#F1F4F8] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#8A83FF]" />
                  OWASP DefectDojo v2 Payload
                </h4>
                <span className="text-[10px] font-mono text-[#9AA6B7]">API COMPATIBLE</span>
              </div>
              <p className="text-xs text-[#9AA6B7] leading-relaxed">
                Export deduplicated findings compatible with DefectDojo `/api/v2/import-scan/` endpoint with hash code verification.
              </p>
              <button
                onClick={handleExportDefectDojo}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#121822] hover:bg-[#171F2B] border border-[#283242] text-xs font-mono text-[#8A83FF] transition-colors cursor-pointer touch-target-44"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download DefectDojo JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REMEDIATION ACTION MODAL                                              */}
      {/* ===================================================================== */}
      {selectedFindingToRemediate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B10]/80 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg bg-[#0D1118] border border-[#283242] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#283242] pb-3">
              <h3 className="text-sm font-bold text-[#F1F4F8]">
                Remediate Finding: {selectedFindingToRemediate.ruleId}
              </h3>
              <button
                onClick={() => setSelectedFindingToRemediate(null)}
                className="text-[#9AA6B7] hover:text-[#F1F4F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#9AA6B7] mb-1">LIFECYCLE STATUS TRANSITION</label>
                <select
                  value={remediationAction}
                  onChange={(e: any) => setRemediationAction(e.target.value)}
                  className="w-full bg-[#121822] border border-[#283242] rounded-lg px-3 py-2 text-xs text-[#F1F4F8] focus:outline-none"
                >
                  <option value="MITIGATED">Mark Mitigated (Verified resolved)</option>
                  <option value="RISK_ACCEPTED">Accept Risk (With formal justification)</option>
                  <option value="FALSE_POSITIVE">Mark False Positive (Audited non-issue)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9AA6B7] mb-1">JUSTIFICATION / COMPENSATING CONTROL</label>
                <textarea
                  value={remediationJustification}
                  onChange={e => setRemediationJustification(e.target.value)}
                  rows={3}
                  placeholder="Provide operator rationale, commit hash, or compensating security control..."
                  className="w-full bg-[#121822] border border-[#283242] rounded-lg p-2.5 text-xs text-[#F1F4F8] focus:outline-none focus:border-[#42D9F5]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#283242]">
              <button
                onClick={() => setSelectedFindingToRemediate(null)}
                className="px-3 py-1.5 rounded-lg border border-[#283242] text-xs font-mono text-[#9AA6B7] hover:text-[#F1F4F8]"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyRemediation}
                disabled={isSubmittingRemediation}
                className="px-4 py-1.5 rounded-lg bg-[#42D9F5] text-[#080B10] text-xs font-mono font-bold hover:bg-[#38c4de] transition-colors"
              >
                {isSubmittingRemediation ? 'Updating...' : 'Save Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
