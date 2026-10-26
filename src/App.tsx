/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AgentContractModal } from './components/common/AgentContractModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthGateScreen } from './components/auth/AuthGateScreen';
import { SkullLogo } from './components/common/SkullLogo';
import { ResourceExplorer } from './components/explorer/ResourceExplorer';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { AppShell, ShellView } from './components/shell/AppShell';
import { HomeView } from './components/home/HomeView';
import { apiClient } from './services/apiClient';
import { mobileNativeService } from './services/native/mobileNativeService';
import { KnowledgeGraphData } from './types/graph';
import { Provider, Resource, ResourceRelationship } from './types/resource';
import { AgentDefinition, AuditEvent, Project, ToolDefinition, Workspace } from './types/foundation';
import { AgentWorker, KillSwitchStatus, RuntimeEvent } from './types/agentRuntime';

// Statically imported views for guaranteed single-instance React runtime and instant 0ms tab switching
import { KnowledgeGraphView } from './components/graph/KnowledgeGraphView';
import { AgentRuntimeConsole } from './components/agents/AgentRuntimeConsole';
import { ResourceDetailPage } from './components/detail/ResourceDetailPage';
import { ProviderHub } from './components/providers/ProviderHub';
import { ConnectorConsole } from './components/connectors/ConnectorConsole';
import { ProjectsView } from './components/projects/ProjectsView';
import { ToolsView } from './components/tools/ToolsView';
import { ActivityView } from './components/activity/ActivityView';
import { DocsView } from './components/docs/DocsView';
import { OperatorDashboard } from './components/operations/OperatorDashboard';
import { ReviewCenter } from './components/review/ReviewCenter';
import { TerminalWorkspace } from './components/terminal/TerminalWorkspace';
import { CentralBrainView } from './components/brain/CentralBrainView';
import { ConversationsView } from './components/memory/ConversationsView';
import { EvolutionView } from './components/evolution/EvolutionView';
import { GoogleIntegrationView } from './components/google/GoogleIntegrationView';
import { ContinuityCenter } from './components/continuity/ContinuityCenter';
import { BugHuntWorkspace } from './components/bughunt/BugHuntWorkspace';
import { CentralBrainChatView } from './components/chat/CentralBrainChatView';
import { SettingsView } from './components/settings/SettingsView';
import { FourBeastsView } from './components/engines/FourBeastsView';
import { GitHubActionsWorkspace } from './components/actions/GitHubActionsWorkspace';
import { ComfyUIWorkspace } from './components/engines/ComfyUIWorkspace';
import { SecurityCenter } from './components/security/SecurityCenter';

