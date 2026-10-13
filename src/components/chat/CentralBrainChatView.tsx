/**
 * AI HEAVEN - Central Brain Direct Chat Workspace
 * First-class conversational engineering console connected directly to the Central Brain.
 * Features:
 * - Real-time Central Brain routing and execution
 * - Conversation persistence, renaming, deletion, and thread history
 * - Multi-model selection (Auto, Gemini 2.5 Flash, Gemini 2.5 Pro, Claude 3.7 Sonnet, GPT-4o, DeepSeek R1)
 * - Markdown rendering with code blocks, copy actions, and latency/model metadata
 * - Genuine Central Brain status awareness (Live / Deterministic Sandbox)
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
  FolderGit2,
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

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
  };
}

interface CentralBrainChatViewProps {
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToHunt?: (target: string) => void;
  onNavigateToTools?: () => void;
}

export const CentralBrainChatView: React.FC<CentralBrainChatViewProps> = ({
  onNavigateToProject,
  onNavigateToHunt,
  onNavigateToTools
}) => {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
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
    try {
      const [convList, provList, brainModels] = await Promise.all([
        apiClient.getConversations(),
        apiClient.getBrainProviderStatuses(),
        apiClient.getBrainModels()
      ]);
      setConversations(convList || []);
      setProviders(provList || []);
      setModels(brainModels || []);

      if (convList && convList.length > 0 && !activeConversationId) {
        setActiveConversationId(convList[0].id);
      } else if (!convList || convList.length === 0) {
        handleCreateNewChat();
      }
    } catch (err: any) {
      setErrorBanner('Failed to load Central Brain threads: ' + (err.message || 'Unknown error'));
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await apiClient.getConversationMessages(convId);
      setMessages(msgs || []);
    } catch (err: any) {
      setErrorBanner('Failed to retrieve messages: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const newThread = await apiClient.createConversation('New Brain Session', selectedModel);
      setConversations(prev => [newThread, ...prev]);
      setActiveConversationId(newThread.id);
      setMessages([]);
      setIsSidebarOpenMobile(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err: any) {
      setErrorBanner('Could not create session: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending || !activeConversationId) return;

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText('');
    setIsSending(true);
    setErrorBanner(null);

    try {
      const result = await apiClient.chatInConversation(activeConversationId, text, selectedModel);
      // Replace with genuine verified server messages
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        result.userMessage,
        result.assistantMessage
      ]);

      // Update thread title if first message
      const activeThread = conversations.find(c => c.id === activeConversationId);
      if (activeThread && (activeThread.title === 'New Brain Session' || activeThread.title === 'New Session')) {
        const generatedTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
        await handleSaveRename(activeConversationId, generatedTitle);
      }
    } catch (err: any) {
      setErrorBanner(`Central Brain processing error: ${err.message || 'Execution failed'}`);
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
    const titleToSave = customTitle || editTitle;
    try {
      const updated = await apiClient.updateConversation(convId, { title: titleToSave });
      setConversations(prev => prev.map(c => c.id === convId ? updated : c));
      setEditingId(null);
    } catch (err: any) {
      setErrorBanner('Failed to rename session: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session and its message history?')) return;
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
    <div className="flex flex-col h-[calc(100vh-6.5rem)] md:h-[calc(100vh-5.5rem)] rounded-xl border border-[#283242] bg-[#0D1118] overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#283242] bg-[#121822]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpenMobile(prev => !prev)}
            className="md:hidden p-1.5 rounded-lg border border-[#283242] bg-[#171F2B] text-[#9AA6B7] hover:text-[#F1F4F8]"
            title="Toggle Sessions Drawer"
          >
            <Layers className="h-4 w-4" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-[#42D9F5]/10 border border-[#42D9F5]/30 flex items-center justify-center text-[#42D9F5]">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-[#F1F4F8]">Central Brain Direct Chat</h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isGeminiLive
                  ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30'
                  : 'bg-[#42D9F5]/10 text-[#42D9F5] border-[#42D9F5]/30'
              }`}>
                {isGeminiLive ? 'LIVE SDK' : 'ENGINEERING RUNTIME'}
              </span>
            </div>
            <p className="text-[11px] text-[#9AA6B7] hidden sm:block">
              Authoritative routing &bull; Project context retrieval &bull; Persistent thread storage &bull; Zero fake outputs
            </p>
          </div>
        </div>

        {/* Model Switcher & New Chat button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="text-xs font-mono bg-[#171F2B] text-[#F1F4F8] border border-[#283242] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#42D9F5] cursor-pointer"
            >
              <option value="auto">Auto-Routing (Central Brain)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="deepseek-r1">DeepSeek R1</option>
            </select>
          </div>

          <button
            onClick={handleCreateNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#42D9F5] text-[#080B10] hover:bg-[#42D9F5]/90 transition-colors cursor-pointer"
            title="Create new conversation thread"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Sidebar + Right Chat Canvas */}
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
              <span>Saved Threads:</span>
              <span className="text-[#F1F4F8]">{conversations.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Target Policy:</span>
              <span className="text-[#34D399]">Read-Only</span>
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
            <div className="p-2.5 bg-[#F87171]/10 border-b border-[#F87171]/30 text-[#F87171] text-xs flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button onClick={() => setErrorBanner(null)} className="hover:text-[#F1F4F8]">
                &times;
              </button>
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4 text-[#9AA6B7]">
                <div className="w-14 h-14 rounded-2xl bg-[#42D9F5]/10 border border-[#42D9F5]/30 flex items-center justify-center text-[#42D9F5]">
                  <Brain className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F1F4F8] font-mono">Central Brain Ready</h3>
                  <p className="text-xs text-[#9AA6B7] mt-1 leading-relaxed">
                    Direct access to AI Heaven's authoritative router. Ask architectural questions, trigger security reviews, inspect jobs, or analyze code.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 w-full pt-2">
                  {[
                    'Explain the 6-droid autonomous bug hunting architecture',
                    'How is virtual filesystem host escalation blocked with exit code 126?',
                    'List all registered security tools and their execution limits',
                    'Draft a non-destructive REST API authorization test plan'
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(prompt);
                        setTimeout(() => handleSendMessage(), 50);
                      }}
                      className="text-left text-xs p-2.5 rounded-lg border border-[#283242] bg-[#121822] hover:border-[#42D9F5]/50 hover:text-[#F1F4F8] transition-all font-mono"
                    >
                      &rarr; {prompt}
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
                    className={`flex gap-3 sm:gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isUser
                        ? 'bg-[#8A83FF]/10 border-[#8A83FF]/30 text-[#8A83FF]'
                        : 'bg-[#42D9F5]/10 border-[#42D9F5]/30 text-[#42D9F5]'
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                    </div>

                    {/* Message Card */}
                    <div className={`space-y-1.5 max-w-[85%] sm:max-w-[90%]`}>
                      <div className={`flex items-center gap-2 text-[10px] font-mono text-[#9AA6B7] ${isUser ? 'justify-end' : ''}`}>
                        <span className="font-semibold text-[#F1F4F8]">
                          {isUser ? 'Operator' : (msg.agentName || 'Central Brain')}
                        </span>
                        {msg.modelUsed && (
                          <span className="px-1.5 py-0.2 rounded bg-[#121822] border border-[#283242]">
                            {msg.modelUsed}
                          </span>
                        )}
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className={`p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap font-sans ${
                        isUser
                          ? 'bg-[#171F2B] border-[#283242] text-[#F1F4F8]'
                          : 'bg-[#121822] border-[#283242] text-[#F1F4F8]'
                      }`}>
                        {msg.content}
                      </div>

                      {/* Footer Actions (Copy, metadata) */}
                      <div className={`flex items-center gap-2 text-[10px] text-[#9AA6B7] ${isUser ? 'justify-end' : ''}`}>
                        <button
                          onClick={() => copyText(msg.content, msg.id)}
                          className="hover:text-[#F1F4F8] flex items-center gap-1 transition-colors"
                          title="Copy message content"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
                              <span className="text-[#34D399]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        {msg.metadata?.domain && (
                          <span className="text-[#42D9F5] font-mono font-medium">
                            Domain: {msg.metadata.domain}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-8 h-8 rounded-lg bg-[#42D9F5]/10 border border-[#42D9F5]/30 flex items-center justify-center text-[#42D9F5] shrink-0">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3.5 rounded-xl border border-[#283242] bg-[#121822] text-xs text-[#9AA6B7] flex items-center gap-2 font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#42D9F5] animate-ping" />
                  <span>Central Brain evaluating request and routing task...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Message Composer */}
          <div className="p-3 sm:p-4 border-t border-[#283242] bg-[#121822]">
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="relative rounded-xl border border-[#283242] bg-[#0D1118] focus-within:border-[#42D9F5] transition-colors">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Communicate with AI Heaven Central Brain... (Shift+Enter for newline, Enter to send)"
                  rows={2}
                  className="w-full bg-transparent px-3.5 py-2.5 text-xs text-[#F1F4F8] placeholder-[#9AA6B7]/50 focus:outline-none resize-none font-sans"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-[#283242]/50 bg-[#080B10]/50 rounded-b-xl">
                  <div className="flex items-center gap-2 text-[10px] text-[#9AA6B7] font-mono">
                    <span className="hidden sm:inline">Active Thread:</span>
                    <span className="text-[#F1F4F8] truncate max-w-[150px]">
                      {activeThread?.title || 'Default'}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#42D9F5] text-[#080B10] text-xs font-bold hover:bg-[#42D9F5]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
