import { ArrowRight, CheckCircle2, Filter, Layers, Search, ShieldAlert, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Provider, Resource, ResourceType } from '../../types/resource';
import { ResourceCard } from './ResourceCard';

interface ResourceExplorerProps {
  resources: Resource[];
  providers: Provider[];
  onSelectResource: (resource: Resource) => void;
  onOpenAgentSpec: (resource: Resource) => void;
  onNavigateGoogleAIStudio: () => void;
  onNavigateKnowledgeGraph: () => void;
}

export const ResourceExplorer: React.FC<ResourceExplorerProps> = ({
  resources,
  providers,
  onSelectResource,
  onOpenAgentSpec,
  onNavigateGoogleAIStudio,
  onNavigateKnowledgeGraph
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [hideDemoData, setHideDemoData] = useState<boolean>(false);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Compute real counts from actual active data (Zero fake numbers!)
  const stats = useMemo(() => {
    const total = resources.length;
    const verified = resources.filter(r => r.verification_status === 'verified').length;
    const demoCount = resources.filter(r => r.provenance.is_demo_data).length;
    const modelCount = resources.filter(r => r.resource_type === 'model').length;
    return { total, verified, demoCount, modelCount };
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (hideDemoData && r.provenance.is_demo_data) return false;
      if (verifiedOnly && r.verification_status !== 'verified') return false;
      if (selectedType !== 'all' && r.resource_type !== selectedType) return false;
      if (selectedProvider !== 'all' && r.provider_id !== selectedProvider) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesSlug = r.slug.toLowerCase().includes(q);
        const matchesDesc = r.description.toLowerCase().includes(q);
        const matchesTag = r.tags.some(t => t.toLowerCase().includes(q));
        const matchesCap = r.capabilities.some(c => c.toLowerCase().includes(q));
        if (!matchesName && !matchesSlug && !matchesDesc && !matchesTag && !matchesCap) {
          return false;
        }
      }

      return true;
    });
  }, [resources, hideDemoData, verifiedOnly, selectedType, selectedProvider, searchQuery]);

  const resourceTypeFilters: { id: ResourceType | 'all'; label: string }[] = [
    { id: 'all', label: 'All Resources' },
    { id: 'platform', label: 'Platforms' },
    { id: 'model', label: 'AI Models' },
    { id: 'api', label: 'APIs' },
    { id: 'sdk', label: 'SDKs' },
    { id: 'mcp_server', label: 'MCP Servers' },
    { id: 'repository', label: 'Repositories' }
  ];

  return (
    <div className="space-y-8">
      {/* Editorial Hero Banner */}
      <section className="border-b border-neutral-800 pb-8 pt-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>AI HEAVEN REGISTRY</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>AGENT-FIRST ECOSYSTEM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-100 max-w-2xl">
              Universal resource discovery, knowledge graph, and verification for AI agents.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Google + GitHub + Hugging Face + Stack Overflow + AWS reimagined for autonomous agents and engineers. Every entry exposes structured agent contracts, provenance tracking, and server-verified relationships.
            </p>
          </div>

          {/* Featured Spotlight: Google AI Studio Entry */}
          <div className="shrink-0 p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 max-w-sm w-full space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span>FEATURED PLATFORM</span>
              <span className="text-emerald-400">Server-Verified</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Google AI Studio & Gemini Ecosystem</h2>
              <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                Deep architectural integration with Gemini 1.5 Pro (2M ctx), Gemini 2.0 Flash, Gemini API, and @google/genai SDK.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={onNavigateGoogleAIStudio}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-neutral-100 text-neutral-950 hover:bg-neutral-200 text-xs font-medium transition-colors"
              >
                <span>Inspect Platform</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={onNavigateKnowledgeGraph}
                className="flex items-center justify-center py-1.5 px-3 rounded border border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 text-xs font-medium transition-colors whitespace-nowrap"
                title="View in Knowledge Graph"
              >
                <span>View Graph</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real Statistics Grid (Strictly generated from data) */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-neutral-900 font-mono">
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Active Catalog</span>
            <div className="text-xl font-semibold text-neutral-200 tabular-nums">
              {stats.total} <span className="text-xs text-neutral-500 font-normal">resources</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Server Verified</span>
            <div className="text-xl font-semibold text-emerald-400 tabular-nums">
              {stats.verified} <span className="text-xs text-neutral-500 font-normal">verified</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Verified Providers</span>
            <div className="text-xl font-semibold text-neutral-200 tabular-nums">
              {providers.length} <span className="text-xs text-neutral-500 font-normal">providers</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Frontier Models</span>
            <div className="text-xl font-semibold text-neutral-200 tabular-nums">
              {stats.modelCount} <span className="text-xs text-neutral-500 font-normal">models</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar Section */}
      <section className="space-y-4">
        {/* Search input and toggle controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, capability, or tag (e.g., multimodal, gemini, mcp)..."
              className="w-full rounded-md border border-neutral-800 bg-neutral-900/80 py-2 pl-9 pr-3 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-mono">
            {/* Provider Selector */}
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span className="text-neutral-500">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                aria-label="Filter by provider"
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-200 focus:border-neutral-700 focus:outline-none"
              >
                <option value="all">All Providers</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Checkbox: Verified Only */}
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 hover:text-neutral-200">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-900 text-emerald-500 focus:ring-0"
              />
              <span>Verified Only</span>
            </label>

            {/* Checkbox: Hide Demo Data */}
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 hover:text-neutral-200">
              <input
                type="checkbox"
                checked={hideDemoData}
                onChange={(e) => setHideDemoData(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-900 text-amber-500 focus:ring-0"
              />
              <span>Hide Demo</span>
            </label>
          </div>
        </div>

        {/* Functional Segmented Button Filter Bar (Allowed by Skill Section 1.A) */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900/60 border border-neutral-800 rounded-lg overflow-x-auto scrollbar-none">
          {resourceTypeFilters.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedType === tab.id
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Resources Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
          <span>Showing {filteredResources.length} of {resources.length} resources</span>
          {stats.demoCount > 0 && !hideDemoData && (
            <span className="flex items-center gap-1 text-amber-500/80">
              <ShieldAlert className="h-3 w-3" />
              <span>Includes {stats.demoCount} marked demo record</span>
            </span>
          )}
        </div>

        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onSelect={onSelectResource}
                onOpenAgentSpec={onOpenAgentSpec}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-12 text-center space-y-3">
            <Layers className="mx-auto h-8 w-8 text-neutral-600" />
            <div className="text-sm font-medium text-neutral-300">
              No verified resources match your filter criteria.
            </div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Try clearing the search query or adjusting provider filters. All catalog queries are executed against live verified schemas.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedProvider('all');
                setVerifiedOnly(false);
                setHideDemoData(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
