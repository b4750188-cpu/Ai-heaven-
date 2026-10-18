import React, { useEffect, useState } from 'react';
import {
  Brain,
  MessageSquare,
  Bot,
  Workflow,
  Settings,
  Search,
  Menu,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  ClipboardCheck,
  Terminal,
  BookOpen,
  User,
  LogOut,
  AlertOctagon,
  Bell,
  PanelLeftClose,
  PanelLeft,
  PanelRight,
  PanelRightClose,
  Download,
  Smartphone,
  Flame,
  FolderGit2,
  ExternalLink,
  Lock,
  Layers,
  Crosshair,
  Cpu,
  History,
  CheckCircle2,
  Github
} from 'lucide-react';
import { SkullLogo } from '../common/SkullLogo';
import { apiClient } from '../../services/apiClient';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../common/PWAInstallModal';

export type ShellView =
  | 'home'
  | 'chat'
  | 'bughunt'
  | 'brain'
  | 'continuity'
  | 'memory'
  | 'evolution'
  | 'google'
  | 'explore'
  | 'terminal'
  | 'agents'
  | 'graph'
  | 'tools'
  | 'github-actions'
  | 'providers'
  | 'projects'
  | 'tasks'
  | 'operations'
  | 'activity'
  | 'review'
  | 'connectors'
  | 'settings'
  | 'engines'
  | 'docs'
  | 'detail'
  | 'google-ai-studio';