export default function App() {
  const [currentView, setCurrentView] = useState<ShellView>('home');
  const [resources, setResources] = useState<Resource[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceRelationships, setResourceRelationships] = useState<ResourceRelationship[]>([]);
  
  // Platform & Agent Entities
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [workers, setWorkers] = useState<AgentWorker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isKillSwitchActive, setIsKillSwitchActive] = useState<boolean>(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Authentication State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authCurrentUser, setAuthCurrentUser] = useState<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [agentModalResource, setAgentModalResource] = useState<Resource | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Initial Load & Native Capacitor Bridge Initialization
  useEffect(() => {
    mobileNativeService.initialize();
    loadData();

    const unsubConnectivity = mobileNativeService.onConnectivityChange((status) => {
      if (!status.connected) {
        setIsBackendConnected(false);
      } else {
        syncBackgroundStatus();
      }
    });

    return () => {
      unsubConnectivity();
    };
  }, []);

  // Android Hardware Back Button & Mobile Stack Handling
  useEffect(() => {
    return mobileNativeService.registerBackHandler(() => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return true;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return true;
      }
      if (agentModalResource) {
        setAgentModalResource(null);
        return true;
      }
      if (currentView !== 'home') {
        setCurrentView('home');
        return true;
      }
      return false;
    });
  }, [isSearchOpen, isAuthModalOpen, agentModalResource, currentView]);

  // Periodic polling for status and approvals (only active when tab is visible)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncBackgroundStatus();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Global keyboard shortcut for Search (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [
        resData,
        provData,
        gData,
        health,
        agentsData,
        workersData,
        projectsData,
        workspacesData,
        toolsData,
        eventsData,
        auditData,
        ksStatus,
        approvalsData
      ] = await Promise.all([
        apiClient.getResources(),
        apiClient.getProviders(),
        apiClient.getKnowledgeGraph(),
        apiClient.checkHealth(),
        apiClient.getAgents(),
        apiClient.getWorkers(),
        apiClient.getProjects(),
        apiClient.getWorkspaces(),
        apiClient.getTools(),
        apiClient.getEvents({ limit: 50 }),
        apiClient.getAuditEvents({ limit: 50 }),
        apiClient.getKillSwitch(),
        apiClient.getApprovals({ status: 'pending' })
      ]);

      setResources(resData.items);
      setProviders(provData);
      setGraphData(gData);
      setIsBackendConnected(health.connected);
      setAgents(agentsData);
      setWorkers(workersData);
      setProjects(projectsData);
      setWorkspaces(workspacesData);
      setTools(toolsData);
      setRuntimeEvents(eventsData);
      setAuditEvents(auditData);
      setIsKillSwitchActive(ksStatus.is_active);
      setPendingApprovalsCount(approvalsData.length);

      try {
        const authData = await apiClient.getAuthCurrentUser();
        if (authData?.user) setAuthCurrentUser(authData.user);
      } catch {
        // Fallback to default
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setLoadError(err?.message || 'Failed to initialize ecosystem catalog');
    } finally {
      setIsLoading(false);
    }
  };

  const syncBackgroundStatus = async () => {
    try {
      const [health, ksStatus, approvalsData] = await Promise.all([
        apiClient.checkHealth(),
        apiClient.getKillSwitch(),
        apiClient.getApprovals({ status: 'pending' })
      ]);
      setIsBackendConnected(health.connected);
      setIsKillSwitchActive(ksStatus.is_active);
      setPendingApprovalsCount(approvalsData.length);
    } catch {
      // background silent catch
    }
  };

  const handleSelectResource = async (resource: Resource) => {
    setSelectedResource(resource);
    const rels = await apiClient.getRelationships(resource.slug);
    setResourceRelationships(rels);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateBySlug = async (slug: string) => {
    const res = await apiClient.getResourceBySlug(slug);
    if (res) {
      handleSelectResource(res);
    }
  };

  const handleNavigateView = (view: ShellView, slug?: string) => {
    if (slug) {
      handleNavigateBySlug(slug);
      return;
    }
    if (view === 'google-ai-studio') {
      handleNavigateBySlug('google-ai-studio');
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSyncComplete = (newResources: Resource[]) => {
    setResources(prev => {
      const map = new Map<string, Resource>();
      prev.forEach(r => map.set(r.slug, r));
      newResources.forEach(r => map.set(r.slug, r));
      return Array.from(map.values());
    });
  };

  const handleCreateProject = async (name: string, description: string) => {
    const created = await apiClient.createProject({ name, description });
    if (created) {
      const updatedProjects = await apiClient.getProjects();
      setProjects(updatedProjects);
    }
  };

  const handleCreateWorkspace = async (projectId: string, name: string) => {
    const created = await apiClient.createWorkspace({ project_id: projectId, name });
    if (created) {
      const updatedWorkspaces = await apiClient.getWorkspaces();
      setWorkspaces(updatedWorkspaces);
    }
  };

  const handleRefreshActivity = async () => {
    const [eventsData, auditData] = await Promise.all([
      apiClient.getEvents({ limit: 100 }),
      apiClient.getAuditEvents({ limit: 100 })
    ]);
    setRuntimeEvents(eventsData);
    setAuditEvents(auditData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080B10] text-[#F1F4F8] flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 rounded-xl border border-[#283242] bg-[#121822] flex items-center justify-center animate-pulse mb-3">
          <SkullLogo className="h-6 w-6" />
        </div>
        <div className="text-xs font-mono text-[#9AA6B7] tracking-wider uppercase">Initializing AI Heaven...</div>
      </div>
    );
  }

  // Login must appear before the protected workspace
  if (!authCurrentUser) {
    return (
      <AuthGateScreen
        onAuthenticated={(user) => {
          setAuthCurrentUser(user);
        }}
        isBackendConnected={isBackendConnected}
      />
    );
  }

  const handleSignOut = async () => {
    try {
      await apiClient.logoutAuth();
    } catch {
      // safe fallback
    }
    setAuthCurrentUser(null);
  };

  return (
    <AppShell
      currentView={currentView}
      onNavigate={handleNavigateView}
      onOpenSearch={() => setIsSearchOpen(true)}
      isBackendConnected={isBackendConnected}
      pendingApprovalsCount={pendingApprovalsCount}
      isKillSwitchActive={isKillSwitchActive}
      onOpenAuth={() => setIsAuthModalOpen(true)}
      onSignOut={handleSignOut}
      currentUser={authCurrentUser}
    >
      {loadError && (
        <div className="mb-6 p-4 rounded-lg border border-rose-900/60 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between font-mono">
          <span>Notice: {loadError}. Using authoritative local fallback.</span>
          <button
            onClick={loadData}
            className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-100 transition-colors"
          >
            Retry Sync
          </button>
        </div>
      )}

      {currentView === 'home' && (
          <HomeView
            resources={resources}
            agents={agents}
            workers={workers}
            pendingApprovalsCount={pendingApprovalsCount}
            isBackendConnected={isBackendConnected}
            onNavigate={handleNavigateView}
            onSelectResource={handleSelectResource}
            onOpenNewTaskModal={() => handleNavigateView('tasks')}
          />
        )}

        {currentView === 'bughunt' && (
          <BugHuntWorkspace
            currentUser={authCurrentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'chat' && (
          <CentralBrainChatView
            currentUser={authCurrentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigateToProject={() => setCurrentView('projects')}
            onNavigateToHunt={() => setCurrentView('bughunt')}
            onNavigateToTools={() => setCurrentView('tools')}
          />
        )}

        {currentView === 'brain' && (
          <CentralBrainView onNavigateToChat={() => setCurrentView('chat')} />
        )}

        {currentView === 'continuity' && (
          <ContinuityCenter />
        )}

        {currentView === 'memory' && (
          <ConversationsView />
        )}

        {currentView === 'evolution' && (
          <EvolutionView />
        )}

        {currentView === 'google' && (
          <GoogleIntegrationView />
        )}

        {currentView === 'explore' && (
          <ResourceExplorer
            resources={resources}
            providers={providers}
            isLoading={isLoading}
            onSelectResource={handleSelectResource}
            onOpenAgentSpec={(res) => setAgentModalResource(res)}
            onNavigateGoogleAIStudio={() => handleNavigateBySlug('google-ai-studio')}
            onNavigateKnowledgeGraph={() => setCurrentView('graph')}
            onNavigateAgents={() => setCurrentView('agents')}
          />
        )}

        {currentView === 'terminal' && (
          <TerminalWorkspace />
        )}

        {currentView === 'agents' && (
          <AgentRuntimeConsole
            initialTab="fleet"
            onNavigateDetail={handleNavigateBySlug}
            onNavigateKnowledgeGraph={() => setCurrentView('graph')}
            onApprovalsCountChange={(count) => setPendingApprovalsCount(count)}
          />
        )}

        {currentView === 'tasks' && (
          <AgentRuntimeConsole
            initialTab="workspace"
            onNavigateDetail={handleNavigateBySlug}
            onNavigateKnowledgeGraph={() => setCurrentView('graph')}
            onApprovalsCountChange={(count) => setPendingApprovalsCount(count)}
          />
        )}

        {currentView === 'projects' && (
          <ProjectsView
            projects={projects}
            workspaces={workspaces}
            onCreateProject={handleCreateProject}
            onCreateWorkspace={handleCreateWorkspace}
          />
        )}

        {currentView === 'tools' && (
          <ToolsView
            tools={tools}
            onOpenNewTaskModal={() => handleNavigateView('tasks')}
          />
        )}

        {currentView === 'github-actions' && (
          <GitHubActionsWorkspace />
        )}

        {currentView === 'activity' && (
          <ActivityView
            events={runtimeEvents}
            auditEvents={auditEvents}
            onRefresh={handleRefreshActivity}
          />
        )}

        {currentView === 'docs' && (
          <DocsView />
        )}

        {currentView === 'review' && (
          <ReviewCenter onNavigateView={handleNavigateView} />
        )}

        {currentView === 'operations' && (
          <OperatorDashboard
            onNavigateToAgent={() => setCurrentView('agents')}
            onNavigateToApprovals={() => setCurrentView('tasks')}
          />
        )}

        {currentView === 'detail' && selectedResource && (
          <ResourceDetailPage
            resource={selectedResource}
            relationships={resourceRelationships}
            onBack={() => setCurrentView('explore')}
            onNavigateToResource={handleNavigateBySlug}
          />
        )}

        {currentView === 'graph' && (
          <KnowledgeGraphView
            data={graphData}
            onSelectResource={handleNavigateBySlug}
          />
        )}

        {currentView === 'providers' && (
          <ProviderHub
            providers={providers}
            resources={resources}
            onSelectResource={handleSelectResource}
            onNavigateGoogleAIStudio={() => handleNavigateBySlug('google-ai-studio')}
          />
        )}

        {currentView === 'connectors' && (
          <ConnectorConsole onSyncComplete={handleSyncComplete} />
        )}

        {currentView === 'settings' && (
          <SettingsView />
        )}

        {currentView === 'engines' && (
          <FourBeastsView />
        )}

        {currentView === 'comfyui' && (
          <ComfyUIWorkspace onNavigateToTools={() => setCurrentView('tools')} />
        )}

        {currentView === 'security' && (
          <SecurityCenter
            currentUser={authCurrentUser}
            onNavigateView={handleNavigateView}
          />
        )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        resources={resources}
        onSelectResource={handleSelectResource}
        onOpenAgentSpec={(res) => setAgentModalResource(res)}
      />

      {/* Agent Contract Specification Modal */}
      <AgentContractModal
        resource={agentModalResource}
        onClose={() => setAgentModalResource(null)}
        onNavigateDetail={handleSelectResource}
      />

      {/* Multi-Provider Authentication & Tenant Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={authCurrentUser}
        onUserChanged={(u) => setAuthCurrentUser(u)}
      />
    </AppShell>
  );
}
