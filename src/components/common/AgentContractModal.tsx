import { Check, Copy, ExternalLink, FileJson, ShieldCheck, X } from 'lucide-react';
import React, { useState } from 'react';
import { Resource } from '../../types/resource';

interface AgentContractModalProps {
  resource: Resource | null;
  onClose: () => void;
  onNavigateDetail: (resource: Resource) => void;
}

export const AgentContractModal: React.FC<AgentContractModalProps> = ({
  resource,
  onClose,
  onNavigateDetail
}) => {
  const [copied, setCopied] = useState(false);

  if (!resource) return null;

  const handleCopy = () => {
    const payload = {
      ai_heaven_resource_id: resource.id,
      slug: resource.slug,
      name: resource.name,
      type: resource.resource_type,
      publisher: resource.publisher,
      trust_score: resource.trust_score,
      verification_status: resource.verification_status,
      provenance: resource.provenance,
      agent_contract: resource.agent_contract,
      models: resource.models || [],
      capabilities: resource.capabilities
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-neutral-800 text-emerald-400">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                Autonomous Agent Contract
              </div>
              <h2 className="text-base font-bold text-neutral-100 font-mono">
                {resource.name}
              </h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="text-neutral-500 hover:text-neutral-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contract Fields Highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950/60">
            <span className="text-neutral-500 block text-[10px]">AUTHENTICATION</span>
            <span className="text-neutral-200 uppercase font-semibold">
              {resource.agent_contract.authentication.type} ({resource.agent_contract.authentication.header_or_param})
            </span>
          </div>
          <div className="p-3 rounded border border-neutral-800 bg-neutral-950/60">
            <span className="text-neutral-500 block text-[10px]">COST MODEL</span>
            <span className="text-neutral-200">
              {resource.agent_contract.cost_model || 'Documented on provider portal'}
            </span>
          </div>
        </div>

        {/* Raw JSON View */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs max-h-72 overflow-y-auto">
          <pre className="text-neutral-300 leading-relaxed">
            {JSON.stringify(
              {
                slug: resource.slug,
                name: resource.name,
                publisher: resource.publisher,
                verification_status: resource.verification_status,
                trust_score: resource.trust_score,
                agent_contract: resource.agent_contract,
                capabilities: resource.capabilities
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
          <button
            onClick={() => {
              onNavigateDetail(resource);
              onClose();
            }}
            className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View Complete Resource Page</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-mono font-medium transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-mono transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