interface AppShellProps {
  currentView: ShellView;
  onNavigate: (view: ShellView, slug?: string) => void;
  onOpenSearch: () => void;
  isBackendConnected: boolean;
  pendingApprovalsCount?: number;
  isKillSwitchActive?: boolean;
  onOpenAuth?: () => void;
  currentUser?: any;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  isBackendConnected,
  pendingApprovalsCount = 0,
  isKillSwitchActive = false,
  onOpenAuth,
  currentUser,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isContextualPanelOpen, setIsContextualPanelOpen] = useState(false);
  const pwa = usePWAInstall();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [showToolsSubmenu, setShowToolsSubmenu] = useState(false);

  useEffect(() => {
    loadRecentConversations();
  }, [currentView]);

  const loadRecentConversations = async () => {
    try {
      const convs = await apiClient.getConversations();
      if (Array.isArray(convs)) {
        setRecentConversations(convs.slice(0, 10));
      }
    } catch {
      // background silent fallback
    }
  };

  const handleNavClick = (view: ShellView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const handleStartNewChat = () => {
    onNavigate('chat');
    setIsMobileMenuOpen(false);
  };

  // Primary Navigation Hierarchy: Chat, History, Brain, Droids, Bug Hunt, Connections, Settings
  const coreNavItems = [
    { id: 'chat' as ShellView, label: 'Chat', icon: MessageSquare, description: 'Direct AI Conversation & Audit' },
    { id: 'memory' as ShellView, label: 'History', icon: History, description: 'Conversation Threads & Memory' },
    { id: 'brain' as ShellView, label: 'Brain', icon: Brain, description: 'Central Brain & Dynamic Model Router' },
    {
      id: 'agents' as ShellView,
      label: 'Droids',
      icon: Bot,
      description: 'Autonomous Agent Fleet & Security Droids',
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined
    },
    { id: 'bughunt' as ShellView, label: 'Bug Hunt', icon: Crosshair, description: 'Target Scope & Bounty Audit' },
    { id: 'connectors' as ShellView, label: 'Connections', icon: Workflow, description: 'Google, GitHub, HackerOne & API Keys' },
    { id: 'settings' as ShellView, label: 'Settings', icon: Settings, description: 'Security, Reality Registry & Credentials' }
  ];

  // Secondary Tools Sub-navigation
  const toolsNavItems = [
    { id: 'engines' as ShellView, label: 'Four Beasts & Reality', icon: Cpu },
    { id: 'github-actions' as ShellView, label: 'GitHub Actions CI/CD', icon: Github },
    { id: 'home' as ShellView, label: 'Command Center', icon: Layers },
    { id: 'bughunt' as ShellView, label: 'Bug Bounty Workspace', icon: Crosshair },
    { id: 'review' as ShellView, label: 'Review Center', icon: ClipboardCheck },
    { id: 'terminal' as ShellView, label: 'Sandboxed Terminal', icon: Terminal },
    { id: 'activity' as ShellView, label: 'Audit Logs', icon: Activity },
    { id: 'docs' as ShellView, label: 'Documentation', icon: BookOpen }
  ];

  const isCurrentChat = currentView === 'chat' || currentView === 'bughunt';

  return (
    <div className="min-h-screen bg-[#090A0D] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#F3F4F6]/20 selection:text-white">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER (Clean, Restrained, Black & White)                     */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 h-13 border-b border-[#222632] bg-[#0E1015]/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-5">
        {/* Left: Brand Identity & Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation drawer"
            className="md:hidden p-2 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#161822] focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center gap-2.5 text-left focus:outline-none rounded py-1"
          >
            <div className="h-7 w-7 rounded-lg border border-[#2E3342] bg-[#161822] flex items-center justify-center group-hover:border-[#F3F4F6]/60 transition-colors">
              <SkullLogo className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-[#F3F4F6] text-sm font-mono group-hover:text-white transition-colors">
                AI HEAVEN
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-[#9CA3AF]/70 tracking-widest uppercase">
                PROD
              </span>
            </div>
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="hidden md:flex p-1.5 rounded-md text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#161822] transition-colors ml-1"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Center: Quick Search Trigger */}
        <div className="flex-1 max-w-sm mx-4 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between rounded-lg border border-[#222632] bg-[#14161F] px-3 py-1.5 text-xs text-[#9CA3AF] hover:border-[#373D4E] hover:text-[#F3F4F6] transition-all"
            title="Search AI Heaven models, droids, tools..."
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <span>Search platform...</span>
            </div>
            <kbd className="rounded border border-[#2E3342] bg-[#0E1015] px-1.5 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Engine Status, Approvals, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 rounded text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#161822]"
            title="Search"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Kill Switch Alert Indicator if triggered */}
          {isKillSwitchActive && (
            <button
              onClick={() => onNavigate('agents')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] text-xs font-mono font-bold animate-pulse"
              title="Emergency halt active"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">KILL SWITCH</span>
            </button>
          )}

          {/* Pending Approvals */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => onNavigate('tasks')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#EAB308]/40 bg-[#EAB308]/10 text-[#EAB308] text-xs font-mono transition-colors"
              title={`${pendingApprovalsCount} pending approvals`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{pendingApprovalsCount}</span>
            </button>
          )}

          {/* Status Indicator */}
          <div
            onClick={() => onNavigate('activity')}
            className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#222632] bg-[#14161F] text-[11px] font-mono text-[#9CA3AF] hover:border-[#373D4E] hover:text-[#F3F4F6] transition-colors"
            title="System Status"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isBackendConnected ? 'bg-[#10B981]' : 'bg-[#9CA3AF]'
              }`}
            />
            <span>{isBackendConnected ? 'Online' : 'Local'}</span>
          </div>

          {/* Optional Contextual Panel Toggle for Wide Displays */}
          <button
            onClick={() => setIsContextualPanelOpen(prev => !prev)}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
              isContextualPanelOpen
                ? 'border-[#42D9F5]/40 bg-[#42D9F5]/10 text-[#42D9F5]'
                : 'border-[#222632] bg-[#14161F] text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
            title={isContextualPanelOpen ? "Hide Contextual Panel" : "Show Contextual Panel"}
          >
            {isContextualPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
            <span>Context</span>
          </button>

          {/* User Account / Auth Menu */}
          <div className="relative">
            <button
              onClick={() => {
                if (onOpenAuth && !currentUser) {
                  onOpenAuth();
                } else {
                  setIsUserMenuOpen(prev => !prev);
                }
              }}
              className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-lg border border-[#222632] bg-[#14161F] text-xs font-mono text-[#F3F4F6] hover:border-[#373D4E] transition-colors"
              title={currentUser ? currentUser.email : "Sign In"}
            >
              <div className="h-5 w-5 rounded-md bg-[#222632] flex items-center justify-center text-[10px] font-semibold text-white">
                {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
              </div>
              <span className="hidden sm:inline text-xs truncate max-w-[100px]">
                {currentUser ? (currentUser.fullName || currentUser.email.split('@')[0]) : 'Sign In'}
              </span>
            </button>

            {isUserMenuOpen && currentUser && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[#282D3C] bg-[#12141C] p-2 shadow-2xl z-50 text-xs font-mono space-y-1">
                  <div className="px-2.5 py-2 border-b border-[#222632]">
                    <div className="font-semibold text-[#F3F4F6] truncate">{currentUser.fullName || 'Researcher'}</div>
                    <div className="text-[11px] text-[#9CA3AF] truncate mt-0.5">{currentUser.email}</div>
                    <div className="mt-1 text-[10px] text-[#10B981] uppercase tracking-wide">
                      Tenant: {currentUser.tenantId || 'Core'}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1D27] text-left transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Settings & Keys</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('connectors');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1D27] text-left transition-colors"
                  >
                    <Workflow className="h-3.5 w-3.5" />
                    <span>Connections</span>
                  </button>

                  {onOpenAuth && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1D27] text-left transition-colors"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Switch Account</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. BODY LAYOUT: COLLAPSIBLE SIDEBAR + MAIN CONTENT                    */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Left Sidebar */}
        <aside
          className={`hidden md:flex flex-col shrink-0 border-r border-[#222632] bg-[#0E1015] transition-all duration-200 select-none overflow-y-auto ${
            isSidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3 space-y-4'
          }`}
        >
          {/* Quick Action: New Session */}
          <div className="pt-1">
            <button
              onClick={handleStartNewChat}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#F4F4F6] text-[#090A0D] font-mono text-xs font-semibold hover:bg-white transition-all shadow-xs cursor-pointer ${
                isSidebarCollapsed ? 'px-0' : ''
              }`}
              title="Start a new chat session"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              {!isSidebarCollapsed && <span>New Session</span>}
            </button>
          </div>

          {/* 4 Core Sections: Brain, Chat, Droids, Connections (+ Settings) */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9CA3AF]/60">
                Workspace
              </div>
            )}
            {coreNavItems.map(item => {
              const Icon = item.icon;
              const isActive =
                item.id === 'chat'
                  ? isCurrentChat
                  : item.id === 'agents'
                  ? currentView === 'agents' || currentView === 'tasks'
                  : currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                  } rounded-lg text-xs transition-colors text-left border ${
                    isActive
                      ? 'bg-[#181B24] border-[#373D4E] text-white font-medium shadow-xs'
                      : 'border-transparent text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#14161F]'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#9CA3AF]'}`} />
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isSidebarCollapsed && item.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#EAB308] text-[#090A0D]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Collapsible Extended Tools Drawer */}
          {!isSidebarCollapsed && (
            <div className="space-y-1 pt-1">
              <button
                onClick={() => setShowToolsSubmenu(prev => !prev)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9CA3AF]/60 hover:text-[#9CA3AF] transition-colors"
              >
                <span>Platform Tools</span>
                <ChevronRight className={`h-3 w-3 transition-transform ${showToolsSubmenu ? 'rotate-90' : ''}`} />
              </button>
              {showToolsSubmenu && (
                <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
                  {toolsNavItems.map(tool => {
                    const ToolIcon = tool.icon;
                    const isToolActive = currentView === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleNavClick(tool.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                          isToolActive
                            ? 'bg-[#181B24] text-white font-medium'
                            : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#14161F]'
                        }`}
                      >
                        <ToolIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        <span className="truncate">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recent Conversations List (Claude / ChatGPT style) */}
          {!isSidebarCollapsed && (
            <div className="flex-1 overflow-y-auto space-y-1 pt-2 border-t border-[#222632]/80">
              <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9CA3AF]/60 flex items-center justify-between">
                <span>Recent History</span>
                <span className="text-[10px] font-mono">{recentConversations.length}</span>
              </div>
              {recentConversations.length === 0 ? (
                <div className="px-2 py-4 text-center text-[11px] text-[#9CA3AF]/60 font-mono">
                  No previous sessions
                </div>
              ) : (
                recentConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleNavClick('chat')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#14161F] text-left transition-colors group truncate"
                    title={conv.title}
                  >
                    <MessageSquare className="h-3 w-3 text-[#9CA3AF]/60 shrink-0 group-hover:text-white" />
                    <span className="truncate text-[11px] font-mono">{conv.title}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* PWA App Install Action */}
          <div className="pt-2 border-t border-[#222632]">
            <button
              onClick={async () => {
                if (pwa.isInstalled) {
                  setIsPwaModalOpen(true);
                  return;
                }
                const outcome = await pwa.promptInstall();
                if (outcome === 'unavailable') {
                  setIsPwaModalOpen(true);
                }
              }}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
              } rounded-xl border border-[#2B2D3A] bg-[#14151D] hover:bg-[#1C1E28] hover:border-[#3C3F50] text-xs transition-all cursor-pointer group`}
              title="Install AI Heaven application (PWA)"
            >
              <div className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white" />
                {!isSidebarCollapsed && (
                  <span className="text-neutral-300 group-hover:text-white font-medium">
                    {pwa.isInstalled ? 'App Installed' : 'Install AI Heaven'}
                  </span>
                )}
              </div>
              {!isSidebarCollapsed && (
                pwa.isInstalled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-400 uppercase">
                    PWA
                  </span>
                )
              )}
            </button>
          </div>

          {/* Sidebar Footer: Integrations & Identity */}
          <div className="mt-auto pt-2 border-t border-[#222632] text-[11px] font-mono text-[#9CA3AF] space-y-1">
            {!isSidebarCollapsed ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[#9CA3AF]/70">Tenant:</span>
                  <span className="text-[#F3F4F6] truncate max-w-[120px]">
                    {currentUser?.tenantId || 'Core'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9CA3AF]/70">Engine:</span>
                  <span className="text-[#10B981] font-semibold">Central Brain</span>
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" title="Central Brain Online" />
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Slide-out Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 bg-[#0E1015] border-r border-[#222632] p-4 flex flex-col h-full animate-in slide-in-from-left duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#222632] mb-3">
                <div className="flex items-center gap-2">
                  <SkullLogo className="h-5 w-5" />
                  <span className="font-semibold text-sm font-mono text-white">AI HEAVEN</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-[#9CA3AF] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* New Session Button */}
              <button
                onClick={handleStartNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#F4F4F6] text-[#090A0D] font-mono text-xs font-semibold hover:bg-white mb-4"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Session</span>
              </button>

              {/* Core Nav */}
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-mono uppercase text-[#9CA3AF]/60 mb-1">Navigation</div>
                {coreNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                        isActive
                          ? 'bg-[#181B24] text-white font-medium border border-[#373D4E]'
                          : 'text-[#9CA3AF] hover:text-white hover:bg-[#14161F]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#EAB308] text-[#090A0D]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Extended Tools */}
              <div className="space-y-1 mt-4 pt-4 border-t border-[#222632]">
                <div className="px-2 text-[10px] font-mono uppercase text-[#9CA3AF]/60 mb-1">Tools</div>
                {toolsNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                        isActive ? 'text-white bg-[#181B24]' : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="mt-auto pt-4 border-t border-[#222632] text-xs font-mono text-[#9CA3AF] space-y-2.5">
                {/* Mobile PWA Install Button */}
                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    if (pwa.isInstalled) {
                      setIsPwaModalOpen(true);
                      return;
                    }
                    const outcome = await pwa.promptInstall();
                    if (outcome === 'unavailable') {
                      setIsPwaModalOpen(true);
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#2B2D3A] bg-[#14151D] text-xs font-mono text-white cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-neutral-300" />
                    <span>{pwa.isInstalled ? 'App Installed' : 'Install AI Heaven'}</span>
                  </div>
                  {pwa.isInstalled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] text-neutral-400">PWA</span>
                  )}
                </button>

                <div className="text-[11px] truncate">
                  User: <span className="text-white">{currentUser?.email || 'Anonymous'}</span>
                </div>
                {onOpenAuth && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-1.5 rounded-md border border-[#222632] bg-[#14161F] text-center text-xs hover:text-white"
                  >
                    {currentUser ? 'Switch Account' : 'Sign In'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Purposeful Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#090A0D] pb-18 md:pb-6">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
            {children}
          </div>
        </main>
      </div>

      {/* ===================================================================== */}
      {/* 3. MOBILE FIXED SAFE-AREA BOTTOM NAVIGATION BAR                      */}
      {/* ===================================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-15 bg-[#0E1015]/95 border-t border-[#222632] flex items-center justify-around px-2 backdrop-blur-md pb-safe"
      >
        <button
          onClick={() => handleNavClick('brain')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] transition-colors ${
            currentView === 'brain' ? 'text-white' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
          }`}
          aria-label="Brain"
        >
          <Brain className="h-4 w-4" />
          <span className="text-[10px] mt-1 font-mono font-medium">Brain</span>
        </button>

        <button
          onClick={() => handleNavClick('chat')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] transition-colors ${
            isCurrentChat ? 'text-white font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
          }`}
          aria-label="Chat"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-[10px] mt-1 font-mono font-medium">Chat</span>
        </button>

        <button
          onClick={() => handleNavClick('agents')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] relative transition-colors ${
            currentView === 'agents' || currentView === 'tasks' ? 'text-white' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
          }`}
          aria-label="Droids"
        >
          <Bot className="h-4 w-4" />
          <span className="text-[10px] mt-1 font-mono font-medium">Droids</span>
          {pendingApprovalsCount > 0 && (
            <span className="absolute top-0 right-3 h-2 w-2 rounded-full bg-[#EAB308]" />
          )}
        </button>

        <button
          onClick={() => handleNavClick('connectors')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] transition-colors ${
            currentView === 'connectors' || currentView === 'providers' ? 'text-white' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
          }`}
          aria-label="Connections"
        >
          <Workflow className="h-4 w-4" />
          <span className="text-[10px] mt-1 font-mono font-medium">Connect</span>
        </button>

        <button
          onClick={() => handleNavClick('settings')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] transition-colors ${
            currentView === 'settings' ? 'text-white' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
          }`}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
          <span className="text-[10px] mt-1 font-mono font-medium">Settings</span>
        </button>
      </nav>

      <PWAInstallModal
        pwa={pwa}
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />
    </div>
  );
};
