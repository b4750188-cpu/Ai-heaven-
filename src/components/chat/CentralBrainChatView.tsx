/**
 * AI HEAVEN - Central Brain Direct Chat Workspace
 * First-class conversational engineering console connected directly to the Central Brain.
 * Features:
 * - Real-time Central Brain routing and execution
 * - Conversation persistence, renaming, deletion, and thread history
 * - Multi-model selection (Auto, Gemini 2.5 Flash, Gemini 2.5 Pro, Claude 3.7 Sonnet, GPT-4o, DeepSeek R1)
 * - Structured markdown rendering with syntax-highlighted code blocks and copy buttons
 * - Guaranteed non-blank initial state and resilient error recovery with 1-click Retry
 * - Starter prompt chips that immediately dispatch on click
 * - Mobile-first responsive touch layout designed for mobile and desktop
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Bot,
  User,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Terminal,
  Shield,
  Zap,
  Code2,
  Crosshair
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { BugHuntWorkspace } from '../bughunt/BugHuntWorkspace';

interface ConversationThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  activeModel: string;
  projectId?: string;
  projectName?: string;
  isAutoRouting?: boolean;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  agentName?: string;
  content: string;
  timestamp: string;
  modelUsed?: string;
  metadata?: {
    decisionId?: string;
    domain?: string;
    isLiveProvider?: boolean;
    fallbackModel?: string;
    latencyMs?: number;
    inferenceLocation?: 'local' | 'cloud';
    isLocalInference?: boolean;
    [key: string]: any;
  };
}

interface CentralBrainChatViewProps {
  initialMode?: 'normal' | 'bughunt';
  currentUser?: any;
  onOpenAuth?: () => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToHunt?: (target: string) => void;
  onNavigateToTools?: () => void;
}

/**
 * Custom lightweight Markdown Parser component for Central Brain responses
 */
const FormattedMessageContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const [copiedCodeBlockIdx, setCopiedCodeBlockIdx] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlockIdx(idx);
    setTimeout(() => setCopiedCodeBlockIdx(null), 2000);
  };

  if (isUser) {
    return <div className="whitespace-pre-wrap font-sans text-xs text-[#F1F4F8] leading-relaxed">{content}</div>;
  }

  // Parse code blocks with ```lang ... ```
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockCounter = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text preceding code block
    if (match.index > lastIndex) {
      const textChunk = content.substring(lastIndex, match.index);
      parts.push(
        <TextSection key={`text_${lastIndex}`} text={textChunk} />
      );
    }

    const language = match[1] || 'code';
    const codeContent = match[2].trimEnd();
    const currentIdx = blockCounter++;

    parts.push(
      <div key={`code_${currentIdx}`} className="my-2.5 rounded-lg border border-[#283242] bg-[#080B10] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#121822] border-b border-[#283242] text-[10px] font-mono text-[#9AA6B7]">
          <div className="flex items-center gap-1.5">
            <Code2 className="h-3 w-3 text-[#42D9F5]" />
            <span className="uppercase text-[#42D9F5] font-semibold">{language}</span>
          </div>
          <button
            onClick={() => copyCode(codeContent, currentIdx)}
            className="flex items-center gap-1 hover:text-[#F1F4F8] transition-colors cursor-pointer"
            title="Copy code snippet"
          >
            {copiedCodeBlockIdx === currentIdx ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-[#34D399]" />
                <span className="text-[#34D399]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3 text-xs font-mono text-[#38BDF8] overflow-x-auto leading-relaxed select-text">
          <code>{codeContent}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add trailing text
  if (lastIndex < content.length) {
    const textChunk = content.substring(lastIndex);
    parts.push(
      <TextSection key={`text_end_${lastIndex}`} text={textChunk} />
    );
  }

  return <div className="space-y-1.5 text-xs text-[#F1F4F8] leading-relaxed">{parts}</div>;
};

/**
 * Text section renderer for headings, bullet points, and inline emphasis
 */
const TextSection: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 font-sans">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Provider Notice callout banner
        if (trimmed.startsWith('[PROVIDER NOTICE:') || trimmed.startsWith('[CENTRAL BRAIN')) {
          return (
            <div key={i} className="my-1.5 p-2 rounded border border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24] text-[11px] font-mono flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>{trimmed}</span>
            </div>
          );
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-xs font-bold font-mono text-[#42D9F5] pt-1">
              {trimmed.substring(4)}
            </h4>
          );
        }

        // Heading 2 / 1
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={i} className="text-sm font-bold font-mono text-[#F1F4F8] pt-1.5">
              {trimmed.replace(/^#+\s/, '')}
            </h3>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const bulletText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-[#42D9F5] font-bold">&bull;</span>
              <span className="flex-1">{renderInlineStyles(bulletText)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="font-mono text-[10px] text-[#42D9F5] font-bold min-w-[16px]">{numMatch[1]}.</span>
              <span className="flex-1">{renderInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        return <p key={i}>{renderInlineStyles(line)}</p>;
      })}
    </div>
  );
};

/**
 * Inline style helper for **bold** and `code`
 */
function renderInlineStyles(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b_${match.index}`} className="font-semibold text-[#F1F4F8]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`c_${match.index}`} className="px-1.5 py-0.5 rounded bg-[#171F2B] border border-[#283242] font-mono text-[11px] text-[#42D9F5]">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

export const CentralBrainChatView: React.FC<CentralBrainChatViewProps> = ({
  initialMode = 'normal',
  currentUser,
  onOpenAuth,
  onNavigateToProject,
  onNavigateToHunt,
  onNavigateToTools
}) => {
  const [chatMode, setChatMode] = useState<'normal' | 'bughunt'>(initialMode);

  // Guaranteed initial session so the view is NEVER blank even before network loads
  const [conversations, setConversations] = useState<ConversationThread[]>([
    {
      id: 'session_primary',
      title: 'Current Brain Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      activeModel: 'auto'
    }
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>('session_primary');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Status & Telemetry
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);

  // Mobile drawer toggle for conversation list
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialData = async () => {
    setIsLoadingInitial(true);
    try {
      const [convList, provList, brainModels] = await Promise.all([
        apiClient.getConversations().catch(() => []),
        apiClient.getBrainProviderStatuses().catch(() => []),
        apiClient.getBrainModels().catch(() => [])
      ]);

      if (convList && convList.length > 0) {
        setConversations(convList);
        setActiveConversationId(convList[0].id);
      } else {
        // Create an official server conversation thread
        try {
          const newThread = await apiClient.createConversation('New Brain Session', selectedModel);
          if (newThread && newThread.id) {
            setConversations([newThread]);
            setActiveConversationId(newThread.id);
          }
        } catch {
          // Keep local fallback thread
        }
      }

      setProviders(provList || []);
      setModels(brainModels || []);
    } catch (err: any) {
      setErrorBanner('Central Brain telemetry notice: ' + (err.message || 'Connecting to brain...'));
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const loadMessages = async (convId: string) => {
    if (convId === 'session_primary') return;
    try {
      const msgs = await apiClient.getConversationMessages(convId);
      if (Array.isArray(msgs)) {
        setMessages(msgs);
      }
    } catch (err: any) {
      // If fetching fails on newly created or local session, keep current messages
    }
  };

  const handleCreateNewChat = async () => {
    setErrorBanner(null);
    try {
      const newThread = await apiClient.createConversation('New Brain Session', selectedModel);
      setConversations(prev => [newThread, ...prev.filter(c => c.id !== 'session_primary')]);
      setActiveConversationId(newThread.id);
      setMessages([]);
      setIsSidebarOpenMobile(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err: any) {
      // Fallback local creation
      const localThread: ConversationThread = {
        id: `conv_${Date.now()}`,
        title: 'New Brain Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        activeModel: selectedModel
      };
      setConversations(prev => [localThread, ...prev]);
      setActiveConversationId(localThread.id);
      setMessages([]);
      setIsSidebarOpenMobile(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  /**
   * Send message handler supporting both text from input box and direct string override (e.g. starter chips or retry)
   */
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const text = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!text || isSending) return;

    setErrorBanner(null);
    setLastFailedPrompt(null);

    // Ensure we have a valid conversation thread
    let targetConvId = activeConversationId;
    if (!targetConvId || targetConvId === 'session_primary') {
      try {
        const newThread = await apiClient.createConversation('New Brain Session', selectedModel);
        setConversations(prev => [newThread, ...prev.filter(c => c.id !== 'session_primary')]);
        targetConvId = newThread.id;
        setActiveConversationId(targetConvId);
      } catch {
        targetConvId = `conv_${Date.now()}`;
        setActiveConversationId(targetConvId);
      }
    }

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: targetConvId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const result = await apiClient.chatInConversation(targetConvId, text, selectedModel);
      
      // Update with verified server messages
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        result.userMessage || tempUserMsg,
        result.assistantMessage
      ]);

      // Update thread title if first message
      const activeThread = conversations.find(c => c.id === targetConvId);
      if (activeThread && (activeThread.title === 'New Brain Session' || activeThread.title === 'Current Brain Session')) {
        const generatedTitle = text.length > 28 ? text.substring(0, 28) + '...' : text;
        await handleSaveRename(targetConvId, generatedTitle);
      }

      // Update message count in thread list
      setConversations(prev => prev.map(c => 
        c.id === targetConvId 
          ? { ...c, messageCount: c.messageCount + 2, updatedAt: new Date().toISOString() } 
          : c
      ));
    } catch (err: any) {
      setLastFailedPrompt(text);
      setErrorBanner(`Central Brain routing error: ${err.message || 'Execution failed'}`);
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartRename = (conv: ConversationThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (convId: string, customTitle?: string) => {
    const titleToSave = (customTitle || editTitle).trim();
    if (!titleToSave) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await apiClient.updateConversation(convId, { title: titleToSave });
      setConversations(prev => prev.map(c => c.id === convId ? (updated || { ...c, title: titleToSave }) : c));
      setEditingId(null);
    } catch {
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: titleToSave } : c));
      setEditingId(null);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          handleCreateNewChat();
        }
      }
    } catch (err: any) {
      setErrorBanner('Failed to delete session: ' + (err.message || 'Unknown error'));
    }
  };

  const copyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeThread = conversations.find(c => c.id === activeConversationId);
  const geminiProvider = providers.find(p => p.provider === 'google');
  const isGeminiLive = geminiProvider?.isConfigured;

  return (
    <div className="flex flex-col min-h-[600px] h-[calc(100vh-8rem)] md:h-[calc(100vh-6.5rem)] rounded-xl border border-[#222632] bg-[#0E1015] overflow-hidden shadow-2xl">
      {/* Top Header Bar with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#222632] bg-[#12141C]">
        <div className="flex items-center gap-3">
          {chatMode === 'normal' && (
            <button
              onClick={() => setIsSidebarOpenMobile(prev => !prev)}
              className="md:hidden p-1.5 rounded-lg border border-[#222632] bg-[#161822] text-[#9CA3AF] hover:text-[#F3F4F6]"
              title="Toggle Sessions Drawer"
            >
              <Layers className="h-4 w-4" />
            </button>
          )}

          {/* Mode Switcher: Normal Chat vs Bug Hunting */}
          <div className="flex items-center rounded-lg border border-[#262B37] bg-[#0A0B0E] p-0.5">
            <button
              onClick={() => setChatMode('normal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                chatMode === 'normal'
                  ? 'bg-[#F4F4F6] text-[#090A0D] font-semibold shadow-xs'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <Brain className="h-3 w-3" />
              <span>Normal Chat</span>
            </button>
            <button
              onClick={() => setChatMode('bughunt')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                chatMode === 'bughunt'
                  ? 'bg-[#F4F4F6] text-[#090A0D] font-semibold shadow-xs'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <Crosshair className="h-3 w-3" />
              <span>Bug Hunting</span>
            </button>
          </div>

          <span className={`hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${
            isGeminiLive
              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
              : 'bg-[#9CA3AF]/10 text-[#9CA3AF] border-[#9CA3AF]/30'
          }`}>
            {isGeminiLive ? 'LIVE GEMINI 3.8' : 'SANDBOX RUNTIME'}
          </span>
        </div>

        {/* Model Switcher & New Chat button (Only visible in Normal Chat mode) */}
        {chatMode === 'normal' ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="text-xs font-mono bg-[#161822] text-[#F3F4F6] border border-[#2E3342] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white cursor-pointer"
              >
                <option value="auto">Auto-Routing (Central Brain)</option>
                <optgroup label="Local On-Device Engine (Edge0 SSD-MoE)">
                  <option value="edge0-35b-a3b">Edge0 35B MoE (Local SSD-Stream)</option>
                  <option value="edge0-8b-a1b">Edge0 8B MoE (Local Ultra-Light)</option>
                </optgroup>
                <optgroup label="Cloud Providers">
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Active Inference)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Reasoning)</option>
                  <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="deepseek-r1">DeepSeek R1</option>
                </optgroup>
              </select>
            </div>

            <button
              onClick={handleCreateNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F4F4F6] text-[#090A0D] hover:bg-white transition-colors cursor-pointer"
              title="Create new conversation session"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-mono text-[#9CA3AF]">
            Scope Policy: <span className="text-[#10B981]">Strict Pre-Flight Enforcement</span>
          </div>
        )}
      </div>

      {/* Mode View: Bug Hunting Workspace vs Normal Chat Canvas */}
      {chatMode === 'bughunt' ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#090A0D]">
          <BugHuntWorkspace currentUser={currentUser || null} onOpenAuth={onOpenAuth || (() => {})} />
        </div>
      ) : (
        /* Main Workspace: Left Sidebar + Right Chat Canvas */
        <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Conversation History */}
        <div className={`
          absolute md:static inset-y-0 left-0 z-30 w-72 bg-[#0D1118] border-r border-[#283242] flex flex-col transition-transform duration-200
          ${isSidebarOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-3 border-b border-[#283242] space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#9AA6B7]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="w-full bg-[#121822] border border-[#283242] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:outline-none focus:border-[#42D9F5]"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#9AA6B7]">
                No matching sessions found.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConversationId;
                const isEditing = conv.id === editingId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setIsSidebarOpenMobile(false);
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                      isActive
                        ? 'bg-[#121822] border-[#42D9F5]/50 text-[#F1F4F8] font-medium'
                        : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Bot className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#42D9F5]' : 'text-[#9AA6B7]'}`} />
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full bg-[#080B10] border border-[#42D9F5] rounded px-1.5 py-0.5 text-xs text-[#F1F4F8] focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => handleSaveRename(conv.id)}
                            className="p-1 hover:text-[#34D399]"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 hover:text-[#F87171]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="truncate flex-1">
                          <p className="truncate text-xs font-mono">{conv.title}</p>
                          <p className="text-[10px] text-[#9AA6B7]/60 truncate mt-0.5">
                            {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {conv.messageCount} msgs
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                        <button
                          onClick={e => handleStartRename(conv, e)}
                          className="p-1 text-[#9AA6B7] hover:text-[#42D9F5]"
                          title="Rename session"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={e => handleDeleteConversation(conv.id, e)}
                          className="p-1 text-[#9AA6B7] hover:text-[#F87171]"
                          title="Delete session"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="p-3 border-t border-[#283242] bg-[#121822]/60 text-[11px] font-mono text-[#9AA6B7] space-y-1">
            <div className="flex justify-between">
              <span>Saved Sessions:</span>
              <span className="text-[#F1F4F8]">{conversations.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Execution Engine:</span>
              <span className="text-[#34D399]">Central Brain</span>
            </div>
          </div>
        </div>

        {/* Backdrop for mobile drawer */}
        {isSidebarOpenMobile && (
          <div
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs md:hidden"
            onClick={() => setIsSidebarOpenMobile(false)}
          />
        )}

        {/* Right Chat Canvas */}
        <div className="flex-1 flex flex-col bg-[#080B10] overflow-hidden">
          {errorBanner && (
            <div className="p-3 bg-[#F87171]/10 border-b border-[#F87171]/30 text-[#F87171] text-xs flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <div className="flex items-center gap-2">
                {lastFailedPrompt && (
                  <button
                    onClick={() => handleSendMessage(undefined, lastFailedPrompt)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] text-xs font-mono font-bold cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  onClick={() => setErrorBanner(null)}
                  className="hover:text-[#F1F4F8] p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Message List */}
          {/* Message List - Spacious Centered Column */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-6">
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 text-[#9CA1B2] py-8 animate-in fade-in duration-300">
                  <div className="h-14 w-14 rounded-2xl bg-[#1C1E26] border border-[#2E303E] flex items-center justify-center text-white shadow-md">
                    <Brain className="h-7 w-7 text-neutral-200" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h2 className="text-xl font-semibold tracking-tight text-white font-sans">
                      Central Brain
                    </h2>
                    <p className="text-xs text-[#9CA1B2] leading-relaxed">
                      Conversational engineering, model consensus routing, and autonomous vulnerability auditing with cryptographic execution receipts.
                    </p>
                  </div>

                  {/* 4 Claude-Style Spacious Prompt Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl pt-2">
                    {[
                      {
                        title: 'Audit Workspace Security',
                        desc: 'Run multi-droid scope & vulnerability inspection',
                        prompt: '/hunt scope=workspace'
                      },
                      {
                        title: 'Fast-Path Coding with jcode',
                        desc: 'Apply AST-verified patches and diffs',
                        prompt: 'Refactor error boundaries with AST verification'
                      },
                      {
                        title: 'Inspect Dynamic Model Router',
                        desc: 'Compare latencies, token economics, and failover',
                        prompt: 'Compare model latency, tokens, and failover paths'
                      },
                      {
                        title: 'Verify Security Boundaries',
                        desc: 'Confirm VFS isolation and exit code 126 enforcement',
                        prompt: 'List all active tools and verify sandbox limits'
                      }
                    ].map((card, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(undefined, card.prompt)}
                        className="text-left p-3.5 rounded-2xl border border-[#262835] bg-[#14151C] hover:bg-[#1A1C25] hover:border-[#383B4C] transition-all cursor-pointer group shadow-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-medium text-white group-hover:text-white">
                          <span>{card.title}</span>
                          <Zap className="h-3.5 w-3.5 text-[#9CA1B2] group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-[11px] text-[#9CA1B2] leading-relaxed">
                          {card.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 w-full`}
                    >
                      {/* Message Meta Info */}
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA1B2] px-1 font-mono">
                        <span className="font-medium text-neutral-300">
                          {isUser ? 'You' : (msg.agentName || 'AI Heaven Brain')}
                        </span>
                        {msg.modelUsed && (
                          <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${
                            msg.metadata?.inferenceLocation === 'local' || msg.metadata?.isLocalInference
                              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 font-semibold shadow-xs'
                              : 'bg-[#1C1E26] border-[#2B2D3A] text-neutral-300'
                          }`}>
                            {msg.metadata?.inferenceLocation === 'local' || msg.metadata?.isLocalInference ? '⚡ Local · ' : '☁️ Cloud · '}
                            {msg.modelUsed}
                          </span>
                        )}
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`rounded-2xl p-4 text-xs leading-relaxed border transition-colors ${
                        isUser
                          ? 'max-w-[85%] bg-[#222430] border-[#313445] text-white shadow-xs'
                          : 'w-full bg-[#14151D] border-[#242633] text-[#EDEDF2] shadow-xs'
                      }`}>
                        <FormattedMessageContent content={msg.content} isUser={isUser} />
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center gap-3 text-[10px] text-[#9CA1B2] px-1">
                        <button
                          onClick={() => copyText(msg.content, msg.id)}
                          className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-mono">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        {msg.metadata?.domain && (
                          <span className="text-neutral-400 font-mono">
                            Domain: {msg.metadata.domain}
                          </span>
                        )}
                        {msg.metadata?.latencyMs !== undefined && (
                          <span className="font-mono text-[#9CA1B2]/60">
                            {msg.metadata.latencyMs}ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isSending && (
                <div className="flex items-center gap-3 text-xs text-[#9CA1B2] p-4 rounded-2xl bg-[#14151D] border border-[#242633] max-w-md animate-pulse font-mono">
                  <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>Central Brain evaluating request and routing execution...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Message Composer (Spacious, Softly Rounded, Claude-Style) */}
          <div className="p-4 sm:p-5 border-t border-[#222632] bg-[#0E1015]/80 backdrop-blur-md">
            <div className="max-w-3xl mx-auto w-full">
              <form onSubmit={(e) => handleSendMessage(e)} className="space-y-2">
                <div className="relative rounded-2xl border border-[#2E303E] bg-[#161720] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-400/20 transition-all shadow-lg p-2.5">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Central Brain or submit engineering / bug hunt commands... (Shift+Enter for newline, Enter to send)"
                    rows={2}
                    disabled={isSending}
                    className="w-full bg-transparent px-2.5 py-1.5 text-xs text-white placeholder-[#9CA1B2]/60 focus:outline-none resize-none font-sans"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-[#282A36]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInputText('/hunt scope=')}
                        className="px-2 py-1 rounded-lg border border-[#2B2D3A] bg-[#1E202B] hover:bg-[#252836] text-[10px] font-mono text-neutral-300 transition-colors"
                        title="Add bug hunt command"
                      >
                        + /hunt
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputText('/audit tools')}
                        className="px-2 py-1 rounded-lg border border-[#2B2D3A] bg-[#1E202B] hover:bg-[#252836] text-[10px] font-mono text-neutral-300 transition-colors"
                        title="Add audit command"
                      >
                        + /audit
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline text-[10px] font-mono text-[#9CA1B2]">
                        {selectedModel}
                      </span>
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isSending}
                        className="flex items-center justify-center h-8 px-3.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                      >
                        <span>{isSending ? 'Routing...' : 'Send'}</span>
                        <Send className="w-3 h-3 ml-1.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
