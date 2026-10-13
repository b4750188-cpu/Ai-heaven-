import {
  Activity,
  AlertOctagon,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Compass,
  Crosshair,
  Database,
  ExternalLink,
  Flame,
  FolderGit2,
  Home,
  Layers,
  ListTodo,
  Menu,
  MessageSquare,
  Network,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Terminal,
  User,
  Workflow,
  Wrench,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '../ui/Badge';

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
  | 'providers'
  | 'projects'
  | 'tasks'
  | 'operations'
  | 'activity'
  | 'review'
  | 'connectors'
  | 'settings'
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

  // Grouped Navigation Items matching the design specification
  const primaryNav = [
    { id: 'home' as ShellView, label: 'Command Center', icon: Home },
    { id: 'chat' as ShellView, label: 'Central Brain Chat', icon: MessageSquare },
    { id: 'bughunt' as ShellView, label: 'Bug Bounty & Droids', icon: Crosshair },
    { id: 'brain' as ShellView, label: 'AI Brain & Router', icon: Brain },
    {
      id: 'agents' as ShellView,
      label: 'Agent Fleet & Droids',
      icon: Bot,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
      badgeVariant: 'warning' as const
    },
    { id: 'memory' as ShellView, label: 'Memory & Threads', icon: Sparkles },
    { id: 'terminal' as ShellView, label: 'Terminal & Sandbox', icon: Terminal },
    { id: 'explore' as ShellView, label: 'Open-Source Explorer', icon: Compass }
  ];

  const platformNav = [
    { id: 'continuity' as ShellView, label: 'Continuity Center', icon: Sparkles },
    { id: 'google' as ShellView, label: 'Google & Drive', icon: Cloud },
    { id: 'evolution' as ShellView, label: 'Autonomous Evolution', icon: Flame },
    { id: 'graph' as ShellView, label: 'Knowledge Graph', icon: Network },
    { id: 'projects' as ShellView, label: 'Projects & Workspaces', icon: FolderGit2 },
    { id: 'providers' as ShellView, label: 'Providers & Quotas', icon: Building2 },
    { id: 'tools' as ShellView, label: 'Tools', icon: Wrench },
    {
      id: 'tasks' as ShellView,
      label: 'Tasks & Approvals',
      icon: ListTodo,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined
    }
  ];

  const systemNav = [
    { id: 'review' as ShellView, label: 'Review Center', icon: ClipboardCheck },
    { id: 'operations' as ShellView, label: 'Operations & Health', icon: Server },
    { id: 'activity' as ShellView, label: 'Activity Logs', icon: Activity },
    { id: 'connectors' as ShellView, label: 'Connectors', icon: Workflow },
    { id: 'settings' as ShellView, label: 'Settings', icon: Settings },
    { id: 'docs' as ShellView, label: 'Documentation', icon: BookOpen }
  ];

  const handleNavClick = (view: ShellView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-[#F1F4F8] flex flex-col font-sans selection:bg-[#42D9F5]/30 selection:text-[#F1F4F8]">
      {/* ===================================================================== */}
      {/* 1. TOP BAR                                                             */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 h-14 border-b border-[#283242] bg-[#0D1118]/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Identity & Mobile Hamburger */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] focus:outline-none focus:ring-1 focus:ring-[#42D9F5]"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#42D9F5] rounded"
          >
            <div className="h-7 w-7 rounded border border-[#42D9F5]/40 bg-[#42D9F5]/10 flex items-center justify-center font-mono font-bold text-xs text-[#42D9F5] group-hover:border-[#42D9F5] group-hover:shadow-[0_0_12px_rgba(66,217,245,0.25)] transition-all">
              H
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-[#F1F4F8] text-sm font-mono group-hover:text-[#42D9F5] transition-colors">
                AI HEAVEN
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-[#9AA6B7]/70 uppercase tracking-wider">
                v2.4
              </span>
            </div>
          </button>
        </div>

        {/* Center: Global Search Trigger */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between rounded border border-[#283242] bg-[#121822] px-3.5 py-1.5 text-xs text-[#9AA6B7] hover:border-[#42D9F5]/50 hover:text-[#F1F4F8] transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-[#42D9F5]"
            title="Global search across AI models, APIs, and tools"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-[#9AA6B7]" />
              <span>Search ecosystem, agents, tools...</span>
            </div>
            <kbd className="rounded border border-[#283242] bg-[#080B10] px-1.5 py-0.5 font-mono text-[10px] text-[#9AA6B7]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Status Indicators, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]"
            title="Search"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Kill Switch Alert Indicator if triggered */}
          {isKillSwitchActive && (
            <button
              onClick={() => onNavigate('agents')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F87171]/15 border border-[#F87171] text-[#F87171] text-xs font-mono font-bold animate-pulse"
              title="Emergency halt triggered!"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">KILL SWITCH ACTIVE</span>
            </button>
          )}

          {/* Active Autonomous Droid Status Widget */}
          <button
            onClick={() => onNavigate('agents')}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] hover:border-[#34D399]/60 hover:bg-[#34D399]/15 text-xs font-mono transition-all"
            title="Active Autonomous Droid: AI Heaven Droid Prime (Sandboxed & Online)"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold tracking-tight">DROID PRIME</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" />
          </button>

          {/* Engine Health Status Indicator */}
          <div
            onClick={() => onNavigate('activity')}
            className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1 rounded border border-[#283242] bg-[#121822] text-[11px] font-mono text-[#9AA6B7] hover:border-[#3a475d] hover:text-[#F1F4F8] transition-colors"
            title="AI Heaven Engine Status & Telemetry"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isBackendConnected ? 'bg-[#34D399]' : 'bg-[#42D9F5]'
              }`}
            />
            <span>{isBackendConnected ? 'Backend Live' : 'Engine Ready'}</span>
          </div>

          {/* Pending Approvals Notification Bell */}
          <button
            onClick={() => onNavigate('agents')}
            className={`relative p-2 rounded border transition-colors ${
              pendingApprovalsCount > 0
                ? 'border-[#FBBF24]/50 bg-[#FBBF24]/10 text-[#FBBF24] hover:bg-[#FBBF24]/20'
                : 'border-[#283242] bg-[#121822] text-[#9AA6B7] hover:text-[#F1F4F8] hover:border-[#3a475d]'
            }`}
            title={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : 'Notifications'}
            aria-label="Pending Approvals Notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-1 rounded-full bg-[#FBBF24] text-[#080B10] text-[9px] font-bold font-mono flex items-center justify-center animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {/* User / Profile Control */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded border border-[#283242] bg-[#121822] hover:border-[#3a475d] transition-colors"
              aria-label="User profile and tenant menu"
            >
              <div className="h-5 w-5 rounded bg-[#8A83FF]/20 border border-[#8A83FF]/40 flex items-center justify-center text-[10px] font-mono text-[#8A83FF] font-bold">
                {currentUser?.fullName?.charAt(0) || 'R'}
              </div>
              <span className="hidden xl:inline text-xs font-mono text-[#F1F4F8] max-w-[120px] truncate">
                {currentUser?.email || 'researcher@aiheaven.security'}
              </span>
              <span className="text-[10px] font-mono text-[#8A83FF] font-semibold px-1 py-0.2 rounded bg-[#8A83FF]/10 border border-[#8A83FF]/30">
                {currentUser?.role?.toUpperCase() || 'RESEARCHER'}
              </span>
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[#283242] bg-[#171F2B] p-2 shadow-2xl z-50 text-xs font-mono animate-in fade-in-50 duration-100">
                  <div className="px-2.5 py-2 border-b border-[#283242] mb-1.5">
                    <div className="font-semibold text-[#F1F4F8]">{currentUser?.fullName || 'Lead Bounty Hunter'}</div>
                    <div className="text-[11px] text-[#9AA6B7] truncate">{currentUser?.email || 'researcher@aiheaven.security'}</div>
                    <div className="text-[10px] text-[#8A83FF] mt-0.5">Tenant: {currentUser?.tenantId || 'tenant_researcher_01'}</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAuth?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[#8A83FF] hover:text-[#F1F4F8] hover:bg-[#121822] text-left transition-colors border border-[#8A83FF]/30 mb-1"
                  >
                    <User className="h-3.5 w-3.5 text-[#8A83FF]" />
                    <span>Manage Identity & Access</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('bughunt');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] text-left transition-colors"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-[#42D9F5]" />
                    <span>Bug-Bounty Workspace</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('agents');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] text-left transition-colors"
                  >
                    <Bot className="h-3.5 w-3.5 text-[#34D399]" />
                    <span>Active Agent Workers</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('activity');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] text-left transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5 text-[#9AA6B7]" />
                    <span>Audit Logs</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. BODY LAYOUT: LEFT SIDEBAR + MAIN WORKSPACE                         */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[#283242] bg-[#0D1118] p-3 space-y-6 select-none overflow-y-auto">
          {/* Section 1: Primary Workspace */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9AA6B7]/60">
              Workspace
            </div>
            {primaryNav.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs transition-colors text-left border-l-2 ${
                    isActive
                      ? 'bg-[#42D9F5]/10 border-[#42D9F5] text-[#F1F4F8] font-medium'
                      : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#42D9F5]' : 'text-[#9AA6B7]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#FBBF24] text-[#080B10]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section 2: Platform Infrastructure */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9AA6B7]/60">
              Platform
            </div>
            {platformNav.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs transition-colors text-left border-l-2 ${
                    isActive
                      ? 'bg-[#42D9F5]/10 border-[#42D9F5] text-[#F1F4F8] font-medium'
                      : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#42D9F5]' : 'text-[#9AA6B7]'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Section 3: System & Observability */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9AA6B7]/60">
              System
            </div>
            {systemNav.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs transition-colors text-left border-l-2 ${
                    isActive
                      ? 'bg-[#42D9F5]/10 border-[#42D9F5] text-[#F1F4F8] font-medium'
                      : 'border-transparent text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#42D9F5]' : 'text-[#9AA6B7]'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="mt-auto pt-4 border-t border-[#283242] px-2.5 text-[11px] font-mono text-[#9AA6B7]">
            <div className="flex items-center justify-between">
              <span>Tenant</span>
              <span className="text-[#F1F4F8]">Core</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Security</span>
              <span className="text-[#34D399]">Strict</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-[#080B10]/80 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 bg-[#0D1118] border-r border-[#283242] p-4 flex flex-col h-full animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#283242] mb-4">
                <span className="font-mono font-semibold text-[#F1F4F8] text-sm">Navigation</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-[#9AA6B7] hover:text-[#F1F4F8] p-1.5" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9AA6B7]/60 px-2">
                    Workspace
                  </div>
                  {primaryNav.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded text-xs ${
                        currentView === item.id
                          ? 'bg-[#42D9F5]/10 text-[#42D9F5] font-semibold border-l-2 border-[#42D9F5]'
                          : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FBBF24] text-[#080B10] text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9AA6B7]/60 px-2">
                    Platform
                  </div>
                  {platformNav.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded text-xs ${
                        currentView === item.id
                          ? 'bg-[#42D9F5]/10 text-[#42D9F5] font-semibold border-l-2 border-[#42D9F5]'
                          : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9AA6B7]/60 px-2">
                    System
                  </div>
                  {systemNav.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded text-xs ${
                        currentView === item.id
                          ? 'bg-[#42D9F5]/10 text-[#42D9F5] font-semibold border-l-2 border-[#42D9F5]'
                          : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822]'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Purposeful Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#080B10] pb-16 md:pb-6">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#0D1118]/95 border-t border-[#283242] flex items-center justify-around px-2 backdrop-blur-md">
        <button
          onClick={() => handleNavClick('home')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] ${
            currentView === 'home' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Home"
        >
          <Home className="h-4 w-4" />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </button>
        <button
          onClick={() => handleNavClick('bughunt')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] ${
            currentView === 'bughunt' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Bug Hunt"
        >
          <Crosshair className="h-4 w-4" />
          <span className="text-[10px] mt-0.5 font-medium">Bounty</span>
        </button>
        <button
          onClick={() => handleNavClick('brain')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] ${
            currentView === 'brain' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Brain"
        >
          <Brain className="h-4 w-4" />
          <span className="text-[10px] mt-0.5 font-medium">Brain</span>
        </button>
        <button
          onClick={() => handleNavClick('agents')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] ${
            currentView === 'agents' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Agents"
        >
          <Bot className="h-4 w-4" />
          <span className="text-[10px] mt-0.5 font-medium">Agents</span>
        </button>
        <button
          onClick={() => handleNavClick('tasks')}
          className={`flex flex-col items-center justify-center p-1 min-w-[56px] relative ${
            currentView === 'tasks' ? 'text-[#42D9F5]' : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
          }`}
          aria-label="Tasks & Approvals"
        >
          <ListTodo className="h-4 w-4" />
          <span className="text-[10px] mt-0.5 font-medium">Tasks</span>
          {pendingApprovalsCount > 0 && (
            <span className="absolute top-0 right-2 h-2 w-2 rounded-full bg-[#FBBF24]" />
          )}
        </button>
      </nav>
    </div>
  );
};
