/**
 * AI HEAVEN - SOURCE: Collective Knowledge Pool & Droid Family Console
 * Unified interface for searching, filtering, contributing, verifying,
 * and relating shared knowledge across an authenticated family's droids.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCode,
  GitBranch,
  History,
  Layers,
  Link2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Users,
  X,
  Zap
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import {
  DroidFamily,
  InterDroidFamilyMessage,
  KnowledgeCategory,
  RelationshipType,
  SourceKnowledgeEntry,
  VerificationStatus
} from '../../types/sourceKnowledge';

interface SourceKnowledgeViewProps {
  currentUser?: any;
  onOpenAuth?: () => void;
}

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  research_discovery: 'Research & Discovery',
  solution_procedure: 'Solutions & Procedures',
  droid_experience: 'Droid Experience',
  tool_capability: 'Tool Capabilities',
  task_context: 'Task Context',
  correction_verification: 'Corrections & Verification'
};

export const SourceKnowledgeView: React.FC<SourceKnowledgeViewProps> = ({ currentUser, onOpenAuth }) => {
  const [family, setFamily] = useState<DroidFamily | null>(null);
  const [entries, setEntries] = useState<SourceKnowledgeEntry[]>([]);
  const [messages, setMessages] = useState<InterDroidFamilyMessage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState<any>({ byCategory: {}, byStatus: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'family' | 'messages'>('catalog');

  // Modals
  const [selectedEntry, setSelectedEntry] = useState<SourceKnowledgeEntry | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);

  // Form State for New Entry
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('solution_procedure');
  const [newStatus, setNewStatus] = useState<VerificationStatus>('VERIFIED');
  const [newTags, setNewTags] = useState('reusable, debugging, automated_test');
  const [newEvidence, setNewEvidence] = useState('Verified by test trace in isolated container sandbox');
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Peer inquiry form state
  const [inquiryFromDroid, setInquiryFromDroid] = useState('argus_01');
  const [inquiryToDroid, setInquiryToDroid] = useState('hydra_02');
  const [inquirySubject, setInquirySubject] = useState('Querying API authorization fuzzer tool capabilities');
  const [inquiryStatus, setInquiryStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus]);

  const loadData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [famData, poolData, msgData] = await Promise.all([
        apiClient.getFamilyCurrent(),
        apiClient.getSourcePool({
          query: searchQuery || undefined,
          category: (selectedCategory as any) || undefined,
          verificationStatus: (selectedStatus as any) || undefined,
          limit: 50
        }),
        apiClient.getFamilyMessages(40)
      ]);

      setFamily(famData);
      setEntries(poolData.entries);
      setTotalCount(poolData.total);
      setFacets(poolData.facets);
      setMessages(msgData);
    } catch (err: any) {
      console.error('Failed to load SOURCE data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setFormError('Title and content are required.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    setFormWarnings([]);

    try {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const evidenceArray = newEvidence.trim()
        ? [
            {
              evidenceType: 'test_result',
              snippet: newEvidence.trim(),
              verifiedAt: new Date().toISOString()
            }
          ]
        : [];

      const res = await apiClient.contributeSourceKnowledge({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        requestedStatus: newStatus,
        tags: tagsArray,
        evidence: evidenceArray
      });

      if (res.warnings && res.warnings.length > 0) {
        setFormWarnings(res.warnings);
      }

      setIsContributeModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewEvidence('');
      await loadData(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to contribute knowledge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEntry = async (entry: SourceKnowledgeEntry) => {
    try {
      await apiClient.verifySourceEntry(
        entry.id,
        'Formally reproduced and verified by Cerberus-06 independent cryptographic runner',
        'cerberus_06'
      );
      await loadData(true);
      if (selectedEntry?.id === entry.id) {
        const refreshed = await apiClient.getSourceEntry(entry.id);
        setSelectedEntry(refreshed);
      }
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    }
  };

  const handleArchiveEntry = async (entryId: string) => {
    if (!confirm('Archive this knowledge entry? It will be excluded from default searches.')) return;
    try {
      await apiClient.archiveSourceEntry(entryId);
      setSelectedEntry(null);
      await loadData(true);
    } catch (err: any) {
      alert(`Archive error: ${err.message}`);
    }
  };

  const handleSendPeerInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryStatus('Transmitting peer inquiry...');
    try {
      const res = await apiClient.sendFamilyMessage({
        fromDroidId: inquiryFromDroid,
        toDroidId: inquiryToDroid,
        messageType: 'status_query',
        subject: inquirySubject,
        payload: {
          intent: 'capability_check',
          requestedBy: 'operator_console',
          timestamp: new Date().toISOString()
        }
      });
      if (res.success) {
        setInquiryStatus('Inquiry dispatched! Automated peer response received.');
        await loadData(true);
        setTimeout(() => setInquiryStatus(null), 3000);
      } else {
        setInquiryStatus(`Failed: ${res.error}`);
      }
    } catch (err: any) {
      setInquiryStatus(`Error: ${err.message}`);
    }
  };

  if (isLoading && !family) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-mono tracking-wider">CONNECTING TO FAMILY SOURCE POOL...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-slate-200">
      {/* 1. Header & Family Ribbon */}
      <div className="rounded-xl border border-slate-800 bg-[#080B10]/95 p-5 backdrop-blur-md shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BookOpen className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-wide text-white">
                  SOURCE: Collective Knowledge Pool
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                  {family?.familyName || 'Private Family Pool'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Shared, verified intelligence foundation for the Central Brain and authorized family droids
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsContributeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors shadow-lg shadow-emerald-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Contribute Knowledge
            </button>
            <button
              onClick={() => loadData()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Family Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-1">
          <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-400" /> Total Knowledge
            </div>
            <div className="text-base font-mono font-bold text-white mt-1">
              {totalCount} <span className="text-xs font-normal text-slate-400">entries</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              Verified: {facets?.byStatus?.VERIFIED || 0} ({Math.round(((facets?.byStatus?.VERIFIED || 0) / (totalCount || 1)) * 100)}%)
            </div>
          </div>

          <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" /> Droid Family
            </div>
            <div className="text-base font-mono font-bold text-white mt-1">
              {family?.members.length || 9} <span className="text-xs font-normal text-slate-400">droids</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              Brain: {family?.centralBrainContext?.persona?.split(' ')[0] || 'Adaptive'}
            </div>
          </div>

          <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-violet-400" /> Cryptographic Integrity
            </div>
            <div className="text-base font-mono font-bold text-white mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              SHA-256 Sealed
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              Disputed: {facets?.byStatus?.DISPUTED || 0}
            </div>
          </div>

          <div className="rounded-lg bg-[#0D1118] border border-slate-800 p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" /> Tenant Boundary
            </div>
            <div className="text-xs font-mono font-medium text-white mt-1 truncate">
              {family?.ownerEmail || 'user_isolated'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              Scope: STRICT ISOLATION
            </div>
          </div>
        </div>
      </div>

      {/* 2. View Mode Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'catalog'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Knowledge Pool ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('family')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'family'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          Family Droids ({family?.members.length || 0})
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
          Peer Communications ({messages.length})
        </button>
      </div>

      {/* TAB 1: KNOWLEDGE CATALOG */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search solutions, discoveries, verified code, procedures, tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0D1118] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </form>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#0D1118] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#0D1118] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
              >
                <option value="">All Statuses</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="INFERRED">INFERRED</option>
                <option value="UNVERIFIED">UNVERIFIED</option>
                <option value="DISPUTED">DISPUTED</option>
                <option value="OUTDATED">OUTDATED</option>
              </select>
            </div>
          </div>

          {/* Entries Grid */}
          {entries.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#080B10] p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <BookOpen className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">No knowledge entries found</p>
              <p className="text-xs max-w-md">
                As your droids execute research, coding, testing, and debugging tasks, they will automatically contribute verified facts, lessons, and procedures to this pool.
              </p>
              <button
                onClick={() => setIsContributeModalOpen(true)}
                className="mt-2 text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> First Contribution
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="rounded-xl border border-slate-800 bg-[#0D1118] hover:border-slate-700 hover:bg-[#121822] p-4 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                        {CATEGORY_LABELS[entry.category] || entry.category}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                          entry.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : entry.verificationStatus === 'DISPUTED'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                            : entry.verificationStatus === 'INFERRED'
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {entry.verificationStatus}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mt-2 line-clamp-1">{entry.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3">{entry.content}</p>

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {entry.tags.slice(0, 3).map((t, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3 h-3 text-slate-400" />
                      {entry.contributor.name}
                    </span>
                    <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FAMILY DROIDS */}
      {activeTab === 'family' && family && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {family.members.map((droid) => (
            <div key={droid.droidId} className="rounded-xl border border-slate-800 bg-[#0D1118] p-4 flex flex-col justify-between">
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

                <h3 className="text-sm font-semibold text-white mt-2">{droid.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{droid.role}</p>

                <div className="mt-3 p-2 rounded bg-slate-900/60 border border-slate-800/80 text-xs">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">CURRENT OBJECTIVE</div>
                  <div className="text-xs font-medium text-slate-200 mt-0.5">{droid.currentObjective || 'Awaiting assignment'}</div>
                </div>

                <div className="mt-3">
                  <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">WHITELISTED TOOLS</div>
                  <div className="flex flex-wrap gap-1">
                    {droid.allowedTools.map((tool, idx) => (
                      <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-800">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Net Scope: {droid.permissions.networkAccess ? 'OUTBOUND' : 'DENIED'}</span>
                <span>Max: {droid.permissions.maxExecutionTimeSec}s</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PEER COMMUNICATIONS */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#080B10] p-4 flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Family Inter-Droid Signal Stream
            </h3>
            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  No peer communications logged. Use the inquiry dispatcher to coordinate.
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-slate-800 bg-[#0D1118] p-3 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-cyan-400 font-semibold">{msg.fromDroidId}</span>
                        <span className="text-slate-600">➔</span>
                        <span className="text-emerald-400 font-semibold">{msg.toDroidId}</span>
                        <span className="text-slate-500 text-[10px]">[{msg.messageType}]</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-medium text-white">{msg.subject}</div>
                    <div className="text-[11px] font-mono text-slate-400 bg-black/40 p-1.5 rounded truncate">
                      Payload: {JSON.stringify(msg.payload)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Peer Inquiry Dispatcher */}
          <div className="rounded-xl border border-slate-800 bg-[#080B10] p-4 flex flex-col gap-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              Send Peer Droid Inquiry
            </h3>
            <form onSubmit={handleSendPeerInquiry} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">From Droid</label>
                <select
                  value={inquiryFromDroid}
                  onChange={(e) => setInquiryFromDroid(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  {family?.members.map((d) => (
                    <option key={d.droidId} value={d.droidId}>
                      {d.name} ({d.codename})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">To Peer Droid</label>
                <select
                  value={inquiryToDroid}
                  onChange={(e) => setInquiryToDroid(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  {family?.members.map((d) => (
                    <option key={d.droidId} value={d.droidId}>
                      {d.name} ({d.codename})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Inquiry Subject</label>
                <input
                  type="text"
                  value={inquirySubject}
                  onChange={(e) => setInquirySubject(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                />
              </div>

              {inquiryStatus && (
                <div className="text-[11px] p-2 rounded bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono">
                  {inquiryStatus}
                </div>
              )}

              <button
                type="submit"
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-medium text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Peer Signal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KNOWLEDGE DETAIL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-800 bg-[#080B10] p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                {CATEGORY_LABELS[selectedEntry.category]}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  selectedEntry.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                }`}
              >
                {selectedEntry.verificationStatus}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white">{selectedEntry.title}</h2>
            <div className="p-3 rounded-lg bg-[#0D1118] border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {selectedEntry.content}
            </div>

            {/* Evidence List */}
            {selectedEntry.evidence.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verifiable Source Evidence ({selectedEntry.evidence.length})
                </h4>
                {selectedEntry.evidence.map((ev, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-black/50 border border-slate-800 text-xs flex flex-col gap-1 font-mono">
                    <div className="text-slate-300 text-[11px]">{ev.snippet}</div>
                    <div className="text-[9px] text-slate-500 truncate">SHA-256 Seal: {ev.sha256Seal}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Version Audit History */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <History className="w-3 h-3 text-cyan-400" /> Version History ({selectedEntry.versions.length} versions)
              </span>
              {selectedEntry.versions.map((v) => (
                <div key={v.versionNumber} className="flex justify-between text-[10px] text-slate-500">
                  <span>v{v.versionNumber} by {v.changedBy}: {v.changeReason}</span>
                  <span>{new Date(v.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => handleArchiveEntry(selectedEntry.id)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
              >
                <Archive className="w-3.5 h-3.5" /> Archive Entry
              </button>

              <div className="flex items-center gap-2">
                {selectedEntry.verificationStatus !== 'VERIFIED' && (
                  <button
                    onClick={() => handleVerifyEntry(selectedEntry)}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Formally Verify (Cerberus-06)
                  </button>
                )}
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTRIBUTE KNOWLEDGE */}
      {isContributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-[#080B10] p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
            <button
              onClick={() => setIsContributeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Contribute to Family SOURCE Pool
            </h2>
            <p className="text-xs text-slate-400">
              Published findings become permanently accessible to your Central Brain and all family droids.
            </p>

            {formError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleContributeSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Solution: Fixed async race condition in session revocation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Claim Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-[#0D1118] border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  >
                    <option value="VERIFIED">VERIFIED (Backed by evidence)</option>
                    <option value="INFERRED">INFERRED (Reasoned)</option>
                    <option value="UNVERIFIED">UNVERIFIED (Raw finding)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Content / Solution Details</label>
                <textarea
                  rows={4}
                  placeholder="Describe the solution, verified procedure, or failure cause in detail..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Source Evidence Snippet</label>
                <input
                  type="text"
                  placeholder="e.g. tests/auth_security.test.ts: Passed 8/8 test cases"
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Tags (Comma separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full bg-[#0D1118] border border-slate-700 rounded px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsContributeModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Publishing...' : 'Publish to SOURCE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
