/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AgentContractModal } from './components/common/AgentContractModal';
import { Footer } from './components/common/Footer';
import { NavView, TopNav } from './components/common/TopNav';
import { ConnectorConsole } from './components/connectors/ConnectorConsole';
import { ResourceDetailPage } from './components/detail/ResourceDetailPage';
import { ResourceExplorer } from './components/explorer/ResourceExplorer';
import { KnowledgeGraphView } from './components/graph/KnowledgeGraphView';
import { ProviderHub } from './components/providers/ProviderHub';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { BackendSettingsModal } from './components/settings/BackendSettingsModal';
import { apiClient } from './services/apiClient';
import { KnowledgeGraphData } from './types/graph';
import { Provider, Resource, ResourceRelationship } from './types/resource';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('explore');
  const [resources, setResources] = useState<Resource[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceRelationships, setResourceRelationships] = useState<ResourceRelationship[]>([]);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [agentModalResource, setAgentModalResource] = useState<Resource | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Initial Load
  useEffect(() => {
    loadData();
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
    try {
      const [resData, provData, gData, health] = await Promise.all([
        apiClient.getResources(),
        apiClient.getProviders(),
        apiClient.getKnowledgeGraph(),
        apiClient.checkHealth()
      ]);
      setResources(resData.items);
      setProviders(provData);
      setGraphData(gData);
      setIsBackendConnected(health.connected);
    } catch (err) {
      console.error('Failed to load initial data:', err);
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

  const handleNavigateView = (view: NavView, slug?: string) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* Top Navigation conforming to Top Bar Contract */}
      <TopNav
        currentView={currentView}
        onNavigate={handleNavigateView}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenBackendSettings={() => setIsBackendModalOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'explore' && (
          <ResourceExplorer
            resources={resources}
            providers={providers}
            onSelectResource={handleSelectResource}
            onOpenAgentSpec={(res) => setAgentModalResource(res)}
            onNavigateGoogleAIStudio={() => handleNavigateBySlug('google-ai-studio')}
            onNavigateKnowledgeGraph={() => setCurrentView('graph')}
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
      </main>

      {/* Footer conforming to Minimal Anti-Slop Discipline */}
      <Footer
        onOpenBackendSettings={() => setIsBackendModalOpen(true)}
        onNavigateGoogleAIStudio={() => handleNavigateBySlug('google-ai-studio')}
      />

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
    </div>
  );
}
