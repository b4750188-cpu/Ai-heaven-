import { ExternalLink, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Provider, Resource } from '../../types/resource';

interface ProviderHubProps {
  providers: Provider[];
  resources: Resource[];
  onSelectResource: (resource: Resource) => void;
  onNavigateGoogleAIStudio: () => void;
}

export const ProviderHub: React.FC<ProviderHubProps> = ({
  providers,
  resources,
  onSelectResource,
  onNavigateGoogleAIStudio
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>('prov_google');

  const selectedProvider = providers.find(p => p.id === selectedProviderId) || providers[0];

  const providerResources = resources.filter(r => r.provider_id === selectedProvider.id);

  // Factual comparison matrix strictly based on documented technical parameters
  const comparisonData = [
    {
      provider: 'Google',
      primaryPlatform: 'Google AI Studio',
      flagshipModel: 'Gemini 1.5 Pro',
      maxContext: '2,097,152 tokens (2M)',
      modalities: 'Text, Audio, Video, Image, PDF, Code',
      codeExecution: 'Native Sandbox (Python)',
      functionCalling: 'Yes (Automatic & Any mode)',
      structuredOutput: 'Yes (JSON Schema & Pydantic)',
      pricingBase: '$3.50 / $10.50 per M tokens',
      slug: 'google-ai-studio'
    },
    {
      provider: 'Anthropic',
      primaryPlatform: 'Anthropic Console (Workbench)',
      flagshipModel: 'Claude 3.5 Sonnet',
      maxContext: '200,000 tokens (200k)',
      modalities: 'Text, Image',
      codeExecution: 'Via Computer Use / Client runner',
      functionCalling: 'Yes (Tool Use definition)',
      structuredOutput: 'Yes (JSON output format)',
      pricingBase: '$3.00 / $15.00 per M tokens',
      slug: 'claude-3-5-sonnet'
    },
    {
      provider: 'OpenAI',
      primaryPlatform: 'OpenAI Developer Platform',
      flagshipModel: 'GPT-4o',
      maxContext: '128,000 tokens (128k)',
      modalities: 'Text, Image, Audio',
      codeExecution: 'Code Interpreter (Assistants API)',
      functionCalling: 'Yes (Tools API)',
      structuredOutput: 'Yes (Strict mode JSON)',
      pricingBase: '$2.50 / $10.00 per M tokens',
      slug: 'gpt-4o'
    },
    {
      provider: 'Meta',
      primaryPlatform: 'Meta AI / Llama Ecosystem',
      flagshipModel: 'Llama 3.3 70B Instruct',
      maxContext: '131,072 tokens (128k)',
      modalities: 'Text, Code',
      codeExecution: 'Host environment dependent',
      functionCalling: 'Yes (Special token format)',
      structuredOutput: 'Yes (Grammar / Guided decoding)',
      pricingBase: 'Free open weights (Host compute)',
      slug: 'llama-3-3-70b'
    }
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6">
        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
          <span>AI HEAVEN ARCHITECTURE</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>PROVIDER DIRECTORY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 mt-1">
          Frontier AI Providers & Platforms
        </h1>
        <p className="text-sm text-neutral-400 mt-1.5 max-w-3xl leading-relaxed">
          Provider-neutral ecosystem indexing foundational model developers, platform studios, and standard bodies. Google AI Studio is represented under Google developer tooling alongside Anthropic, OpenAI, Meta, and open registries.
        </p>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-neutral-800/80 font-mono text-xs">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProviderId(p.id)}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              selectedProviderId === p.id
                ? 'border-emerald-400 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Selected Provider Card & Resources */}
      <div className="p-6 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-neutral-100">{selectedProvider.name}</h2>
              {selectedProvider.verified && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Organization</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
              {selectedProvider.description}
            </p>
            {selectedProvider.headquarters && (
              <div className="text-[11px] font-mono text-neutral-500 pt-1">
                HQ: {selectedProvider.headquarters} · Legal: {selectedProvider.legal_name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={selectedProvider.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-xs text-neutral-300 hover:text-neutral-100 transition-colors"
            >
              <span>Website</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={selectedProvider.documentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-xs text-neutral-300 hover:text-neutral-100 transition-colors"
            >
              <span>Portal Docs</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Resources Provided by this Provider */}
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>REGISTERED RESOURCES ({providerResources.length})</span>
            {selectedProvider.id === 'prov_google' && (
              <button
                onClick={onNavigateGoogleAIStudio}
                className="text-emerald-400 hover:underline"
              >
                Deep Dive: Google AI Studio →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {providerResources.map((res) => (
              <div
                key={res.id}
                onClick={() => onSelectResource(res)}
                className="p-3 rounded border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span className="capitalize">{res.resource_type.replace('_', ' ')}</span>
                  <span>{res.trust_score}/100</span>
                </div>
                <div className="text-sm font-semibold text-neutral-100 truncate">{res.name}</div>
                <div className="text-xs text-neutral-400 line-clamp-1">{res.summary}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Factual Technical Provider Comparison Matrix */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-100">
            Factual Technical Architecture Comparison
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Strictly documented parameters from official source documentation. No subjective scoring.
          </p>
        </div>

        <div className="border border-neutral-800 rounded-lg overflow-x-auto bg-neutral-900/30">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">Provider</th>
                <th className="py-2.5 px-4 font-medium">Prototyping / Platform</th>
                <th className="py-2.5 px-4 font-medium">Flagship Model</th>
                <th className="py-2.5 px-4 font-medium">Context Window</th>
                <th className="py-2.5 px-4 font-medium">Supported Modalities</th>
                <th className="py-2.5 px-4 font-medium">Code Sandbox</th>
                <th className="py-2.5 px-4 font-medium">Structured Output</th>
                <th className="py-2.5 px-4 font-medium">Official Rate / Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {comparisonData.map((row) => (
                <tr key={row.provider} className="hover:bg-neutral-800/20 transition-colors">
                  <td className="py-3 px-4 font-bold text-neutral-200">{row.provider}</td>
                  <td className="py-3 px-4 text-emerald-400">{row.primaryPlatform}</td>
                  <td className="py-3 px-4 text-neutral-200">{row.flagshipModel}</td>
                  <td className="py-3 px-4 tabular-nums text-neutral-300 font-semibold">{row.maxContext}</td>
                  <td className="py-3 px-4 text-neutral-400 text-[11px]">{row.modalities}</td>
                  <td className="py-3 px-4 text-neutral-300 text-[11px]">{row.codeExecution}</td>
                  <td className="py-3 px-4 text-neutral-300 text-[11px]">{row.structuredOutput}</td>
                  <td className="py-3 px-4 text-neutral-400 text-[11px]">{row.pricingBase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
