/**
 * AI HEAVEN - Unified Droid Ecosystem & Operational Dashboard
 * Live interconnected console displaying droid identities, task progress,
 * inter-droid messaging bus, shared findings, and factual environment discovery.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { DroidEcosystemSnapshot, DroidIdentity, DroidMessage, SharedFinding } from '../../types/droidEcosystem';
import { EnvironmentDiscoveryReport } from '../../types/environmentDiscovery';

export const UnifiedEcosystemDashboard: React.FC = () => {
  const [ecosystem, setEcosystem] = useState<DroidEcosystemSnapshot | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentDiscoveryReport | null>(null);
  const [selectedDroid, setSelectedDroid] = useState<DroidIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'droids' | 'messages' | 'findings' | 'environment'>('droids');

  // Message dispatch form state
  const [fromDroidId, setFromDroidId] = useState('vulcan_04');
  const [toDroidId, setToDroidId] = useState('cerberus_06');
  const [channel, setChannel] = useState('findings');
  const [messageType, setMessageType] = useState<DroidMessage['messageType']>('finding_share');
  const [subject, setSubject] = useState('Target injection anomaly discovered');
  const [targetUrl, setTargetUrl] = useState('https://ai.google.dev/api/v1/query');
  const [severity, setSeverity] = useState('HIGH');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadAllData(true);
      }, 8000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadAllData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [ecoData, envData] = await Promise.all([
        apiClient.getDroidEcosystem(),
        apiClient.getEnvironmentDiscovery()
      ]);
      setEcosystem(ecoData);
      setEnvironment(envData);
      if (!selectedDroid && ecoData.droids.length > 0) {
        setSelectedDroid(ecoData.droids[0]);
      }
    } catch (err) {
      console.error('Failed to refresh ecosystem dashboard:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchStatus('Dispatching message across inter-droid bus...');
    try {
      const res = await apiClient.sendDroidMessage({
        fromDroidId,
        toDroidId,
        channel,
        messageType,
        subject,
        payload: {
          target: targetUrl,
          title: subject,
          severity,
          cvssScore: severity === 'CRITICAL' ? 9.1 : severity === 'HIGH' ? 7.8 : 5.4,
          detectedAt: new Date().toISOString()
        },
        requiresAck: true
      });
      if (res.success) {
        setDispatchStatus('Message delivered & cryptographic evidence verified by Cerberus-06!');
        await loadAllData(true);
        setTimeout(() => setDispatchStatus(null), 4000);
      } else {
        setDispatchStatus(`Error: ${res.error}`);
      }
    } catch (err: any) {
      setDispatchStatus(`Failed to send message: ${err.message}`);
    }
  };

  const handleAssignTask = async (droidId: string, title: string) => {
    try {
      await apiClient.assignDroidTask(droidId, { title });
      await loadAllData(true);
    } catch (err: any) {
      alert(`Task assignment error: ${err.message}`);
    }
  };

  if (isLoading && !ecosystem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-mono tracking-wider">SYNCING INTERCONNECTED DROID ECOSYSTEM...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-slate-200">
      {/* 1. Header & Live Environment Ribbon */}
      <div className="rounded-xl border border-slate-800 bg-[#080B10]/90 p-5 backdrop-blur-md shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Bot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide text-white flex items-center gap-2">
                Interconnected Droid Ecosystem & Operational Mesh
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 font-mono">
                  {ecosystem?.droids.length || 0} ACTIVE DROIDS
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Environment-aware multi-agent mesh with authenticated inter-droid messaging & SHA-256 evidence seals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors ${
                autoRefresh
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-700 text-slate-400'
              }`}
            >
              Auto-Refresh: {autoRefresh ? 'ON (8s)' : 'OFF'}
            </button>
            <button
              onClick={() => loadAllData()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh Mesh
            </button>
          </div>
        </div>

        {/* Real Environment Discovery Banner */}
        {environment && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-1">
            <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
                <Server className="w-3 h-3 text-cyan-400" /> Deployment Host
              </div>
              <div className="text-xs font-mono font-medium text-white mt-1 capitalize flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {environment.deployment.environment.replace('_', ' ')}
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                {environment.deployment.deployedUrl}
              </div>
            </div>

            <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-400" /> Runtime Engine
              </div>
              <div className="text-xs font-mono font-medium text-white mt-1">
                {environment.runtime.nodeVersion} ({environment.runtime.platform})
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                RSS: {environment.runtime.memory.rssMb}MB | PID: {environment.runtime.pid}
              </div>
            </div>

            <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
                <Database className="w-3 h-3 text-violet-400" /> Persistence Mode
              </div>
              <div className="text-xs font-mono font-medium text-white mt-1">
                {environment.database.mode === 'postgresql' ? 'Cloud SQL (PostgreSQL)' : 'Authoritative Disk (.data/)'}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Latency: {environment.database.latencyMs}ms | Ready: YES
              </div>
            </div>

            <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-amber-400" /> Android APK CI/CD
              </div>
              <div className="text-xs font-mono font-medium text-white mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Node 22 + Capacitor 8
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                App ID: {environment.android.appId}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('droids')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'droids'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          Active Droids ({ecosystem?.droids.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'messages'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Inter-Droid Bus ({ecosystem?.recentMessages.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'findings'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Shared Findings & Evidence ({ecosystem?.sharedFindings.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('environment')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'environment'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Capability Matrix & Health
        </button>
      </div>

      {/* TAB 1: DROID MATRIX */}
      {activeTab === 'droids' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ecosystem?.droids.map((droid) => {
            const isSelected = selectedDroid?.droidId === droid.droidId;
            return (
              <div
                key={droid.droidId}
                onClick={() => setSelectedDroid(droid)}
                className={`rounded-xl border p-4 bg-[#0D1118] transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-[#121822]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold">
                      {droid.codename}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium flex items-center gap-1 ${
                        droid.status === 'running'
                          ? 'bg-amber-950/50 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${droid.status === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                      {droid.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white mt-2 flex items-center gap-1.5">
                    {droid.name}
                    <span className="text-[10px] font-mono text-slate-500">{droid.version}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{droid.description}</p>

                  {/* Current Task */}
                  {droid.currentTask ? (
                    <div className="mt-3 p-2 rounded bg-slate-900/80 border border-slate-800 text-xs">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>TASK: {droid.currentTask.status.toUpperCase()}</span>
                        <span>{droid.currentTask.progress}%</span>
                      </div>
                      <div className="text-xs font-medium text-slate-200 mt-0.5 truncate">
                        {droid.currentTask.title}
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${droid.currentTask.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2 rounded bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                      <span>Ready for coordination</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignTask(droid.droidId, 'Run automated surface security audit');
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" /> Start Task
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Msgs: {droid.metrics.messagesSent}s / {droid.metrics.messagesReceived}r</span>
                  <span>Findings: {droid.metrics.findingsContributed}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: INTER-DROID MESSAGE BUS */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message Stream */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#080B10] p-4 flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Authenticated Inter-Droid Communications Feed
            </h3>
            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {ecosystem?.recentMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  No inter-droid messages logged yet. Use the dispatch form to transmit.
                </div>
              ) : (
                ecosystem?.recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-slate-800 bg-[#0D1118] p-3 text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-cyan-400 font-semibold">{msg.fromDroidId}</span>
                        <span className="text-slate-600">➔</span>
                        <span className="text-emerald-400 font-semibold">{msg.toDroidId}</span>
                        <span className="text-slate-500 text-[10px]">[{msg.channel}]</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {msg.acknowledged && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                            ACK BY {msg.acknowledgedBy}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="font-medium text-white">{msg.subject}</div>
                    <div className="text-[11px] font-mono text-slate-400 bg-black/40 p-1.5 rounded truncate">
                      Payload: {JSON.stringify(msg.payload)}
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 truncate">
                      HMAC SHA-256 Seal: {msg.signature}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Interactive Dispatcher */}
          <div className="rounded-xl border border-slate-800 bg-[#080B10] p-4 flex flex-col gap-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              Dispatch Inter-Droid Signal
            </h3>
            <form onSubmit={handleSendMessage} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Origin Droid (Sender)
                </label>
                <select
                  value={fromDroidId}
                  onChange={(e) => setFromDroidId(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  {ecosystem?.droids.map((d) => (
                    <option key={d.droidId} value={d.droidId}>
                      {d.name} ({d.codename})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Destination Droid (Recipient)
                </label>
                <select
                  value={toDroidId}
                  onChange={(e) => setToDroidId(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  <option value="broadcast">BROADCAST (All Droids)</option>
                  {ecosystem?.droids.map((d) => (
                    <option key={d.droidId} value={d.droidId}>
                      {d.name} ({d.codename})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  <option value="findings">findings</option>
                  <option value="coordination">coordination</option>
                  <option value="alerts">alerts</option>
                  <option value="verification">verification</option>
                  <option value="operations">operations</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Target Resource</label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              {dispatchStatus && (
                <div className="text-[11px] p-2 rounded bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono">
                  {dispatchStatus}
                </div>
              )}

              <button
                type="submit"
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-medium text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Authenticated Signal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SHARED FINDINGS */}
      {activeTab === 'findings' && (
        <div className="rounded-xl border border-slate-800 bg-[#080B10] p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Cryptographically Verified Shared Vulnerability Findings
            </h3>
            <span className="text-xs font-mono text-emerald-400">
              Verifier: Cerberus-06 (SHA-256 Sealed)
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[550px] overflow-y-auto">
            {ecosystem?.sharedFindings.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                No shared findings yet. Send a finding share from Vulcan-04 or Hydra-02 to trigger verification.
              </div>
            ) : (
              ecosystem?.sharedFindings.map((finding) => (
                <div
                  key={finding.findingId}
                  className="rounded-lg border border-slate-800 bg-[#0D1118] p-3 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{finding.title}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        finding.severity === 'CRITICAL'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {finding.severity} (CVSS {finding.cvssScore})
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Target: <span className="text-cyan-300">{finding.target}</span>
                  </div>

                  {finding.reproducedTrace && (
                    <div className="p-2 rounded bg-black/50 text-[11px] font-mono text-slate-300 border border-slate-800">
                      {finding.reproducedTrace}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                    <span>Discovered: {finding.discoveredByDroidId} ➔ Verified: {finding.verifiedByDroidId}</span>
                    <span className="truncate max-w-[280px]">Hash: {finding.evidenceHash}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CAPABILITY MATRIX & HEALTH */}
      {activeTab === 'environment' && environment && (
        <div className="rounded-xl border border-slate-800 bg-[#080B10] p-4 flex flex-col gap-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Evidence-Backed Capability & Constraint Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="pb-2">Capability</th>
                  <th className="pb-2">Verification Status</th>
                  <th className="pb-2">Factual Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {environment.capabilityMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 font-medium text-white">{item.capability}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                          item.status === 'verified_active'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">{item.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {environment.warnings.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex flex-col gap-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Operational Notices
              </div>
              {environment.warnings.map((w, idx) => (
                <div key={idx} className="font-mono text-[11px] text-amber-300/80">
                  • {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
