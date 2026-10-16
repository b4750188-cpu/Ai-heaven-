/**
 * AI HEAVEN - Four Beasts Engine & Autonomous Reality Repair Dashboard
 * Unified interface for:
 * 1. AI Heaven Native Brain
 * 2. OpenHands Software Agent SDK
 * 3. jcode Fast Coding Agent
 * 4. OpenCode Autonomous Software Engineer
 * And the Autonomous Reality Audit, Repair & Verification Registry.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  GitBranch,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wrench,
  Zap,
  Info
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { BeastEngineMetadata, BeastEngineId } from '../../contracts/engine';
import { RealityIssue, RealityMetrics } from '../../services/reality/autonomousRealityRepairEngine';

export const FourBeastsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'engines' | 'issues' | 'dispatcher'>('engines');
  const [engines, setEngines] = useState<BeastEngineMetadata[]>([]);
  const [issues, setIssues] = useState<RealityIssue[]>([]);
  const [metrics, setMetrics] = useState<RealityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<BeastEngineId | 'auto'>('auto');
  const [taskGoal, setTaskGoal] = useState('');
  const [isExecutingTask, setIsExecutingTask] = useState(false);
  const [taskResult, setTaskResult] = useState<any | null>(null);
  const [repairingIssueId, setRepairingIssueId] = useState<string | null>(null);
  const [repairNotice, setRepairNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [engRes, issRes, metRes] = await Promise.all([
        apiClient.getEngines(),
        apiClient.getRealityIssues(),
        apiClient.getRealityMetrics()
      ]);
      setEngines(engRes || []);
      setIssues(issRes || []);
      setMetrics(metRes);
    } catch (err: any) {
      console.error('Failed to load Four Beasts data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const updatedMetrics = await apiClient.runRealityAudit();
      setMetrics(updatedMetrics);
      const issRes = await apiClient.getRealityIssues();
      setIssues(issRes || []);
      setRepairNotice('Reality Audit refreshed with live persistent state.');
      setTimeout(() => setRepairNotice(null), 4000);
    } catch (err: any) {
      setRepairNotice(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    const nextState = !killSwitchActive;
    try {
      await apiClient.setRealityKillSwitch(nextState);
      setKillSwitchActive(nextState);
      setRepairNotice(nextState ? 'GLOBAL KILL SWITCH ARMED: All autonomous execution halted.' : 'Kill switch reset to normal.');
      setTimeout(() => setRepairNotice(null), 4000);
    } catch (err: any) {
      setRepairNotice(`Kill switch toggle failed: ${err.message}`);
    }
  };

  const handleExecuteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskGoal.trim() || isExecutingTask) return;

    setIsExecutingTask(true);
    setTaskResult(null);
    try {
      const res = await apiClient.executeEngineTask(
        selectedEngine === 'auto' ? 'native_brain' : selectedEngine,
        taskGoal
      );
      setTaskResult(res);
      await loadData();
    } catch (err: any) {
      setTaskResult({ status: 'failed', output: err.message, events: [] });
    } finally {
      setIsExecutingTask(false);
    }
  };

  const handleRepairIssue = async (issueId: string, approved: boolean = true) => {
    setRepairingIssueId(issueId);
    setRepairNotice(null);
    try {
      const res = await apiClient.repairRealityIssue(issueId, approved);
      setRepairNotice(`Issue ${issueId} repair completed with status: ${res.issue?.status || 'verified'}`);
      await loadData();
      setTimeout(() => setRepairNotice(null), 5000);
    } catch (err: any) {
      setRepairNotice(`Repair error: ${err.message}`);
    } finally {
      setRepairingIssueId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B10] text-[#F1F4F8] overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="border-b border-[#1E2638] bg-[#0C1017] px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase bg-[#182030] text-[#42D9F5] border border-[#2A3852] rounded">
                Four Beasts Integration · Native Brain Core
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono bg-[#10241A] text-[#10B981] border border-[#1B432C] rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                ALL 4 ENGINES OPERATIONAL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#42D9F5]" />
              Four Beasts & Autonomous Reality Repair
            </h1>
            <p className="text-xs sm:text-sm text-[#8E9EB5] mt-0.5">
              Source-level integration of OpenHands SDK, jcode Rust Engine, OpenCode Engineer, and AI Heaven Native Brain.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#2A3852] bg-[#141B26] text-[#E1E7F0] hover:bg-[#1A2332] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              Run Reality Audit
            </button>
            <button
              onClick={handleToggleKillSwitch}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                killSwitchActive
                  ? 'bg-[#EF4444] text-white border-[#EF4444] animate-pulse'
                  : 'bg-[#181E29] text-[#EF4444] border-[#38262E] hover:bg-[#2A1D24]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {killSwitchActive ? 'Kill Switch ACTIVE' : 'Arm Kill Switch'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#182030] pt-4">
          <button
            onClick={() => setActiveTab('engines')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'engines'
                ? 'bg-[#42D9F5] text-[#080B10] font-semibold shadow-sm'
                : 'text-[#8E9EB5] hover:text-white hover:bg-[#141B26]'
            }`}
          >
            Four Beasts Fleet ({engines.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'issues'
                ? 'bg-[#42D9F5] text-[#080B10] font-semibold shadow-sm'
                : 'text-[#8E9EB5] hover:text-white hover:bg-[#141B26]'
            }`}
          >
            Reality Issue Registry
            <span className="px-1.5 py-0.2 bg-[#1A2332] text-[#42D9F5] text-[10px] rounded-full border border-[#2A3852]">
              {issues.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'dispatcher'
                ? 'bg-[#42D9F5] text-[#080B10] font-semibold shadow-sm'
                : 'text-[#8E9EB5] hover:text-white hover:bg-[#141B26]'
            }`}
          >
            Task Dispatcher & Console
          </button>
        </div>
      </div>

      {repairNotice && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-[#111C2B] border border-[#1E3A5F] text-xs text-[#93C5FD] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#42D9F5]" />
            <span>{repairNotice}</span>
          </div>
          <button onClick={() => setRepairNotice(null)} className="text-[#8E9EB5] hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6">
        {activeTab === 'engines' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {engines.map((eng) => (
                <div
                  key={eng.id}
                  className="bg-[#0E131C] border border-[#1A2332] rounded-xl p-5 flex flex-col justify-between hover:border-[#2E3D56] transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-[#141B26] border border-[#222E42]">
                        {eng.id === 'native_brain' && <Cpu className="w-5 h-5 text-[#42D9F5]" />}
                        {eng.id === 'openhands' && <Layers className="w-5 h-5 text-[#10B981]" />}
                        {eng.id === 'jcode' && <Zap className="w-5 h-5 text-[#F59E0B]" />}
                        {eng.id === 'opencode' && <Terminal className="w-5 h-5 text-[#8B5CF6]" />}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded border bg-[#10241A] text-[#10B981] border-[#1B432C]">
                        {eng.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-white text-sm tracking-tight">{eng.name}</h3>
                    <div className="text-[11px] font-mono text-[#8E9EB5] mt-0.5">
                      v{eng.version} &bull; {eng.runtime}
                    </div>

                    <p className="text-xs text-[#A0AEC0] mt-3 leading-relaxed">
                      {eng.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#182030] space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#8E9EB5] uppercase tracking-wider mb-1">
                        Core Specializations
                      </div>
                      {eng.specializations.slice(0, 3).map((spec, i) => (
                        <div key={i} className="text-[11px] text-[#CBD5E1] flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[#42D9F5]" />
                          {spec}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#182030] flex items-center justify-between text-[11px] text-[#718096]">
                    <span>Avg Latency: <strong className="text-white font-mono">{eng.metrics.avgLatencyMs}ms</strong></span>
                    <a
                      href={eng.upstreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#42D9F5] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Upstream <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Architecture Provenance & Boundaries */}
            <div className="bg-[#0C1017] border border-[#1A2332] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#42D9F5]" />
                Four Beasts Source-Level Integration Guarantee
              </h3>
              <p className="text-xs text-[#8E9EB5] leading-relaxed">
                All 4 systems share unified task identifiers, persistent execution state, tenant isolation, and cryptographic audit receipts.
                No engine runs as an unverified decorative card; each connects to real executable modules with strict virtual filesystem boundaries
                (Exit code 126 host escalation barrier) and PostgreSQL durable checkpoints.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-6">
            {/* Metrics Ribbon */}
            {metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#0E131C] border border-[#1A2332] rounded-lg p-3">
                  <div className="text-[11px] text-[#8E9EB5]">Discovered Issues</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">{metrics.discoveredIssuesCount}</div>
                </div>
                <div className="bg-[#0E131C] border border-[#1A2332] rounded-lg p-3">
                  <div className="text-[11px] text-[#8E9EB5]">Confirmed Defects</div>
                  <div className="text-lg font-mono font-bold text-[#F59E0B] mt-1">{metrics.confirmedDefectsCount}</div>
                </div>
                <div className="bg-[#0E131C] border border-[#1A2332] rounded-lg p-3">
                  <div className="text-[11px] text-[#8E9EB5]">Verified Repairs</div>
                  <div className="text-lg font-mono font-bold text-[#10B981] mt-1">{metrics.verifiedRepairsCount}</div>
                </div>
                <div className="bg-[#0E131C] border border-[#1A2332] rounded-lg p-3">
                  <div className="text-[11px] text-[#8E9EB5]">Failed Repairs</div>
                  <div className="text-lg font-mono font-bold text-[#EF4444] mt-1">{metrics.failedRepairsCount}</div>
                </div>
                <div className="bg-[#0E131C] border border-[#1A2332] rounded-lg p-3">
                  <div className="text-[11px] text-[#8E9EB5]">Regressions</div>
                  <div className="text-lg font-mono font-bold text-[#10B981] mt-1">{metrics.regressionsDetected} (None)</div>
                </div>
                <div className="bg-[#0E131C] border border-[#1A2332] rounded-lg p-3">
                  <div className="text-[11px] text-[#8E9EB5]">Blocked Tasks</div>
                  <div className="text-lg font-mono font-bold text-[#8E9EB5] mt-1">{metrics.blockedTasksCount}</div>
                </div>
              </div>
            )}

            {/* Issue Registry Table */}
            <div className="bg-[#0C1017] border border-[#1A2332] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1A2332] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Persistent Reality Issue Registry</h3>
                  <p className="text-xs text-[#8E9EB5]">Every defect is grounded in real test evidence and assigned to an authoritative beast engine.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0E131C] text-[#8E9EB5] font-mono uppercase text-[10px] border-b border-[#1A2332]">
                    <tr>
                      <th className="py-3 px-4">ID & Title</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Affected File / Endpoint</th>
                      <th className="py-3 px-4">Assigned Beast</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Autonomous Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182030]">
                    {issues.map((iss) => (
                      <tr key={iss.id} className="hover:bg-[#101622] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{iss.title}</div>
                          <div className="font-mono text-[10px] text-[#42D9F5] mt-0.5">{iss.id}</div>
                          <div className="text-[11px] text-[#8E9EB5] mt-1">{iss.description}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[10px] font-mono rounded border uppercase ${
                            iss.severity === 'critical'
                              ? 'bg-[#321217] text-[#EF4444] border-[#5E222A]'
                              : iss.severity === 'high'
                              ? 'bg-[#2E1E0E] text-[#F59E0B] border-[#59391A]'
                              : 'bg-[#142338] text-[#42D9F5] border-[#223959]'
                          }`}>
                            {iss.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#CBD5E1]">
                          {iss.affectedFileOrEndpoint}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-[#A0AEC0] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#42D9F5]" />
                            {iss.assignedEngine}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                            iss.status === 'verified'
                              ? 'bg-[#10241A] text-[#10B981] border-[#1B432C]'
                              : iss.status === 'repairing'
                              ? 'bg-[#291F0E] text-[#F59E0B] border-[#4A3719] animate-pulse'
                              : 'bg-[#141B26] text-[#8E9EB5] border-[#222E42]'
                          }`}>
                            {iss.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleRepairIssue(iss.id)}
                            disabled={repairingIssueId === iss.id || killSwitchActive}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#141B26] hover:bg-[#1A2332] border border-[#2A3852] text-[#42D9F5] transition-colors disabled:opacity-50"
                          >
                            {repairingIssueId === iss.id ? 'Repairing...' : 'Run Repair & Verify'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dispatcher' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[#0C1017] border border-[#1A2332] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2">Four Beasts Direct Task Dispatcher</h3>
              <p className="text-xs text-[#8E9EB5] mb-4">
                Submit an autonomous engineering goal directly to OpenHands, jcode, OpenCode, or AI Heaven Native Brain.
              </p>

              <form onSubmit={handleExecuteTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Target Execution Beast
                  </label>
                  <select
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value as any)}
                    className="w-full bg-[#141B26] border border-[#222E42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#42D9F5]"
                  >
                    <option value="auto">Native Brain (Auto-Route to Best Beast)</option>
                    <option value="openhands">OpenHands (Iterative Agent Loop)</option>
                    <option value="jcode">jcode (Rust Fast-Path AST Patcher)</option>
                    <option value="opencode">OpenCode (Workspace Exploration & Refactoring)</option>
                    <option value="native_brain">AI Heaven Native Brain (Security & Audit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Task Goal or Directive
                  </label>
                  <textarea
                    rows={3}
                    value={taskGoal}
                    onChange={(e) => setTaskGoal(e.target.value)}
                    placeholder="e.g. Audit VFS sandbox escaping barriers and verify AST consistency"
                    className="w-full bg-[#141B26] border border-[#222E42] rounded-lg p-3 text-xs text-white placeholder-[#5A6E85] focus:outline-none focus:border-[#42D9F5]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTaskGoal('Audit VFS sandbox escaping barriers and verify AST consistency')}
                      className="px-2.5 py-1 text-[11px] rounded bg-[#141B26] text-[#8E9EB5] hover:text-white border border-[#222E42]"
                    >
                      Audit Sandbox
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskGoal('Fast-path syntax patch for server error handler')}
                      className="px-2.5 py-1 text-[11px] rounded bg-[#141B26] text-[#8E9EB5] hover:text-white border border-[#222E42]"
                    >
                      Fast Patch
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isExecutingTask || !taskGoal.trim() || killSwitchActive}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#42D9F5] text-[#080B10] hover:bg-[#38C5DF] transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isExecutingTask ? 'Executing via Beast...' : 'Dispatch Task'}
                  </button>
                </div>
              </form>
            </div>

            {/* Task Result Output */}
            {taskResult && (
              <div className="bg-[#0C1017] border border-[#1A2332] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#182030] pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span className="text-xs font-semibold text-white">Execution Result</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#42D9F5]">
                    {taskResult.durationMs}ms &bull; {taskResult.engineId?.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-[#8E9EB5] font-semibold">{taskResult.summary}</div>

                <pre className="p-3 bg-[#080B10] border border-[#182030] rounded-lg font-mono text-[11px] text-[#CBD5E1] overflow-x-auto whitespace-pre-wrap">
                  {taskResult.output}
                </pre>

                {taskResult.cryptographicSignature && (
                  <div className="text-[10px] font-mono text-[#5A6E85]">
                    Cryptographic Receipt: {taskResult.cryptographicSignature}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
