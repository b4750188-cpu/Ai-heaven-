import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Cpu,
  ExternalLink,
  FileCode2,
  FileJson,
  GitBranch,
  Key,
  Layers,
  Link as LinkIcon,
  ShieldCheck,
  Terminal,
  Workflow
} from 'lucide-react';
import React, { useState } from 'react';
import { Resource, ResourceRelationship } from '../../types/resource';
import { VerificationBadge } from '../common/VerificationBadge';
import { GeminiWorkbench } from './GeminiWorkbench';

interface ResourceDetailPageProps {
  resource: Resource;
  relationships: ResourceRelationship[];
  onBack: () => void;
  onNavigateToResource: (slug: string) => void;
}

export const ResourceDetailPage: React.FC<ResourceDetailPageProps> = ({
  resource,
  relationships,
  onBack,
  onNavigateToResource
}) => {
  const [activeTab, setActiveTab] = useState<'human' | 'agent_spec'>('human');
  const [copiedContract, setCopiedContract] = useState(false);

  const isGoogleAIStudio = resource.slug === 'google-ai-studio';
  const isDemo = resource.provenance.is_demo_data;

  const handleCopyAgentContract = () => {
    const payload = {
      ai_heaven_resource_id: resource.id,
      slug: resource.slug,
      name: resource.name,
      type: resource.resource_type,
      publisher: resource.publisher,
      server_verification_status: resource.verification_status,
      trust_score: resource.trust_score,
      provenance: resource.provenance,
      agent_contract: resource.agent_contract,
      models: resource.models || [],
      capabilities: resource.capabilities,
      relationships: relationships.map(r => ({
        type: r.relationship_type,
        target: r.target_slug === resource.slug ? r.source_slug : r.target_slug,
        evidence: r.evidence_url
      }))
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-100 transition-colors font-mono"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </button>

        {/* Human View vs Agent Specification Toggle */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-md">
          <button
            onClick={() => setActiveTab('human')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'human'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Human View
          </button>
          <button
            onClick={() => setActiveTab('agent_spec')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
              activeTab === 'agent_spec'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>Agent Specification</span>
          </button>
        </div>
      </div>

      {/* Demo Warning Banner if applicable */}
      {isDemo && (
        <div className="rounded-lg border border-amber-800/80 bg-amber-950/30 p-4 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">DEMO RECORD NOTICE</div>
            <p className="mt-0.5 text-amber-400/90 leading-relaxed">
              This record is explicitly marked as demo data for testing staging pipelines. It does not represent authoritative verified production documentation.
            </p>
          </div>
        </div>
      )}

      {/* Resource Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
          <span className="capitalize">{resource.resource_type.replace('_', ' ')}</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>{resource.publisher}</span>
          {resource.version && (
            <>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>v{resource.version}</span>
            </>
          )}
          {resource.license && (
            <>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{resource.license}</span>
            </>
          )}
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <VerificationBadge
            status={resource.verification_status}
            trustScore={resource.trust_score}
            isDemoData={isDemo}
            size="md"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
              {resource.name}
            </h1>
            <p className="mt-1 text-sm text-neutral-400 max-w-2xl leading-relaxed">
              {resource.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {resource.source_url && (
              <a
                href={resource.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-950 hover:bg-neutral-200 text-xs font-medium transition-colors"
              >
                <span>Launch Portal</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {resource.documentation_url && (
              <a
                href={resource.documentation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 text-xs font-medium transition-colors"
              >
                <span>Official Docs</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {resource.repository_url && (
              <a
                href={resource.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-neutral-100 hover:border-neutral-700 text-xs font-medium transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'human' ? (
        <div className="space-y-10">
          {/* Section 1: Agent Contract Quick Summary Cards */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
              Agent Interoperability Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
                <span className="text-xs font-mono text-neutral-500">WHAT IS IT?</span>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {resource.agent_contract.what_is_it}
                </p>
              </div>
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-1.5">
                <span className="text-xs font-mono text-neutral-500">WHAT DOES IT DO?</span>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {resource.agent_contract.what_does_it_do}
                </p>
              </div>
            </div>

            {/* Inputs & Outputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-2">
                <span className="text-xs font-mono text-neutral-500">ACCEPTED INPUTS</span>
                <ul className="text-xs text-neutral-300 space-y-1 list-disc list-inside">
                  {resource.agent_contract.inputs.map((inp, idx) => (
                    <li key={idx} className="leading-relaxed">{inp}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-2">
                <span className="text-xs font-mono text-neutral-500">GENERATED OUTPUTS</span>
                <ul className="text-xs text-neutral-300 space-y-1 list-disc list-inside">
                  {resource.agent_contract.outputs.map((out, idx) => (
                    <li key={idx} className="leading-relaxed">{out}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Gemini Models Ecosystem (for Google AI Studio) */}
          {resource.models && resource.models.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
                    Gemini Foundation Models
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Official models provisioned and configurable directly via Google AI Studio.
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {resource.models.length} models documented
                </span>
              </div>

              <div className="border border-neutral-800 rounded-lg overflow-x-auto bg-neutral-900/30">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 font-mono">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Model</th>
                      <th className="py-2.5 px-4 font-medium">Context Window</th>
                      <th className="py-2.5 px-4 font-medium">Input Modalities</th>
                      <th className="py-2.5 px-4 font-medium">Pricing (Input / Output)</th>
                      <th className="py-2.5 px-4 font-medium text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {resource.models.map((m) => (
                      <tr key={m.model_id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-neutral-200">
                          <div>{m.display_name}</div>
                          <div className="text-[11px] text-neutral-500">{m.model_id}</div>
                        </td>
                        <td className="py-3 px-4 text-emerald-400 tabular-nums font-semibold">
                          {(m.context_window_tokens / 1000).toLocaleString()}k tokens
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          {m.input_modalities.join(', ')}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 text-[11px]">
                          <div>In: {m.pricing_input_per_million || 'N/A'}</div>
                          <div>Out: {m.pricing_output_per_million || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={m.documentation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs"
                          >
                            <span>Docs</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Dedicated Gemini Workbench for Google AI Studio */}
          {isGoogleAIStudio && (
            <section>
              <GeminiWorkbench />
            </section>
          )}

          {/* Section 3: Verified Capabilities */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
              Verified Technical Capabilities
            </h2>
            <div className="flex flex-wrap gap-2">
              {resource.capabilities.map((cap) => (
                <div
                  key={cap}
                  className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-mono flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>{cap.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Supported Workflows (for platforms like Google AI Studio) */}
          {resource.supported_workflows && resource.supported_workflows.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
                Supported Development Workflows
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resource.supported_workflows.map((wf, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border border-neutral-800 bg-neutral-900/20 text-xs text-neutral-300 flex items-start gap-2.5"
                  >
                    <Workflow className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                    <span>{wf}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Relationships & Knowledge Graph Connections */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
              Verified Relationships & Interoperability
            </h2>
            {relationships.length > 0 ? (
              <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg bg-neutral-900/30">
                {relationships.map((rel) => {
                  const isSource = rel.source_slug === resource.slug;
                  const targetSlug = isSource ? rel.target_slug : rel.source_slug;

                  return (
                    <div key={rel.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-neutral-400">{resource.name}</span>
                          <span className="text-emerald-400 font-semibold uppercase text-[11px]">
                            → {rel.relationship_type.replace('_', ' ')} →
                          </span>
                          <button
                            onClick={() => onNavigateToResource(targetSlug)}
                            className="text-neutral-100 hover:text-emerald-400 font-semibold underline underline-offset-2 transition-colors"
                          >
                            {targetSlug}
                          </button>
                        </div>
                        <p className="text-neutral-400 leading-relaxed text-[11px]">
                          {rel.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                        <span className="text-neutral-500">
                          Confidence: {(rel.confidence * 100).toFixed(0)}%
                        </span>
                        {rel.evidence_url && (
                          <a
                            href={rel.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <span>Evidence</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-neutral-800 text-center text-xs text-neutral-500 font-mono">
                No verified relationships recorded yet.
              </div>
            )}
          </section>

          {/* Section 6: Dependencies & Documented Alternatives */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
              Dependencies & Frontier Alternatives
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-2">
                <span className="text-xs font-mono text-neutral-500">DEPENDENCIES</span>
                {resource.dependencies && resource.dependencies.length > 0 ? (
                  <ul className="text-xs text-neutral-300 space-y-1.5 font-mono list-disc list-inside">
                    {resource.dependencies.map((dep, idx) => (
                      <li key={idx} className="leading-relaxed">{dep}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500 font-mono italic">
                    No verified dependencies required.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-2">
                <span className="text-xs font-mono text-neutral-500">DOCUMENTED ALTERNATIVES</span>
                {resource.agent_contract.alternatives && resource.agent_contract.alternatives.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {resource.agent_contract.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => onNavigateToResource(alt)}
                        className="px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-mono border border-neutral-700/60 hover:border-neutral-600 transition-colors"
                      >
                        {alt} →
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 font-mono italic">
                    No verified alternatives documented.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 7: Provenance & Verification Audit Trail */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-mono">
              Provenance & Server Verification Audit
            </h2>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 font-mono text-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-neutral-500 block text-[11px]">SOURCE PROVIDER</span>
                  <span className="text-neutral-200 font-medium">{resource.provenance.source_provider}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">SOURCE TYPE</span>
                  <span className="text-neutral-200 font-medium capitalize">
                    {resource.provenance.source_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">SYNC STATUS</span>
                  <span className="text-emerald-400 font-medium uppercase">
                    {resource.provenance.sync_status}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">FIRST SEEN</span>
                  <span className="text-neutral-300 tabular-nums">
                    {new Date(resource.provenance.first_seen_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">LAST SEEN</span>
                  <span className="text-neutral-300 tabular-nums">
                    {new Date(resource.provenance.last_seen_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">LAST VERIFIED</span>
                  <span className="text-neutral-300 tabular-nums">
                    {new Date(resource.provenance.last_verified_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Authoritative Identifier: {resource.provenance.source_identifier}</span>
                <span className="text-neutral-400">Trust Score: {resource.trust_score}/100</span>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Agent Specification View (Structured JSON & Copyable Agent Prompt) */
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-900/60">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100 font-mono">
                Autonomous Agent Ingestion Manifest
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Standardized machine-readable contract for agent tool calling, planner context, and MCP servers.
              </p>
            </div>
            <button
              onClick={handleCopyAgentContract}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-mono font-medium transition-colors"
            >
              {copiedContract ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedContract ? 'Copied to Clipboard' : 'Copy Agent JSON'}</span>
            </button>
          </div>

          <div className="relative rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-neutral-300 leading-relaxed">
              {JSON.stringify(
                {
                  resource_schema_version: '2026.1',
                  slug: resource.slug,
                  name: resource.name,
                  type: resource.resource_type,
                  publisher: resource.publisher,
                  trust_score: resource.trust_score,
                  verification: resource.verification_status,
                  agent_contract: resource.agent_contract,
                  models: resource.models || [],
                  capabilities: resource.capabilities,
                  provenance: resource.provenance,
                  relationships: relationships.map(r => ({
                    type: r.relationship_type,
                    target: r.target_slug === resource.slug ? r.source_slug : r.target_slug,
                    evidence: r.evidence_url,
                    confidence: r.confidence
                  }))
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
