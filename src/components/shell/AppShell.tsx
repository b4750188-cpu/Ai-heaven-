import {
  Activity,
  AlertOctagon,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  Compass,
  Database,
  ExternalLink,
  Flame,
  FolderGit2,
  Home,
  Layers,
  ListTodo,
  Menu,
  Network,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Terminal,
  User,
  Workflow,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '../ui/Badge';

export type ShellView =
  | 'home'
  | 'explore'
  | 'agents'
  | 'graph'
  | 'tools'
  | 'providers'
  | 'projects'
  | 'tasks'
  | 'activity'
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
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  isBackendConnected,
  pendingApprovalsCount = 0,
  isKillSwitchActive = false,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Grouped Navigation Items matching the design specification
  const primaryNav = [
    { id: 'home' as ShellView, label: 'Home', icon: Home },
    { id: 'explore' as ShellView, label: 'Resources', icon: Compass },
    {
      id: 'agents' as ShellView,
      label: 'Droids',
      icon: Bot,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
      badgeVariant: 'warning' as const
    },
    { id: 'graph' as ShellView, label: 'Knowledge Graph', icon: Network }
  ];

  const platformNav = [
    { id: 'providers' as ShellView, label: 'Providers', icon: Building2 },
    { id: 'tools' as ShellView, label: 'Tools', icon: Terminal },
    { id: 'projects' as ShellView, label: 'Projects', icon: FolderGit2 },
    {
      id: 'tasks' as ShellView,
      label: 'Tasks & Approvals',
      icon: ListTodo,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined
    }
  ];

  const systemNav = [
    { id: 'activity' as ShellView, label: 'Activity', icon: Activity },
    { id: 'connectors' as ShellView, label: 'Connectors', icon: Workflow },
    { id: 'settings' as ShellView, label: 'Settings', icon: Settings },
    { id: 'docs' as ShellView, label: 'Documentation', icon: BookOpen }
  ];

  const handleNavClick = (view: ShellView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* ===================================================================== */}
      {/* 1. TOP BAR                                                             */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 h-13 border-b border-slate-800/80 bg-[#0A0E17]/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Identity & Mobile Hamburger */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-850"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="h-6 w-6 rounded border border-blue-500/40 bg-blue-950/60 flex items-center justify-center font-mono font-bold text-xs text-blue-400 group-hover:border-blue-400 transition-colors">
              H
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-slate-100 text-sm font-mono group-hover:text-blue-400 transition-colors">
                AI HEAVEN
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                v2.4
              </span>
            </div>
          </button>
        </div>

        {/* Center: Global Search Trigger */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-all shadow-2xs"
            title="Global search across AI models, APIs, and tools"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <span>Search ecosystem, agents, tools...</span>
            </div>
            <kbd className="rounded border border-slate-700/80 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Status Indicators, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-850"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Kill Switch Alert Indicator if triggered */}
          {isKillSwitchActive && (
            <button
              onClick={() => onNavigate('agents')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-600 text-rose-200 text-xs font-mono font-bold animate-pulse"
              title="Emergency halt triggered!"
            >
              <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden md:inline">KILL SWITCH ACTIVE</span>
            </button>
          )}

          {/* Active Autonomous Droid Status Widget */}
          <button
            onClick={() => onNavigate('agents')}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-950/25 text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-950/40 text-xs font-mono transition-all"
            title="Active Autonomous Droid: AI Heaven Droid Prime (Sandboxed & Online)"
          >
            <Bot className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold tracking-tight">DROID PRIME</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Engine Health Status Indicator */}
          <div
            onClick={() => onNavigate('activity')}
            className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1 rounded border border-slate-800/80 bg-slate-900/40 text-[11px] font-mono text-slate-400 hover:border-slate-700 hover:text-slate-300 transition-colors"
            title="AI Heaven Engine Status & Telemetry"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isBackendConnected ? 'bg-emerald-400' : 'bg-blue-400'
              }`}
            />
            <span>{isBackendConnected ? 'Backend Live' : 'Engine Ready'}</span>
          </div>

          {/* Pending Approvals Notification Bell */}
          <button
            onClick={() => onNavigate('agents')}
            className={`relative p-1.5 rounded border transition-colors ${
              pendingApprovalsCount > 0
                ? 'border-amber-700/80 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title={pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending approvals` : 'Notifications'}
          >
            <Bell className="h-3.5 w-3.5" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold font-mono flex items-center justify-center animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {/* User / Profile Control */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors"
            >
              <div className="h-5 w-5 rounded bg-blue-900/40 border border-blue-600/30 flex items-center justify-center text-[10px] font-mono text-blue-300 font-bold">
                EN
              </div>
              <span className="hidden xl:inline text-xs font-mono text-slate-300 max-w-[120px] truncate">
                developer@aiheaven.local
              </span>
              <span className="text-[10px] font-mono text-blue-400 font-semibold px-1 py-0.2 rounded bg-blue-950/60 border border-blue-800/40">
                ADMIN
              </span>
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-800 bg-[#0B0F19] p-2 shadow-2xl z-50 text-xs font-mono animate-in fade-in-50 duration-100">
                  <div className="px-2 py-1.5 border-b border-slate-800/80 mb-1">
                    <div className="font-semibold text-slate-200">AI Heaven Engineer</div>
                    <div className="text-[11px] text-slate-500">developer@aiheaven.local</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('activity');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 text-left transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5 text-slate-400" />
                    <span>System Telemetry & Audit</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('agents');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 text-left transition-colors"
                  >
                    <Bot className="h-3.5 w-3.5 text-slate-400" />
                    <span>Active Agent Workers</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('activity');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 text-left transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5 text-slate-400" />
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
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-800/80 bg-[#0A0D15] p-3 space-y-6 select-none overflow-y-auto">
          {/* Section 1: Primary Workspace */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </div>
            {primaryNav.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                    isActive
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300 font-medium'
                      : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section 2: Platform Infrastructure */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Platform
            </div>
            {platformNav.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                    isActive
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300 font-medium'
                      : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Section 3: System & Observability */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              System
            </div>
            {systemNav.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                    isActive
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-300 font-medium'
                      : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="mt-auto pt-4 border-t border-slate-900/80 px-2.5 text-[11px] font-mono text-slate-500">
            <div className="flex items-center justify-between">
              <span>Tenant</span>
              <span className="text-slate-400">Core</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Security</span>
              <span className="text-emerald-400">Strict</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-64 bg-[#0A0D15] border-r border-slate-800 p-4 flex flex-col h-full animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <span className="font-mono font-semibold text-slate-100 text-sm">Navigation</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2">
                    Workspace
                  </div>
                  {primaryNav.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between p-2 rounded text-xs ${
                        currentView === item.id
                          ? 'bg-blue-600/20 text-blue-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2">
                    Platform
                  </div>
                  {platformNav.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded text-xs ${
                        currentView === item.id
                          ? 'bg-blue-600/20 text-blue-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2">
                    System
                  </div>
                  {systemNav.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded text-xs ${
                        currentView === item.id
                          ? 'bg-blue-600/20 text-blue-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
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
        <main className="flex-1 overflow-y-auto bg-[#080B11]">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
