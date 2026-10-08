/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AgentContractModal } from './components/common/AgentContractModal';
import { ConnectorConsole } from './components/connectors/ConnectorConsole';
import { ResourceDetailPage } from './components/detail/ResourceDetailPage';
import { ResourceExplorer } from './components/explorer/ResourceExplorer';
import { KnowledgeGraphView } from './components/graph/KnowledgeGraphView';
import { ProviderHub } from './components/providers/ProviderHub';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { BackendSettingsModal } from './components/settings/BackendSettingsModal';
import { AgentRuntimeConsole } from './components/agents/AgentRuntimeConsole';
import { AppShell, ShellView } from './components/shell/AppShell';
import { HomeView } from './components/home/HomeView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ToolsView } from './components/tools/ToolsView';
import { ActivityView } from './components/activity/ActivityView';
import { DocsView } from './components/docs/DocsView';
import { apiClient } from './services/apiClient';
import { KnowledgeGraphData } from './types/graph';
import { Provider, Resource, ResourceRelationship } from './types/resource';
import { AgentDefinition, AuditEvent, Project, ToolDefinition, Workspace } from './types/foundation';
import { AgentWorker, KillSwitchStatus, RuntimeEvent } from './types/agentRuntime';

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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [agentModalResource, setAgentModalResource] = useState<Resource | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  // Periodic polling for status and approvals
  useEffect(() => {
    const timer = setInterval(() => {
      syncBackgroundStatus();
    }, 5000);
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
    if (view === 'settings') {
      setIsBackendModalOpen(true);
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

  return (
    <AppShell
      currentView={currentView}
      onNavigate={handleNavigateView}
      onOpenSearch={() => setIsSearchOpen(true)}
      onOpenBackendSettings={() => setIsBackendModalOpen(true)}
      isBackendConnected={isBackendConnected}
      pendingApprovalsCount={pendingApprovalsCount}
      isKillSwitchActive={isKillSwitchActive}
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

      {/* FastAPI / SQLAlchemy Architecture Modal */}
      <BackendSettingsModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        onBackendStatusChange={(connected) => setIsBackendConnected(connected)}
      />
    </AppShell>
  );
}
