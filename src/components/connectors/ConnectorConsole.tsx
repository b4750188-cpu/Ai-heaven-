import {
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Layers,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import React, { useState } from 'react';
import { gitHubSourceConnector } from '../../services/connectors/githubConnector';
import { googleAISourceConnector } from '../../services/connectors/googleAIConnector';
import { mcpSourceConnector } from '../../services/connectors/mcpConnector';
import { apiClient } from '../../services/apiClient';
import { IngestionResult, ISourceConnector } from '../../types/connector';
import { Resource } from '../../types/resource';

interface ConnectorConsoleProps {
  onSyncComplete?: (newResources: Resource[]) => void;
}

export const ConnectorConsole: React.FC<ConnectorConsoleProps> = ({
  onSyncComplete
}) => {
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('conn_google_ai');
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<IngestionResult | null>(null);

  const connectors: { connector: ISourceConnector; description: string }[] = [
    {
      connector: googleAISourceConnector,
      description: 'Official Google DeepMind & Google AI Developer documentation sync connector. Ingests Gemini models, context windows, and SDK bindings.'
    },
    {
      connector: gitHubSourceConnector,
      description: 'GitHub REST API connector indexing verified Google Gemini cookbooks, MCP repositories, and open source SDKs.'
    },
    {
      connector: mcpSourceConnector,
      description: 'Model Context Protocol (MCP) registry connector ingesting open standard tool specifications and server manifests.'
    }
  ];

  const activeEntry = connectors.find(c => c.connector.config.id === selectedConnectorId) || connectors[0];
  const activeConnector = activeEntry.connector;

  const handleRunSync = async () => {
    setIsRunning(true);
    try {
      // Attempt backend API sync first
      const serverResult = await apiClient.syncConnector(activeConnector.config.id);
      const result = serverResult || await activeConnector.sync();
      setLastResult(result);
      if (onSyncComplete && result.resources?.length > 0) {
        onSyncComplete(result.resources);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-6">
        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
          <span>AI HEAVEN INGESTION</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>SOURCE CONNECTOR ARCHITECTURE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 mt-1">
          Data Ingestion & Verification Pipeline
        </h1>
        <p className="text-sm text-neutral-400 mt-1.5 max-w-3xl leading-relaxed">
          Standardized <code className="text-xs text-emerald-400 bg-neutral-900 px-1 py-0.5 rounded font-mono">SourceConnector</code> pipeline executing discovery, fetching, schema normalization, deduplication, relationship extraction, and server verification audits.
        </p>
      </div>

      {/* Connector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connectors.map(({ connector, description }) => {
          const isSelected = connector.config.id === selectedConnectorId;
          return (
            <div
              key={connector.config.id}
              onClick={() => setSelectedConnectorId(connector.config.id)}
              className={`p-5 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-neutral-900/90 ring-1 ring-emerald-500/20'
                  : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                <span className="text-neutral-500">{connector.config.official_domain}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Authoritative</span>
                </span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-100">{connector.config.name}</h3>
              <p className="text-xs text-neutral-400 mt-2 line-clamp-3 leading-relaxed">
                {description}
              </p>
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Rate: {connector.config.rate_limit_per_minute} req/min</span>
                <span className="text-emerald-400">Active</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Connector Action Panel */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-neutral-500 uppercase">Selected Pipeline</div>
            <h2 className="text-lg font-bold text-neutral-100">{activeConnector.config.name}</h2>
            <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mt-1">
              <span>Target: {activeConnector.config.target_source}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>Whitelist: *.{activeConnector.config.official_domain}</span>
            </div>
          </div>

          <button
            onClick={handleRunSync}
            disabled={isRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 text-xs font-mono font-medium transition-colors"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Running Pipeline Steps...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Trigger Ingestion Sync</span>
              </>
            )}
          </button>
        </div>

        {/* Pipeline Execution Stages Visualization */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-neutral-800 font-mono text-[11px]">
          {['discover()', 'fetch()', 'normalize()', 'validate()', 'deduplicate()', 'extract_rels()', 'verify()', 'sync()'].map((stage, idx) => (
            <div key={stage} className="p-2 rounded bg-neutral-950 border border-neutral-800 text-center space-y-1">
              <span className="text-neutral-500 block text-[9px]">STEP 0{idx + 1}</span>
              <span className="text-neutral-300 font-semibold truncate block">{stage}</span>
            </div>
          ))}
        </div>

        {/* Execution Output Terminal */}
        {lastResult && (
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Pipeline Complete: {lastResult.normalized_count} Normalized · {lastResult.deduplicated_count} Deduplicated · {lastResult.relationships_extracted} Relationships</span>
              </span>
              <span>Duration: {new Date(lastResult.completed_at).toLocaleTimeString()}</span>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs max-h-64 overflow-y-auto space-y-1.5">
              {lastResult.logs.map((log, index) => {
                let color = 'text-neutral-400';
                if (log.level === 'success') color = 'text-emerald-400';
                if (log.level === 'warn') color = 'text-amber-400';
                if (log.level === 'error') color = 'text-rose-400';

                return (
                  <div key={index} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-neutral-600 shrink-0 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-neutral-500 uppercase text-[10px] w-14 shrink-0">
                      [{log.level}]
                    </span>
                    <span className={color}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
