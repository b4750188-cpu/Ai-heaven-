import { ExternalLink, ShieldCheck } from 'lucide-react';
import React from 'react';

interface FooterProps {
  onOpenBackendSettings: () => void;
  onNavigateGoogleAIStudio: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBackendSettings,
  onNavigateGoogleAIStudio
}) => {
  return (
    <footer className="w-full border-t border-neutral-900 bg-neutral-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-neutral-500">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-neutral-300 font-medium">
            <span>AI HEAVEN</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-neutral-400 font-normal">Universal AI Resource & Knowledge Graph</span>
          </div>
          <p className="text-neutral-500 max-w-xl">
            Neutral registry and interoperability layer connecting autonomous AI agents and engineers to verified models, tools, and developer platforms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-neutral-400">
          <button
            onClick={onNavigateGoogleAIStudio}
            className="hover:text-neutral-200 transition-colors inline-flex items-center gap-1"
          >
            <span>Google AI Studio Platform</span>
          </button>

          <button
            onClick={onOpenBackendSettings}
            className="hover:text-neutral-200 transition-colors"
          >
            <span>FastAPI Architecture</span>
          </button>

          <a
            href="https://ai.google.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors inline-flex items-center gap-1"
          >
            <span>Google AI Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors inline-flex items-center gap-1"
          >
            <span>MCP Standard</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-6 pt-4 border-t border-neutral-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-neutral-600 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
          <span>Server-Controlled Trust & Provenance Enforcement</span>
        </div>
        <div>
          <span>Strict Zero-Hallucination Metadata Standard</span>
        </div>
      </div>
    </footer>
  );
};
