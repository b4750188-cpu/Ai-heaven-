import { Database, Search } from 'lucide-react';
import React from 'react';

export type NavView = 'explore' | 'google-ai-studio' | 'providers' | 'graph' | 'connectors' | 'agents' | 'detail';

interface TopNavProps {
  currentView: NavView;
  onNavigate: (view: NavView, slug?: string) => void;
  onOpenSearch: () => void;
  onOpenBackendSettings: () => void;
  isBackendConnected: boolean;
  pendingApprovalsCount?: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  onOpenBackendSettings,
  isBackendConnected,
  pendingApprovalsCount
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onNavigate('explore')}
          className="group flex items-center gap-2 text-left focus:outline-none"
        >
          <span className="font-semibold tracking-tight text-neutral-100 text-base transition-colors group-hover:text-emerald-400">
            AI HEAVEN
          </span>
          <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="System Authoritative Store Active" />
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <button
            onClick={() => onNavigate('explore')}
            className={`transition-colors hover:text-neutral-100 ${
              currentView === 'explore' ? 'text-neutral-100 font-semibold' : ''
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onNavigate('google-ai-studio')}
            className={`transition-colors hover:text-neutral-100 ${
              currentView === 'google-ai-studio' ? 'text-neutral-100 font-semibold' : ''
            }`}
          >
            Google AI Studio
          </button>
          <button
            onClick={() => onNavigate('providers')}
            className={`transition-colors hover:text-neutral-100 ${
              currentView === 'providers' ? 'text-neutral-100 font-semibold' : ''
            }`}
          >
            Providers
          </button>
          <button
            onClick={() => onNavigate('graph')}
            className={`transition-colors hover:text-neutral-100 ${
              currentView === 'graph' ? 'text-neutral-100 font-semibold' : ''
            }`}
          >
            Knowledge Graph
          </button>
          <button
            onClick={() => onNavigate('connectors')}
            className={`transition-colors hover:text-neutral-100 ${
              currentView === 'connectors' ? 'text-neutral-100 font-semibold' : ''
            }`}
          >
            Connectors
          </button>
          <button
            onClick={() => onNavigate('agents')}
            className={`relative flex items-center gap-1.5 transition-colors hover:text-neutral-100 ${
              currentView === 'agents' ? 'text-neutral-100 font-semibold' : ''
            }`}
          >
            <span>Agents</span>
            {pendingApprovalsCount && pendingApprovalsCount > 0 ? (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-amber-500 text-neutral-950 animate-pulse">
                {pendingApprovalsCount}
              </span>
            ) : null}
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition-colors"
            title="Global search across AI models, APIs, and platforms"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search ecosystem...</span>
            <kbd className="hidden lg:inline-block rounded border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={onOpenBackendSettings}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-neutral-100 transition-colors whitespace-nowrap"
            title="FastAPI / PostgreSQL Backend Configuration"
          >
            <Database className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Backend</span>
            <span className={`h-1.5 w-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
          </button>
        </div>
      </div>

      {/* Mobile sub-bar for view switching */}
      <div className="flex md:hidden border-t border-neutral-900 bg-neutral-950/95 overflow-x-auto px-4 py-2 gap-4 text-xs font-medium text-neutral-400 scrollbar-none">
        <button
          onClick={() => onNavigate('explore')}
          className={`shrink-0 transition-colors ${currentView === 'explore' ? 'text-neutral-100 font-semibold' : ''}`}
        >
          Explore
        </button>
        <button
          onClick={() => onNavigate('google-ai-studio')}
          className={`shrink-0 transition-colors ${currentView === 'google-ai-studio' ? 'text-neutral-100 font-semibold' : ''}`}
        >
          Google AI Studio
        </button>
        <button
          onClick={() => onNavigate('providers')}
          className={`shrink-0 transition-colors ${currentView === 'providers' ? 'text-neutral-100 font-semibold' : ''}`}
        >
          Providers
        </button>
        <button
          onClick={() => onNavigate('graph')}
          className={`shrink-0 transition-colors ${currentView === 'graph' ? 'text-neutral-100 font-semibold' : ''}`}
        >
          Knowledge Graph
        </button>
        <button
          onClick={() => onNavigate('connectors')}
          className={`shrink-0 transition-colors ${currentView === 'connectors' ? 'text-neutral-100 font-semibold' : ''}`}
        >
          Connectors
        </button>
        <button
          onClick={() => onNavigate('agents')}
          className={`shrink-0 flex items-center gap-1 transition-colors ${currentView === 'agents' ? 'text-neutral-100 font-semibold' : ''}`}
        >
          <span>Agents</span>
          {pendingApprovalsCount && pendingApprovalsCount > 0 ? (
            <span className="inline-flex items-center justify-center h-3.5 min-w-3.5 px-0.5 text-[9px] font-bold rounded-full bg-amber-500 text-neutral-950">
              {pendingApprovalsCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
};
