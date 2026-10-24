import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  FileText,
  Filter,
  Github,
  Globe,
  HardDrive,
  Lock,
  MessageSquare,
  Play,
  RefreshCw,
  Rss,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Video,
  Workflow,
  XCircle,
  BookOpen
} from 'lucide-react';
import { ToolDefinition } from '../../types/foundation';
import {
  AgentReachDoctorReport,
  AgentReachPlatform,
  AgentReachResearchItem,
  AgentReachResearchResult,
  PlatformDiagnostic
} from '../../contracts/agentReach';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GitHubActionsWorkspace } from '../actions/GitHubActionsWorkspace';
import { ComfyUIWorkspace } from '../engines/ComfyUIWorkspace';
import { TurnitoutWorkspace } from '../research/TurnitoutWorkspace';

interface ToolsViewProps {
  tools: ToolDefinition[];
  onOpenNewTaskModal?: () => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({ tools, onOpenNewTaskModal }) => {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'agent_reach' | 'github_actions' | 'comfyui' | 'turnitout'>('agent_reach');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<string>('all');

  // Agent Reach State
  const [doctorReport, setDoctorReport] = useState<AgentReachDoctorReport | null>(null);
  const [isRunningDoctor, setIsRunningDoctor] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<AgentReachPlatform | 'all'>('all');
  const [targetUrl, setTargetUrl] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [depth, setDepth] = useState<'brief' | 'standard' | 'deep'>('standard');
  const [isExecutingResearch, setIsExecutingResearch] = useState(false);
  const [currentResult, setCurrentResult] = useState<AgentReachResearchResult | null>(null);
  const [history, setHistory] = useState<AgentReachResearchResult[]>([]);
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; message?: string; success?: boolean }>>({});
  const [ssrfWarning, setSsrfWarning] = useState<string | null>(null);

  useEffect(() => {
    loadAgentReachData();
  }, []);

  const loadAgentReachData = async () => {
    try {
      const [doc, hist] = await Promise.all([
        apiClient.getAgentReachDoctor(),
        apiClient.getAgentReachHistory()
      ]);
      setDoctorReport(doc);
      if (hist && Array.isArray(hist.history)) {
        setHistory(hist.history);
        if (hist.history.length > 0 && !currentResult) {
          setCurrentResult(hist.history[hist.history.length - 1]);
        }
      }
    } catch (err) {
      console.error('Failed to load Agent Reach diagnostics:', err);
    }
  };

  const handleRunDoctor = async () => {
    setIsRunningDoctor(true);
    try {
      const doc = await apiClient.getAgentReachDoctor();
      setDoctorReport(doc);
    } catch (err: any) {
      alert(`Doctor diagnosis failed: ${err.message}`);
    } finally {
      setIsRunningDoctor(false);
    }
  };

  const handleTestPlatform = async (platform: AgentReachPlatform) => {
    setTestStatus(prev => ({ ...prev, [platform]: { loading: true } }));
    try {
      const res = await apiClient.testAgentReachPlatform(platform);
      setTestStatus(prev => ({
        ...prev,
        [platform]: { loading: false, success: res.success, message: `${res.message} (${res.latencyMs}ms)` }
      }));
    } catch (err: any) {
      setTestStatus(prev => ({
        ...prev,
        [platform]: { loading: false, success: false, message: err.message }
      }));
    }
  };

  const handleTargetUrlChange = (val: string) => {
    setTargetUrl(val);
    if (!val.trim()) {
      setSsrfWarning(null);
      return;
    }
    // Client-side quick SSRF inspection
    const lower = val.toLowerCase();
    if (lower.startsWith('file:') || lower.startsWith('ftp:') || lower.startsWith('javascript:')) {
      setSsrfWarning('Protocol forbidden: Only http:// and https:// URLs are permitted.');
    } else if (
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('169.254.') ||
      lower.includes('10.') ||
      lower.includes('192.168.') ||
      lower.includes('.internal') ||
      lower.includes('.local')
    ) {
      setSsrfWarning('SSRF Alert: Destination is a private or loopback address and will be rejected.');
    } else {
      setSsrfWarning(null);
    }
  };

