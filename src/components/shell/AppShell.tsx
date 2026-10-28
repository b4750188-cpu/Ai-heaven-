import React, { useEffect, useState } from 'react';
import {
  Brain,
  MessageSquare,
  Bot,
  Crosshair,
  History,
  FolderGit2,
  Compass,
  Terminal,
  Workflow,
  Activity,
  Settings,
  Search,
  Menu,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  AlertOctagon,
  Bell,
  PanelLeftClose,
  PanelLeft,
  PanelRight,
  PanelRightClose,
  Download,
  Smartphone,
  Cpu,
  Layers,
  Database,
  BookOpen,
  User,
  LogOut,
  CheckCircle2,
  ExternalLink,
  Zap,
  Globe,
  Radio,
  Clock,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { SkullLogo } from '../common/SkullLogo';
import { apiClient } from '../../services/apiClient';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../common/PWAInstallModal';
import { StatusDot } from '../ui/StatusDot';

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
  | 'google-ai-studio'
  | 'comfyui'
  | 'security'
  | 'source';

interface AppShellProps {
  currentView: ShellView;
  onNavigate: (view: ShellView, slug?: string) => void;
  onOpenSearch: () => void;
  isBackendConnected: boolean;
  pendingApprovalsCount?: number;
  isKillSwitchActive?: boolean;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  currentUser?: any;
  children: React.ReactNode;
}

interface NavGroupItem {
  id: ShellView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavGroupItem[];
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  isBackendConnected,
  pendingApprovalsCount = 0,
  isKillSwitchActive = false,
  onOpenAuth,
  onSignOut,
  currentUser,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isContextualPanelOpen, setIsContextualPanelOpen] = useState(false);
  const [edge0Online, setEdge0Online] = useState<boolean>(false);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const pwa = usePWAInstall();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  useEffect(() => {
    loadRecentConversations();
    checkEdge0Status();
  }, [currentView]);

  const loadRecentConversations = async () => {
    try {
      const convs = await apiClient.getConversations();
      if (Array.isArray(convs)) {
        setRecentConversations(convs.slice(0, 8));
      }
    } catch {
      // Non-blocking background catch
    }
  };

  const checkEdge0Status = async () => {
    try {
      const st = await apiClient.getEdge0Status();
      setEdge0Online(Boolean(st?.isConnected));
    } catch {
      setEdge0Online(false);
    }
  };

  const handleNavClick = (view: ShellView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await apiClient.logoutAuth();
    } catch {
      // Best effort
    }
    apiClient.setAuthToken(null);
    setIsUserMenuOpen(false);
    if (onSignOut) {
      onSignOut();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Determine runtime environment accurately (Defect 9 fix)
  const isLocalHost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const envLabel = isBackendConnected
    ? (isLocalHost ? 'DEV / LOCAL' : 'PRODUCTION CLOUD')
    : 'OFFLINE SANDBOX';

  // Sidebar Group Structure matching requirements:
  // Brain, Chat, Droids, Bug Hunt, Memory, Projects, Knowledge & Explore, Tools & Terminal, Connections, Activity & Operations, Settings
  const navGroups: NavGroup[] = [
    {
      id: 'core',
      label: 'Core Workspaces',
      items: [
        { id: 'brain', label: 'Brain', icon: Brain, description: 'Central Brain & Model Router' },
        { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Unified AI Conversation' },
        {
          id: 'agents',
          label: 'Droids',
          icon: Bot,
          description: 'Autonomous Agent Fleet',
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
        },
        { id: 'bughunt', label: 'Bug Hunt', icon: Crosshair, description: 'Vulnerability Bounty Hunter' }
      ]
    },
    {
      id: 'workspace',
      label: 'Memory & Projects',
      items: [
        { id: 'source', label: 'SOURCE Pool', icon: BookOpen, description: 'Shared Knowledge & Droid Family' },
        { id: 'memory', label: 'Memory & Threads', icon: History, description: 'Persistent Conversation Graph' },
        { id: 'continuity', label: 'Continuity Center', icon: Zap, description: 'State Resumption & Recovery' },
        { id: 'projects', label: 'Projects', icon: FolderGit2, description: 'Multi-Tenant Workspaces' }
      ]
    },
    {
      id: 'knowledge',
      label: 'Knowledge & Explore',
      items: [
        { id: 'explore', label: 'Resource Explorer', icon: Compass, description: 'AI Models, SDKs & Platforms' },
        { id: 'graph', label: 'Knowledge Graph', icon: Layers, description: 'Semantic Relationship Map' },
        { id: 'docs', label: 'Documentation', icon: BookOpen, description: 'Authoritative Architecture Specs' }
      ]
    },
    {
      id: 'tools',
      label: 'Tools & Terminal',
      items: [
        { id: 'terminal', label: 'Terminal', icon: Terminal, description: 'VFS Sandbox Command Center' },
        { id: 'comfyui', label: 'ComfyUI Studio', icon: Workflow, description: 'Visual Node AI Workflow Engine' },
        { id: 'tools', label: 'Tool Registry', icon: Shield, description: 'Capability & Permission Gates' },
        { id: 'github-actions', label: 'GitHub Actions', icon: Workflow, description: 'CI/CD Workflow Dispatch' }
      ]
    },
    {
      id: 'connections',
      label: 'Connections',
      items: [
        { id: 'connectors', label: 'Integrations', icon: Radio, description: 'External Service Connectors' },
        { id: 'providers', label: 'Providers', icon: Globe, description: 'Cloud & On-Device Providers' },
        { id: 'google', label: 'Google Services', icon: Sparkles, description: 'Drive, Gemini & Workspace' }
      ]
    },
    {
      id: 'operations',
      label: 'Activity & Operations',
      items: [
        { id: 'activity', label: 'Audit Trail', icon: Activity, description: 'Cryptographic Event Logs' },
        { id: 'operations', label: 'Operator Dashboard', icon: ShieldCheck, description: 'Real-Time Telemetry' },
        { id: 'security', label: 'Security Center', icon: ShieldAlert, description: 'Draugr · DefectDojo · Scorecard' },
        { id: 'review', label: 'Review Center', icon: Clock, description: 'QA Regression Engine' },
        { id: 'evolution', label: 'Evolution Engine', icon: Sparkles, description: 'Autonomous Self-Improvement' },
        { id: 'engines', label: 'Four Beasts', icon: Cpu, description: 'Multi-Agent Subsystems' }
      ]
    },
    {
      id: 'settings_group',
      label: 'System',
      items: [
        { id: 'settings', label: 'Settings & Reality', icon: Settings, description: 'Reality Registry & Edge0 Local' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#080B10] text-[#F1F4F8] flex flex-col font-sans selection:bg-[#42D9F5]/20 selection:text-[#42D9F5]">
      {/* ===================================================================== */}
      {/* 1. TOP APP BAR                                                        */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 h-14 border-b border-[#283242] bg-[#0D1118]/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-6">
        {/* Left: Brand Identity & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation drawer"
            className="md:hidden p-2 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#42D9F5] cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center gap-2.5 text-left focus-visible:outline-none rounded py-1 cursor-pointer"
            aria-label="AI Heaven Home"
          >
            <div className="h-8 w-8 rounded-lg border border-[#283242] bg-[#121822] flex items-center justify-center group-hover:border-[#42D9F5]/60 transition-colors shrink-0">
              <SkullLogo className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-[#F1F4F8] text-sm font-mono group-hover:text-white transition-colors">
                AI HEAVEN
              </span>
              <span className="text-[10px] font-mono text-[#9AA6B7] tracking-wider uppercase">
                {envLabel}
              </span>
            </div>
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-1.5 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] transition-colors ml-2 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#42D9F5]"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between rounded-lg border border-[#283242] bg-[#121822] px-3.5 py-1.5 text-xs text-[#9AA6B7] hover:border-[#42D9F5]/40 hover:text-[#F1F4F8] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#42D9F5]"
            title="Search models, droids, tools, resources (⌘K)"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-[#9AA6B7]" />
              <span>Search platform...</span>
            </div>
            <kbd className="rounded border border-[#283242] bg-[#080B10] px-1.5 py-0.5 font-mono text-[10px] text-[#9AA6B7]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Runtime Status, Kill Switch, Context Panel Toggle, Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search icon */}
          <button
            onClick={onOpenSearch}
            aria-label="Open search"
            className="sm:hidden p-2 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Kill Switch Alert Indicator if triggered */}
          {isKillSwitchActive && (
            <button
              onClick={() => onNavigate('agents')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F87171]/20 border border-[#F87171] text-[#F87171] text-xs font-mono font-bold animate-pulse cursor-pointer"
              title="Global kill switch active: all execution halted"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">HALT ACTIVE</span>
            </button>
          )}

          {/* Pending Approvals */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => onNavigate('tasks')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24] text-xs font-mono transition-colors cursor-pointer"
              title={`${pendingApprovalsCount} pending security approval(s)`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{pendingApprovalsCount}</span>
            </button>
          )}

          {/* Truthful Backend Status Indicator (Defect 5 fix) */}
          <div
            onClick={() => onNavigate('activity')}
            className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#283242] bg-[#121822] text-[11px] font-mono text-[#9AA6B7] hover:text-[#F1F4F8] transition-colors"
            title="Backend API and local inference status"
          >
            <StatusDot status={isBackendConnected ? 'online' : 'offline'} />
            <span>{isBackendConnected ? 'API Online' : 'API Offline'}</span>
            {edge0Online && (
              <span className="text-[10px] text-emerald-400 pl-1 border-l border-[#283242]">
                ⚡ Edge0
              </span>
            )}
          </div>

          {/* Working Contextual Inspector Toggle (Defect 4 fix) */}
          <button
            onClick={() => setIsContextualPanelOpen(prev => !prev)}
            aria-label={isContextualPanelOpen ? 'Close context panel' : 'Open context panel'}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
              isContextualPanelOpen
                ? 'border-[#42D9F5]/40 bg-[#42D9F5]/10 text-[#42D9F5]'
                : 'border-[#283242] bg-[#121822] text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
            title="Toggle Contextual Inspector Panel"
          >
            {isContextualPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
            <span>Context</span>
          </button>

          {/* User Account / Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              aria-label="User account menu"
              className="flex items-center gap-2 p-1.5 rounded-lg border border-[#283242] bg-[#121822] hover:border-[#42D9F5]/40 text-[#F1F4F8] transition-colors cursor-pointer"
            >
              <div className="h-6 w-6 rounded-full bg-[#171F2B] text-[#42D9F5] flex items-center justify-center font-mono text-xs font-bold border border-[#283242]">
                {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
              </div>
              <span className="hidden sm:inline text-xs font-mono max-w-[100px] truncate text-[#9AA6B7]">
                {currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Guest'}
              </span>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl border border-[#283242] bg-[#0D1118] p-3 shadow-2xl z-50 animate-in fade-in-50 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <div className="border-b border-[#283242] pb-2.5 mb-2">
                  <div className="text-xs font-semibold text-[#F1F4F8] truncate">
                    {currentUser?.fullName || 'Guest Operator'}
                  </div>
                  <div className="text-[11px] font-mono text-[#9AA6B7] truncate">
                    {currentUser?.email || 'Unauthenticated Session'}
                  </div>
                  <div className="mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#171F2B] border border-[#283242] text-[#42D9F5]">
                      Role: {currentUser?.role || 'Guest'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] text-left transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsPwaModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5" />
                      <span>Install App (PWA)</span>
                    </span>
                    {pwa.isInstalled && <span className="text-[10px] text-emerald-400 font-mono">Installed</span>}
                  </button>

                  <div className="border-t border-[#283242] pt-1 mt-1">
                    {currentUser ? (
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[#F87171] hover:bg-[#F87171]/10 text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenAuth) onOpenAuth();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[#42D9F5] hover:bg-[#42D9F5]/10 text-left font-semibold transition-colors cursor-pointer"
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>Sign In</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. BODY LAYOUT: SIDEBAR + MAIN CONTENT CANVAS + CONTEXTUAL PANEL     */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Collapsible) */}
        <aside
          className={`hidden md:flex flex-col border-r border-[#283242] bg-[#0D1118] transition-all duration-200 shrink-0 ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Quick New Chat Button */}
          <div className="p-3 border-b border-[#283242]/70">
            <button
              onClick={() => onNavigate('chat')}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#42D9F5] hover:bg-[#38c4de] text-[#080B10] font-semibold text-xs transition-colors cursor-pointer shadow-xs ${
                isSidebarCollapsed ? 'px-0' : ''
              }`}
              title="New Conversation Session"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span>New Session</span>}
            </button>
          </div>

          {/* Grouped Navigation List */}
          <nav
            aria-label="Workspace Navigation"
            className="flex-1 overflow-y-auto px-2 py-3 space-y-4"
          >
            {navGroups.map(group => (
              <div key={group.id} className="space-y-1">
                {!isSidebarCollapsed && (
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9AA6B7]/60">
                    {group.label}
                  </div>
                )}
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 font-semibold shadow-xs'
                          : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                      title={isSidebarCollapsed ? item.label : item.description}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isSidebarCollapsed && (
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FBBF24] text-[#080B10] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Desktop Sidebar Footer */}
          <div className="p-3 border-t border-[#283242] text-[11px] font-mono text-[#9AA6B7] space-y-2">
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#9AA6B7]/60">INFERENCE ENGINE</span>
                <span className="text-emerald-400 font-semibold">{edge0Online ? 'Edge0 MoE' : 'Gemini Cloud'}</span>
              </div>
            )}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className={`w-full flex items-center gap-2 p-1.5 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] transition-colors cursor-pointer ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Install AI Heaven as Progressive Web App"
            >
              <Smartphone className="h-4 w-4 shrink-0 text-[#42D9F5]" />
              {!isSidebarCollapsed && <span>{pwa.isInstalled ? 'PWA Ready' : 'Install PWA'}</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Slide-Out Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in-50 duration-150">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#080B10]/80 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Container */}
            <div className="relative z-10 w-4/5 max-w-sm bg-[#0D1118] border-r border-[#283242] flex flex-col h-full p-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#283242] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg border border-[#283242] bg-[#121822] flex items-center justify-center">
                    <SkullLogo className="h-4 w-4" />
                  </div>
                  <span className="font-mono font-bold text-sm text-[#F1F4F8]">AI HEAVEN</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Drawer Groups */}
              <div className="space-y-4 flex-1">
                {navGroups.map(group => (
                  <div key={group.id} className="space-y-1">
                    <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-[#9AA6B7]/60">
                      {group.label}
                    </div>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40 font-semibold'
                              : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FBBF24] text-[#080B10] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Mobile Drawer Footer */}
              <div className="pt-4 border-t border-[#283242] text-xs font-mono space-y-2 mt-4">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsPwaModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#283242] bg-[#121822] text-[#F1F4F8] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-[#42D9F5]" />
                    <span>{pwa.isInstalled ? 'Application Installed' : 'Install AI Heaven PWA'}</span>
                  </div>
                  {pwa.isInstalled && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* Main Purposeful Content Canvas                                       */}
        {/* ===================================================================== */}
        <main className="flex-1 overflow-y-auto bg-[#080B10] pb-20 md:pb-6 focus:outline-none">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
            {children}
          </div>
        </main>

        {/* ===================================================================== */}
        {/* Working Contextual Inspector Panel (Defect 4 Implementation)          */}
        {/* ===================================================================== */}
        {isContextualPanelOpen && (
          <aside
            aria-label="Contextual Inspector"
            className="hidden xl:flex flex-col w-80 border-l border-[#283242] bg-[#0D1118] shrink-0 animate-in slide-in-from-right duration-200"
          >
            {/* Context Panel Header */}
            <div className="h-14 border-b border-[#283242] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PanelRight className="h-4 w-4 text-[#42D9F5]" />
                <span className="font-mono text-xs font-bold text-[#F1F4F8] uppercase tracking-wider">
                  Live Context Inspector
                </span>
              </div>
              <button
                onClick={() => setIsContextualPanelOpen(false)}
                aria-label="Close contextual inspector"
                className="p-1 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Context Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-mono">
              {/* Active Workspace Card */}
              <div className="p-3.5 rounded-lg border border-[#283242] bg-[#121822] space-y-1.5">
                <div className="text-[10px] text-[#9AA6B7] uppercase tracking-wider">Active Workspace</div>
                <div className="text-sm font-bold text-[#42D9F5] capitalize">
                  {currentView}
                </div>
                <div className="text-[11px] text-[#9AA6B7]">
                  Route path: <code className="text-[#F1F4F8]">/{currentView}</code>
                </div>
              </div>

              {/* Inference Engine Status */}
              <div className="p-3.5 rounded-lg border border-[#283242] bg-[#121822] space-y-2">
                <div className="text-[10px] text-[#9AA6B7] uppercase tracking-wider">Inference Status</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA6B7]">Active Engine:</span>
                  <span className="text-[#F1F4F8] font-bold">
                    {edge0Online ? 'Edge0 (Local MoE)' : 'Google Gemini 3.8'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA6B7]">Data Egress:</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    edge0Online
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                  }`}>
                    {edge0Online ? '0% Local Only' : 'Cloud Secure'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA6B7]">Backend Link:</span>
                  <span className={isBackendConnected ? 'text-emerald-400' : 'text-[#F87171]'}>
                    {isBackendConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Safety & Isolation Telemetry */}
              <div className="p-3.5 rounded-lg border border-[#283242] bg-[#121822] space-y-2">
                <div className="text-[10px] text-[#9AA6B7] uppercase tracking-wider">Security Boundaries</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA6B7]">Sandbox Barrier:</span>
                  <span className="text-emerald-400 font-bold">Exit-Code 126</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA6B7]">Kill Switch:</span>
                  <span className={isKillSwitchActive ? 'text-[#F87171] font-bold' : 'text-emerald-400'}>
                    {isKillSwitchActive ? 'ARMED' : 'Disarmed / Standby'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9AA6B7]">Approvals Queue:</span>
                  <span className={pendingApprovalsCount > 0 ? 'text-[#FBBF24] font-bold' : 'text-[#9AA6B7]'}>
                    {pendingApprovalsCount} pending
                  </span>
                </div>
              </div>

              {/* Contextual Quick Actions */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] text-[#9AA6B7] uppercase tracking-wider">Quick Actions</div>
                <button
                  onClick={() => onNavigate('terminal')}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-left text-xs transition-colors cursor-pointer"
                >
                  <Terminal className="h-3.5 w-3.5 text-[#42D9F5]" />
                  <span>Open Sandbox Terminal</span>
                </button>
                <button
                  onClick={() => onNavigate('settings')}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-left text-xs transition-colors cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5 text-[#8A83FF]" />
                  <span>Configure Edge0 Local Engine</span>
                </button>
                <button
                  onClick={() => onNavigate('activity')}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-[#283242] bg-[#121822] hover:bg-[#171F2B] text-left text-xs transition-colors cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>View Cryptographic Seals</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. MOBILE FIXED SAFE-AREA BOTTOM NAVIGATION BAR                      */}
      {/* ===================================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0D1118]/95 border-t border-[#283242] flex items-center justify-around px-2 backdrop-blur-md pb-safe"
      >
        <button
          onClick={() => handleNavClick('brain')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            currentView === 'brain' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Central Brain"
        >
          <Brain className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-mono font-medium">Brain</span>
        </button>

        <button
          onClick={() => handleNavClick('chat')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            currentView === 'chat' ? 'text-[#42D9F5] font-bold' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Conversational AI Chat"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-mono font-medium">Chat</span>
        </button>

        <button
          onClick={() => handleNavClick('agents')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] min-h-[44px] relative transition-colors cursor-pointer ${
            currentView === 'agents' || currentView === 'tasks' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Security Droids & Agents"
        >
          <Bot className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-mono font-medium">Droids</span>
          {pendingApprovalsCount > 0 && (
            <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-[#FBBF24]" />
          )}
        </button>

        <button
          onClick={() => handleNavClick('bughunt')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            currentView === 'bughunt' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Bug Hunt Workspace"
        >
          <Crosshair className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-mono font-medium">Bounty</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-1 min-w-[56px] min-h-[44px] text-[#9AA6B7] hover:text-[#F1F4F8] transition-colors cursor-pointer"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-mono font-medium">Menu</span>
        </button>
      </nav>

      {/* PWA Install Modal */}
      <PWAInstallModal
        pwa={pwa}
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />
    </div>
  );
};
