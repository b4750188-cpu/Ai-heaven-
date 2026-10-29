import React, { useEffect, useState } from 'react';
import {
  Compass,
  Search,
  Cpu,
  Bot,
  FileText,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Layers,
  Database,
  ArrowRight,
  HardDrive,
  Check,
  X,
  BookOpen,
  Send,
  Terminal,
  Server
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  HostHardwareProfile,
  ModelRecommendationMatrix,
  DeepResearchTaskProgress,
  AgentSkillDefinition,
  AgentLoopExecutionResult,
  HybridSearchResultItem,
  WorkspaceDocument
} from '../../types/odysseus';

export type OdysseusTab = 'research' | 'cookbook' | 'agent_loop' | 'hybrid_search' | 'documents';

interface OdysseusWorkspaceProps {
  onNavigateToSource?: () => void;
}

export const OdysseusWorkspace: React.FC<OdysseusWorkspaceProps> = ({ onNavigateToSource }) => {
  const [activeTab, setActiveTab] = useState<OdysseusTab>('research');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Status & Telemetry
  const [statusOverview, setStatusOverview] = useState<any>(null);

  // Cookbook state
  const [hardware, setHardware] = useState<HostHardwareProfile | null>(null);
  const [modelMatrix, setModelMatrix] = useState<ModelRecommendationMatrix | null>(null);

  // Deep Research state
  const [researchTopic, setResearchTopic] = useState<string>('');
  const [researchDepth, setResearchDepth] = useState<'overview' | 'in_depth' | 'exhaustive'>('in_depth');
  const [activeResearchTask, setActiveResearchTask] = useState<DeepResearchTaskProgress | null>(null);
  const [recentTasks, setRecentTasks] = useState<DeepResearchTaskProgress[]>([]);

  // Agent Loop state
  const [agentGoal, setAgentGoal] = useState<string>('Audit workspace dependencies and verify memory boundaries');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(['skill_web_crawler', 'skill_code_security_linter']);
  const [availableSkills, setAvailableSkills] = useState<AgentSkillDefinition[]>([]);
  const [activeLoopResult, setActiveLoopResult] = useState<AgentLoopExecutionResult | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentLoopExecutionResult[]>([]);

  // Hybrid Search state
  const [searchQuery, setSearchQuery] = useState<string>('memory isolation and security boundary');
  const [searchResults, setSearchResults] = useState<HybridSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Workspace Documents state
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<WorkspaceDocument | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docContent, setDocContent] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load status
      const status = await apiClient.getOdysseusStatus().catch(() => null);
      if (status) setStatusOverview(status);

      if (activeTab === 'cookbook') {
        const matrix = await apiClient.getOdysseusModelRecommendations();
        setModelMatrix(matrix);
        setHardware(matrix.hardware);
      } else if (activeTab === 'research') {
        const tasks = await apiClient.getOdysseusResearchTasks().catch(() => []);
        setRecentTasks(tasks);
        if (tasks.length > 0 && !activeResearchTask) {
          setActiveResearchTask(tasks[0]);
        }
      } else if (activeTab === 'agent_loop') {
        const [skills, runs] = await Promise.all([
          apiClient.getOdysseusSkills().catch(() => []),
          apiClient.getOdysseusAgentRuns().catch(() => [])
        ]);
        setAvailableSkills(skills);
        setRecentRuns(runs);
        if (runs.length > 0 && !activeLoopResult) {
          setActiveLoopResult(runs[0]);
        }
      } else if (activeTab === 'documents') {
        const docs = await apiClient.getOdysseusDocuments().catch(() => []);
        setDocuments(docs);
        if (docs.length > 0 && !selectedDoc) {
          setSelectedDoc(docs[0]);
          setDocTitle(docs[0].title);
          setDocContent(docs[0].content);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load Odysseus telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  // Deep Research Handler
  const handleLaunchResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchTopic.trim()) return;

    try {
      setIsLoading(true);
      const res = await apiClient.startOdysseusResearch(researchTopic.trim(), researchDepth);
      setActiveResearchTask(res.progress);
      setRecentTasks(prev => [res.progress, ...prev]);
      setResearchTopic('');

      // Poll task progress until completed
      const pollTimer = setInterval(async () => {
        try {
          const updated = await apiClient.getOdysseusResearchTask(res.taskId);
          setActiveResearchTask(updated);
          if (updated.stage === 'completed' || updated.stage === 'failed') {
            clearInterval(pollTimer);
            setIsLoading(false);
          }
        } catch {
          clearInterval(pollTimer);
          setIsLoading(false);
        }
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to start Deep Research');
      setIsLoading(false);
    }
  };

  // Agent Loop Handler
  const handleRunAgentLoop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentGoal.trim()) return;

    try {
      setIsLoading(true);
      const res = await apiClient.runOdysseusAgentLoop({
        goal: agentGoal.trim(),
        skillIds: selectedSkillIds
      });
      setActiveLoopResult(res);
      setRecentRuns(prev => [res, ...prev]);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute agent loop');
    } finally {
      setIsLoading(false);
    }
  };

  // Approval Gate Handler
  const handleApproval = async (runId: string, stepNumber: number, decision: 'approved' | 'rejected') => {
    try {
      const updated = await apiClient.approveOdysseusAgentStep(runId, stepNumber, decision);
      setActiveLoopResult(updated);
      setRecentRuns(prev => prev.map(r => r.runId === runId ? updated : r));
    } catch (err: any) {
      setError(err?.message || 'Approval action failed');
    }
  };

  // Hybrid Search Handler
  const handleHybridSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await apiClient.searchOdysseusKnowledgeHybrid(searchQuery.trim());
      setSearchResults(res.items);
    } catch (err: any) {
      setError(err?.message || 'Hybrid search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Document Save Handler
  const handleSaveDocument = async () => {
    if (!selectedDoc) return;
    try {
      setIsLoading(true);
      const updated = await apiClient.updateOdysseusDocument(selectedDoc.id, {
        title: docTitle,
        content: docContent
      });
      setSelectedDoc(updated);
      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    } catch (err: any) {
      setError(err?.message || 'Failed to update document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      setIsLoading(true);
      const newDoc = await apiClient.createOdysseusDocument({
        title: 'New Technical Specification',
        content: '# New Investigation Draft\n\nDraft notes and research synthesis.',
        category: 'specification'
      });
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setDocTitle(newDoc.title);
      setDocContent(newDoc.content);
    } catch (err: any) {
      setError(err?.message || 'Failed to create document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 overflow-hidden font-sans">
      {/* Top Banner Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 text-cyan-400">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Odysseus Capability Suite
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 font-mono">
                  v1.0.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Agent Loops • Deep Research Engine • Hardware-Aware Model Cookbook • Hybrid Vector Search
            </p>
          </div>
        </div>

        {/* Global Hardware Pill */}
        <div className="flex items-center gap-3 text-xs">
          {statusOverview && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 font-mono">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Env: {statusOverview.environment}</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> All Modules Live
              </span>
            </div>
          )}
          <button
            onClick={() => loadInitialData()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/30 px-6 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('research')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'research'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          Deep Research Engine
        </button>

        <button
          onClick={() => setActiveTab('cookbook')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'cookbook'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          The Cookbook (Model Intelligence)
        </button>

        <button
          onClick={() => setActiveTab('agent_loop')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'agent_loop'
              ? 'border-amber-500 text-amber-400 bg-amber-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Autonomous Agent Runner
        </button>

        <button
          onClick={() => setActiveTab('hybrid_search')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'hybrid_search'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Hybrid Knowledge Search
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-purple-500 text-purple-400 bg-purple-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Workspace Documents
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: DEEP RESEARCH ENGINE */}
        {activeTab === 'research' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Input Form */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-2 text-cyan-400 text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Autonomous Multi-Step Investigation Loop</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-4">Launch New Deep Research Task</h2>

              <form onSubmit={handleLaunchResearch} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Research Topic or Technical Query
                  </label>
                  <input
                    type="text"
                    value={researchTopic}
                    onChange={e => setResearchTopic(e.target.value)}
                    placeholder="e.g. Memory isolation techniques in container runtimes vs WebAssembly sandboxing"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Investigation Depth:</span>
                    {(['overview', 'in_depth', 'exhaustive'] as const).map(depth => (
                      <button
                        key={depth}
                        type="button"
                        onClick={() => setResearchDepth(depth)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition ${
                          researchDepth === depth
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {depth.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !researchTopic.trim()}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-sm transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    <span>Launch Investigation</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Task Progress View */}
            {activeResearchTask && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-cyan-900/40 shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono text-cyan-400">{activeResearchTask.taskId}</span>
                    <h3 className="text-base font-bold text-white">{activeResearchTask.topic}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
                      activeResearchTask.stage === 'completed'
                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                        : activeResearchTask.stage === 'failed'
                        ? 'bg-red-950 border border-red-700 text-red-400'
                        : 'bg-cyan-950 border border-cyan-700 text-cyan-300 animate-pulse'
                    }`}>
                      {activeResearchTask.stage.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>{activeResearchTask.currentActivity}</span>
                    <span className="font-mono">{activeResearchTask.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${activeResearchTask.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Investigation Sub-Queries */}
                {activeResearchTask.plan && activeResearchTask.plan.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Inquiry Vectors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeResearchTask.plan.map((q, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-slate-400">Vector {idx + 1}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              q.status === 'completed' ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-800'
                            }`}>{q.status}</span>
                          </div>
                          <div className="text-slate-200 font-medium">{q.query}</div>
                          <div className="text-slate-400 mt-1">{q.purpose}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synthesized Report View */}
                {activeResearchTask.report && (
                  <div className="space-y-6 pt-4 border-t border-slate-800">
                    <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40">
                      <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">Executive Summary</div>
                      <p className="text-sm text-slate-200 leading-relaxed">{activeResearchTask.report.executiveSummary}</p>
                    </div>

                    {/* Key Findings */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Empirical Verified Findings</h4>
                      <div className="space-y-2">
                        {activeResearchTask.report.keyFindings.map((f, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm text-slate-200">{f.finding}</div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                <span className="font-mono text-emerald-400">{f.status}</span>
                                <span>Confidence: {Math.round(f.confidence * 100)}%</span>
                                <span className="text-slate-500 font-mono">Citations: {f.citations.join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Report Sections */}
                    <div className="space-y-4">
                      {activeResearchTask.report.sections.map((sec, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                          <h5 className="text-sm font-bold text-white mb-2">{sec.title}</h5>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{sec.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Sources bibliography with SHA-256 seals */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Authoritative Discovered Sources & Seals</h4>
                      <div className="space-y-2">
                        {activeResearchTask.report.sources.map((src, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800/60 flex items-center justify-between text-xs">
                            <div className="truncate mr-4">
                              <span className="font-mono text-cyan-400 mr-2">[{src.id}]</span>
                              <a href={src.url} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-cyan-400 font-medium underline">
                                {src.title}
                              </a>
                              <span className="text-slate-500 ml-2">({src.domain})</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                              <Shield className="w-3 h-3 text-emerald-400" />
                              <span>{src.sha256Hash.slice(0, 16)}...</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THE COOKBOOK (MODEL INTELLIGENCE) */}
        {activeTab === 'cookbook' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Host Hardware Profile Cards */}
            {hardware && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Host CPU Cores</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{hardware.cpuCores} Cores</div>
                  <div className="text-[11px] text-slate-500 truncate mt-1">{hardware.cpuModel}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    <span>System RAM Capacity</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{hardware.totalSystemRamGb} GB</div>
                  <div className="text-[11px] text-emerald-400 mt-1">{hardware.freeSystemRamGb} GB Free RAM</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hardware Acceleration</span>
                  </div>
                  <div className="text-xl font-bold text-white truncate">
                    {hardware.gpuAvailable ? (hardware.gpuName || 'GPU Detected') : 'CPU Inference'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {hardware.vramGb ? `${hardware.vramGb} GB VRAM` : 'Standard host RAM allocation'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-purple-400" />
                    <span>Environment Class</span>
                  </div>
                  <div className="text-xl font-bold text-white capitalize font-mono">
                    {hardware.environmentName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {hardware.isServerlessOrContainer ? 'Container / Serverless' : 'Workstation'}
                  </div>
                </div>
              </div>
            )}

            {/* Environment Advisory */}
            {modelMatrix?.environmentAdvisory && (
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-indigo-300">Environment Architecture Advisory: </span>
                  {modelMatrix.environmentAdvisory}
                </div>
              </div>
            )}

            {/* Quantized Models Compatibility Catalog */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Quantized Local Model Fit Matrix</h3>
                  <p className="text-xs text-slate-400">
                    Honest evaluations of memory requirements against verified host capacity.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">Model</th>
                      <th className="py-2.5 px-3">Parameters</th>
                      <th className="py-2.5 px-3">Quantization</th>
                      <th className="py-2.5 px-3">Req Memory</th>
                      <th className="py-2.5 px-3">Compatibility Fit</th>
                      <th className="py-2.5 px-3">Tokens/sec</th>
                      <th className="py-2.5 px-3">Assessment & Recommended Route</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {modelMatrix?.localFits.map((fit, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50 transition">
                        <td className="py-3 px-3 font-medium text-slate-200">
                          {fit.model.name}
                          <div className="text-[10px] text-slate-500 font-mono">{fit.model.license}</div>
                        </td>
                        <td className="py-3 px-3 font-mono">{fit.model.parameterCountB}B</td>
                        <td className="py-3 px-3 font-mono text-cyan-400">{fit.model.defaultQuantization}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{fit.requiredMemoryGb} GB</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-medium ${
                            fit.fit === 'optimal'
                              ? 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                              : fit.fit === 'possible_with_offload'
                              ? 'bg-amber-950 border border-amber-700 text-amber-400'
                              : 'bg-red-950 border border-red-700 text-red-400'
                          }`}>
                            {fit.fit.toUpperCase().replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {fit.estimatedTokensPerSec > 0 ? `~${fit.estimatedTokensPerSec} t/s` : '0 (OOM)'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs">
                          {fit.explanation}
                          <div className="text-[10px] text-cyan-400 mt-0.5 font-mono">
                            Route: {fit.recommendedBackend}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cloud Frontier Models */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white">Supported Remote Cloud Fallback Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modelMatrix?.cloudAlternatives.map((c, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{c.provider}</span>
                      <span className="font-mono text-cyan-400">{c.model}</span>
                    </div>
                    <div className="text-slate-400">{c.recommendedUse}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-850">
                      <span>Context: {c.contextTokens.toLocaleString()} tokens</span>
                      <span>Cost: ${c.costPerMillionInput} / $ {c.costPerMillionOutput} 1M</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTONOMOUS AGENT RUNNER */}
        {activeTab === 'agent_loop' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Input Form */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2">Autonomous Agent Execution Loop</h2>
              <p className="text-xs text-slate-400 mb-4">
                Multi-turn execution with structured states: Think → Plan → Tool Call → Approval Gate → Execute → Observe → Synthesize.
              </p>

              <form onSubmit={handleRunAgentLoop} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Execution Goal</label>
                  <input
                    type="text"
                    value={agentGoal}
                    onChange={e => setAgentGoal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Active Loaded Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {availableSkills.map(skill => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => {
                          setSelectedSkillIds(prev =>
                            prev.includes(skill.id) ? prev.filter(s => s !== skill.id) : [...prev, skill.id]
                          );
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                          selectedSkillIds.includes(skill.id)
                            ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{skill.name}</span>
                        {!skill.isSafeForAutonomousRun && (
                          <span className="text-[10px] text-amber-400 font-mono">(Approval Gated)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading || !agentGoal.trim()}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-sm transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Run Agent Loop</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Execution Trace */}
            {activeLoopResult && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono text-amber-400">{activeLoopResult.runId}</span>
                    <h3 className="text-base font-bold text-white">{activeLoopResult.goal}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-mono font-medium ${
                      activeLoopResult.status === 'completed'
                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                        : activeLoopResult.status === 'waiting_approval'
                        ? 'bg-amber-950 border border-amber-700 text-amber-400 animate-pulse'
                        : 'bg-red-950 border border-red-700 text-red-400'
                    }`}>
                      {activeLoopResult.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Steps Trace */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Step-by-Step Loop Trace</h4>
                  <div className="space-y-3">
                    {activeLoopResult.steps.map((st, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300 font-semibold">
                              Step {st.stepNumber}
                            </span>
                            <span className="font-mono text-amber-400 uppercase font-medium">[{st.stepType}]</span>
                            <span className="text-slate-200">{st.description}</span>
                          </div>
                          <span className="text-slate-500 font-mono">{st.durationMs}ms</span>
                        </div>

                        {st.thought && (
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-850 text-slate-300 italic">
                            🧠 {st.thought}
                          </div>
                        )}

                        {st.stepType === 'approval_gate' && st.approvalStatus === 'pending' && (
                          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between gap-4 mt-2">
                            <div className="text-amber-200 font-medium">
                              ⚠️ Gated Action: Destructive operation requires explicit human approval.
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproval(activeLoopResult.runId, st.stepNumber, 'approved')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleApproval(activeLoopResult.runId, st.stepNumber, 'rejected')}
                                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {st.sha256Receipt && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono pt-1">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span>Receipt: {st.sha256Receipt}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {activeLoopResult.finalSynthesis && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40">
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Final Synthesis</div>
                    <p className="text-sm text-slate-200">{activeLoopResult.finalSynthesis}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HYBRID KNOWLEDGE SEARCH */}
        {activeTab === 'hybrid_search' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white">Hybrid Vector + Keyword Knowledge Search</h2>
              <p className="text-xs text-slate-400">
                Queries the family persistent SOURCE knowledge pool combining BM25 exact matching with semantic vector cosine similarity.
              </p>

              <form onSubmit={handleHybridSearch} className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search technical procedures, findings, and verified facts..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-sm transition flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-3 pt-4">
                  <div className="text-xs font-semibold text-slate-400 font-mono">
                    Found {searchResults.length} ranked items:
                  </div>
                  {searchResults.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            item.matchType === 'hybrid' ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {item.matchType.toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-400 text-sm">Score: {item.score}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{item.snippet}</p>
                      <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-850">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-emerald-400">{item.verificationStatus}</span>
                          <span>Evidence Count: {item.provenanceEvidenceCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => apiClient.submitOdysseusKnowledgeFeedback(item.id, true)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            👍 Helpful
                          </button>
                          <button
                            onClick={() => apiClient.submitOdysseusKnowledgeFeedback(item.id, false)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            👎 Not Helpful
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: WORKSPACE DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto h-[600px]">
            {/* Sidebar List */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Documents & Notes</h3>
                <button
                  onClick={handleCreateDocument}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
                >
                  + New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {documents.map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDoc(d);
                      setDocTitle(d.title);
                      setDocContent(d.content);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                      selectedDoc?.id === d.id
                        ? 'bg-purple-950/40 border-purple-600 text-white'
                        : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">v{d.version} • {d.category}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Editor */}
            <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  className="text-base font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-purple-500 focus:outline-none flex-1 mr-4 py-1"
                />
                <button
                  onClick={handleSaveDocument}
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Save Draft
                </button>
              </div>

              <textarea
                value={docContent}
                onChange={e => setDocContent(e.target.value)}
                className="flex-1 w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                placeholder="Draft technical specifications, notes, or research findings..."
              />

              {selectedDoc?.citations && selectedDoc.citations.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="font-semibold text-slate-400 mb-1">Embedded Citations:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoc.citations.map((c, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-[11px]">
                        [{c.sourceId}] {c.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