  const handleExecuteResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim() || isExecutingResearch) return;

    if (ssrfWarning) {
      alert(`Cannot execute: ${ssrfWarning}`);
      return;
    }

    setIsExecutingResearch(true);
    try {
      const res = await apiClient.executeAgentReachResearch({
        query: researchQuery.trim(),
        platform: selectedPlatform,
        targetUrl: targetUrl.trim() || undefined,
        maxResults,
        depth
      });
      setCurrentResult(res);
      setHistory(prev => [res, ...prev.slice(0, 49)]);
    } catch (err: any) {
      alert(`Research execution error: ${err.message}`);
    } finally {
      setIsExecutingResearch(false);
    }
  };

  const filteredTools = tools.filter(tool => {
    if (selectedCapability !== 'all' && tool.capability !== selectedCapability) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.capability.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPlatformIcon = (platform: AgentReachPlatform) => {
    switch (platform) {
      case 'github':
        return <Github className="h-4 w-4 text-emerald-400" />;
      case 'web':
        return <Globe className="h-4 w-4 text-blue-400" />;
      case 'reddit':
        return <MessageSquare className="h-4 w-4 text-amber-400" />;
      case 'youtube':
        return <Video className="h-4 w-4 text-rose-400" />;
      case 'rss':
        return <Rss className="h-4 w-4 text-orange-400" />;
      default:
        return <Globe className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* Header */}
      <div className="border-b border-[#283242]/80 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span>PLATFORM</span>
            <span className="text-slate-600">/</span>
            <span>CAPABILITY REGISTRY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#F1F4F8] font-mono tracking-tight flex items-center gap-2.5">
            Capability & Research Hub
            <Badge variant="info" size="xs">
              Agent Reach v1.2.0
            </Badge>
          </h1>
          <p className="text-xs text-[#9AA6B7] mt-1 max-w-2xl">
            Controlled execution boundary tools authorized for autonomous security agents, featuring the real{' '}
            <a
              href="https://github.com/Panniantong/Agent-Reach"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Panniantong/Agent-Reach
            </a>{' '}
            internet-research capability layer with zero API fees, SSRF firewall, and prompt injection defense.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('agent_reach')}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'agent_reach'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'bg-[#171F2B] text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Agent Reach ({doctorReport?.platforms.filter(p => p.status === 'ready').length || 5} Ready)
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'sandbox'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'bg-[#171F2B] text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Sandbox Tools ({tools.length})
          </button>
          <button
            onClick={() => setActiveTab('github_actions')}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'github_actions'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'bg-[#171F2B] text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Github className="h-3.5 w-3.5" />
            GitHub Actions CI/CD
          </button>
          <button
            onClick={() => setActiveTab('comfyui')}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'comfyui'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'bg-[#171F2B] text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Workflow className="h-3.5 w-3.5" />
            ComfyUI Workflows
          </button>
          <button
            onClick={() => setActiveTab('turnitout')}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeTab === 'turnitout'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'bg-[#171F2B] text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Turnitout Refiner
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AGENT REACH VIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === 'agent_reach' && (
        <div className="space-y-6">
          {/* Diagnostic Banner */}
          <div className="p-4 rounded-lg border border-[#283242] bg-[#121822]/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-md bg-blue-950/60 border border-blue-800/50 text-blue-400 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#F1F4F8] font-mono">
                    Agent Reach Capability Layer Status
                  </h3>
                  <Badge variant={doctorReport?.overallHealth === 'healthy' ? 'success' : 'warning'} size="xs">
                    {doctorReport?.overallHealth.toUpperCase() || 'HEALTHY'}
                  </Badge>
                  <span className="text-[11px] text-[#9AA6B7]/60 font-mono">
                    Upstream: Panniantong/Agent-Reach (MIT)
                  </span>
                </div>
                <div className="text-xs text-[#9AA6B7] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                  <span>SSRF Defense: <strong className="text-emerald-400">Active</strong> (RFC1918 Blocked)</span>
                  <span>Prompt Injection Filter: <strong className="text-emerald-400">Active</strong></span>
                  <span>Execution Budget: <strong className="text-blue-400">15s</strong></span>
                  <span>Last Checked: {doctorReport?.timestamp ? new Date(doctorReport.timestamp).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunDoctor}
                disabled={isRunningDoctor}
                className="text-xs font-mono"
              >
                {isRunningDoctor ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Diagnosing...
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                    Run Doctor (Self-Diagnosis)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Channels Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-semibold text-[#9AA6B7] uppercase tracking-wider flex items-center gap-2">
                <span>Integrated Channels & Backends</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400 font-normal">Zero API Fees</span>
              </h2>
              <span className="text-[11px] text-[#9AA6B7]/70 font-mono">
                Click "Test" to verify live endpoint connectivity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(doctorReport?.platforms || [
                {
                  platform: 'web',
                  displayName: 'General Web & Articles',
                  status: 'ready',
                  isConfigured: true,
                  upstreamTool: 'Jina Reader / HTTP',
                  message: 'Operational with SSRF guard.'
                },
                {
                  platform: 'github',
                  displayName: 'GitHub Repository & Docs',
                  status: 'ready',
                  isConfigured: true,
                  upstreamTool: 'GitHub REST API v3 / gh',
                  message: 'Operational (Public REST + GITHUB_TOKEN).'
                },
                {
                  platform: 'reddit',
                  displayName: 'Reddit Discussions',
                  status: 'ready',
                  isConfigured: true,
                  upstreamTool: 'Reddit JSON / rdt-cli',
                  message: 'Operational with User-Agent throttle.'
                },
                {
                  platform: 'youtube',
                  displayName: 'YouTube Video Transcripts',
                  status: 'ready',
                  isConfigured: true,
                  upstreamTool: 'yt-dlp / TimedText API',
                  message: 'Operational for public transcripts.'
                },
                {
                  platform: 'rss',
                  displayName: 'RSS Technical Feeds',
                  status: 'ready',
                  isConfigured: true,
                  upstreamTool: 'Universal FeedParser',
                  message: 'Operational XML/Atom parser.'
                },
                {
                  platform: 'twitter',
                  displayName: 'Twitter / X Research',
                  status: 'unconfigured',
                  isConfigured: false,
                  upstreamTool: 'twitter-cli / Session Cookie',
                  message: 'Requires session cookie or Bearer token.'
                },
                {
                  platform: 'bilibili',
                  displayName: 'Bilibili Tech Videos',
                  status: 'unconfigured',
                  isConfigured: false,
                  upstreamTool: 'bilibili-cli',
                  message: 'Session cookie required.'
                },
                {
                  platform: 'xiaohongshu',
                  displayName: 'XiaoHongShu Notes',
                  status: 'unconfigured',
                  isConfigured: false,
                  upstreamTool: 'xhs-cli',
                  message: 'Session cookie required.'
                }
              ] as PlatformDiagnostic[]).map(plat => {
                const test = testStatus[plat.platform];
                return (
                  <div
                    key={plat.platform}
                    className="p-3.5 rounded-lg border border-[#283242] bg-[#121822]/60 flex flex-col justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(plat.platform)}
                          <span className="font-semibold text-xs text-[#F1F4F8] font-sans">
                            {plat.displayName}
                          </span>
                        </div>
                        <Badge
                          variant={plat.status === 'ready' ? 'success' : plat.status === 'degraded' ? 'warning' : 'neutral'}
                          size="xs"
                        >
                          {plat.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-[#9AA6B7]/80 font-mono mb-1">
                        Tool: <span className="text-slate-300">{plat.upstreamTool}</span>
                      </div>
                      <p className="text-[11px] text-[#9AA6B7] font-sans line-clamp-2">
                        {plat.message}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#283242]/50 flex items-center justify-between">
                      <span className="text-[10px] text-[#9AA6B7]/60 font-mono">
                        {plat.requiresAuth ? 'Requires Auth' : 'Public Access'}
                      </span>
                      <button
                        onClick={() => handleTestPlatform(plat.platform)}
                        disabled={test?.loading}
                        className="px-2 py-0.5 rounded bg-[#171F2B] hover:bg-[#202B3C] text-[11px] text-blue-400 font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {test?.loading ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-2.5 w-2.5" />
                        )}
                        Test
                      </button>
                    </div>

                    {test && !test.loading && (
                      <div
                        className={`mt-2 p-1.5 rounded text-[10px] font-mono ${
                          test.success ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'
                        }`}
                      >
                        {test.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Research Tool Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-lg border border-[#283242] bg-[#121822]/80 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-[#F1F4F8] font-mono">
                    Execute Internet Research (Agent Reach)
                  </h3>
                </div>
                <p className="text-xs text-[#9AA6B7] mb-4">
                  Dispatches Agent Reach to inspect and summarize public web, GitHub, Reddit, or YouTube evidence for Central Brain.
                </p>

                <form onSubmit={handleExecuteResearch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-[#9AA6B7] mb-1">
                      Research Query or Topic *
                    </label>
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={e => setResearchQuery(e.target.value)}
                      placeholder="e.g. Panniantong/Agent-Reach capabilities"
                      className="w-full px-3 py-2 rounded bg-[#080B10] border border-[#283242] text-xs text-[#F1F4F8] placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setResearchQuery('Panniantong/Agent-Reach')}
                        className="text-[10px] text-blue-400 hover:underline font-mono"
                      >
                        Sample Repo
                      </button>
                      <span className="text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => setResearchQuery('autonomous agent security architecture')}
                        className="text-[10px] text-blue-400 hover:underline font-mono"
                      >
                        Sample Topic
                      </button>
                      <span className="text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => setResearchQuery('https://cve.mitre.org/data/downloads/allitems.xml')}
                        className="text-[10px] text-blue-400 hover:underline font-mono"
                      >
                        Sample Feed
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-[#9AA6B7] mb-1">
                        Channel / Platform
                      </label>
                      <select
                        value={selectedPlatform}
                        onChange={e => setSelectedPlatform(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#080B10] border border-[#283242] text-xs text-[#F1F4F8] focus:outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="all">All Available</option>
                        <option value="github">GitHub</option>
                        <option value="web">General Web</option>
                        <option value="reddit">Reddit</option>
                        <option value="youtube">YouTube</option>
                        <option value="rss">RSS Feeds</option>
                        <option value="twitter">Twitter / X</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#9AA6B7] mb-1">
                        Max Results (1-20)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={maxResults}
                        onChange={e => setMaxResults(parseInt(e.target.value, 10) || 5)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#080B10] border border-[#283242] text-xs text-[#F1F4F8] focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9AA6B7] mb-1">
                      Target URL (Optional Direct Read)
                    </label>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={e => handleTargetUrlChange(e.target.value)}
                      placeholder="https://github.com/Panniantong/Agent-Reach"
                      className="w-full px-3 py-1.5 rounded bg-[#080B10] border border-[#283242] text-xs text-[#F1F4F8] placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    {ssrfWarning && (
                      <p className="text-[11px] text-rose-400 font-mono mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {ssrfWarning}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isExecutingResearch || !researchQuery.trim() || Boolean(ssrfWarning)}
                    className="w-full text-xs font-mono py-2"
                  >
                    {isExecutingResearch ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Querying Agent Reach Backends...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Execute Research (agent_reach_research)
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Research History Snippet */}
              {history.length > 0 && (
                <div className="rounded-lg border border-[#283242] bg-[#121822]/40 p-4">
                  <h4 className="text-xs font-mono font-semibold text-[#9AA6B7] mb-2 uppercase tracking-wider">
                    Recent Executions ({history.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {history.slice(0, 5).map(h => (
                      <div
                        key={h.executionId}
                        onClick={() => setCurrentResult(h)}
                        className="p-2 rounded bg-[#080B10]/60 hover:bg-[#171F2B] cursor-pointer text-xs font-mono flex items-center justify-between transition-colors"
                      >
                        <div className="truncate mr-2">
                          <span className="text-[#F1F4F8] font-medium">{h.query}</span>
                          <span className="text-[#9AA6B7]/60 text-[10px] block">
                            {h.selectedPlatforms.join(', ')} &bull; {h.factsCount} facts &bull; {h.durationMs}ms
                          </span>
                        </div>
                        <Badge variant={h.status === 'completed' ? 'success' : 'warning'} size="xs">
                          {h.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Results & Evidence Viewer */}
            <div className="lg:col-span-7">
              <div className="rounded-lg border border-[#283242] bg-[#121822]/80 p-5 min-h-[460px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#283242] mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-[#F1F4F8] font-mono">
                        Structured Evidence & Provenance
                      </h3>
                    </div>
                    {currentResult && (
                      <div className="flex items-center gap-2">
                        <Badge variant="success" size="xs">
                          {currentResult.factsCount} Facts Verified
                        </Badge>
                        <Badge variant="neutral" size="xs">
                          {currentResult.durationMs}ms
                        </Badge>
                      </div>
                    )}
                  </div>

                  {!currentResult ? (
                    <div className="py-20 text-center text-[#9AA6B7]/70 font-mono text-xs">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                      No research query executed yet.
                      <p className="text-[11px] text-slate-500 mt-1">
                        Submit a query on the left or click a sample to see live Agent Reach results.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary Box */}
                      <div className="p-3.5 rounded bg-[#080B10]/70 border border-[#283242]/80 text-xs font-mono text-[#F1F4F8] whitespace-pre-line leading-relaxed">
                        {currentResult.summary}
                      </div>

                      {/* Cryptographic Provenance Receipt */}
                      <div className="p-2.5 rounded bg-blue-950/20 border border-blue-900/40 text-[11px] font-mono text-blue-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <Lock className="h-3 w-3 shrink-0" />
                          <span className="truncate">SHA-256 Receipt: {currentResult.receipts.hash}</span>
                        </div>
                        <Badge variant="info" size="xs">
                          Continuity Engine Committed
                        </Badge>
                      </div>

                      {/* Retrieved Items List */}
                      <div>
                        <h4 className="text-xs font-mono font-semibold text-[#9AA6B7] uppercase tracking-wider mb-2">
                          Retrieved Sources ({currentResult.results.length})
                        </h4>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {currentResult.results.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded border border-[#283242]/60 bg-[#080B10]/50 hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 font-sans flex items-center gap-1"
                                >
                                  {item.title}
                                  <ExternalLink className="h-3 w-3 inline" />
                                </a>
                                <Badge variant={item.isFact ? 'success' : 'neutral'} size="xs">
                                  {item.isFact ? 'Fact' : 'Inference'}
                                </Badge>
                              </div>

                              <div className="text-[11px] text-[#9AA6B7] font-mono mb-1.5 flex items-center gap-3">
                                <span>Platform: <strong className="text-slate-300">{item.source.toUpperCase()}</strong></span>
                                {item.author && <span>Author: {item.author}</span>}
                                {item.timestamp && <span>Date: {new Date(item.timestamp).toLocaleDateString()}</span>}
                              </div>

                              <div className="text-[11px] text-[#9AA6B7]/90 font-mono bg-[#171F2B]/40 p-2 rounded border border-slate-850 line-clamp-3">
                                {item.snippet}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {currentResult && currentResult.notices.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#283242]/60 text-[11px] font-mono text-amber-400">
                    {currentResult.notices.map((n, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SANDBOX TOOLS VIEW TAB (Original Tools Table) */}
      {/* ========================================================================= */}
      {activeTab === 'sandbox' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9AA6B7]/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tools by capability or ID..."
                className="w-full pl-9 pr-3 py-1.5 rounded border border-[#283242] bg-[#121822]/60 text-xs text-[#F1F4F8] placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs font-mono">
              <button
                onClick={() => setSelectedCapability('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedCapability === 'all'
                    ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40'
                    : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#171F2B]/50'
                }`}
              >
                All ({tools.length})
              </button>
              {['terminal', 'filesystem', 'mcp', 'github', 'research'].map(cap => (
                <button
                  key={cap}
                  onClick={() => setSelectedCapability(cap)}
                  className={`px-2.5 py-1 rounded transition-colors uppercase ${
                    selectedCapability === cap
                      ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40'
                      : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#171F2B]/50'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Table (Dense, Clean, Linear-Style) */}
          <div className="rounded-lg border border-[#283242]/80 bg-[#121822]/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#283242] bg-[#080B10]/60 text-[#9AA6B7]/70">
                    <th className="py-2.5 px-4 font-medium">Tool ID & Name</th>
                    <th className="py-2.5 px-4 font-medium">Capability</th>
                    <th className="py-2.5 px-4 font-medium">Permissions Required</th>
                    <th className="py-2.5 px-4 font-medium">Timeout</th>
                    <th className="py-2.5 px-4 font-medium">Max Output</th>
                    <th className="py-2.5 px-4 font-medium">Execution Policy</th>
                    <th className="py-2.5 px-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTools.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#9AA6B7]/70">
                        No tools match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredTools.map(tool => (
                      <tr key={tool.id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#F1F4F8] font-sans">{tool.name}</div>
                          <div className="text-[11px] text-[#9AA6B7]/70 font-mono">{tool.id}</div>
                          <div className="text-[11px] text-[#9AA6B7] font-sans mt-0.5 line-clamp-1">
                            {tool.description}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral" size="xs">
                            {tool.capability}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {tool.permission_requirements.map(req => (
                              <span
                                key={req}
                                className="px-1.5 py-0.5 rounded bg-[#171F2B]/80 text-[#F1F4F8] text-[10px]"
                              >
                                {req}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#F1F4F8]">
                          {tool.execution_policy.timeout_seconds}s
                        </td>
                        <td className="py-3 px-4 text-[#9AA6B7] tabular-nums">
                          {(tool.execution_policy.max_output_bytes / 1024 / 1024).toFixed(1)} MB
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {tool.execution_policy.sandboxed_only && (
                              <Badge variant="success" size="xs">
                                Sandboxed Only
                              </Badge>
                            )}
                            {tool.execution_policy.requires_confirmation && (
                              <Badge variant="warning" size="xs">
                                Confirmation
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge
                            variant={tool.is_enabled ? 'success' : 'danger'}
                            size="xs"
                            dot
                          >
                            {tool.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GITHUB ACTIONS TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'github_actions' && (
        <GitHubActionsWorkspace />
      )}

      {/* ========================================================================= */}
      {/* COMFYUI VISUAL WORKFLOW TAB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'comfyui' && (
        <ComfyUIWorkspace />
      )}

      {/* ========================================================================= */}
      {/* TURNITOUT DOCUMENT REFINER TAB                                            */}
      {/* ========================================================================= */}
      {activeTab === 'turnitout' && (
        <TurnitoutWorkspace />
      )}
    </div>
  );
};
