import { ArrowUpRight, Cpu, FileJson, Layers, ShieldCheck } from 'lucide-react';
import React from 'react';
import { Resource } from '../../types/resource';
import { VerificationBadge } from '../common/VerificationBadge';

interface ResourceCardProps {
  resource: Resource;
  onSelect: (resource: Resource) => void;
  onOpenAgentSpec: (resource: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onSelect,
  onOpenAgentSpec
}) => {
  const isDemo = resource.provenance.is_demo_data;

  return (
    <div
      onClick={() => onSelect(resource)}
      className={`group relative flex flex-col justify-between border bg-neutral-900/40 p-5 rounded-lg transition-all cursor-pointer ${
        isDemo
          ? 'border-amber-900/40 hover:border-amber-600/60 bg-amber-950/10'
          : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70'
      }`}
    >
      <div>
        {/* Card Kicker / Unboxed Metadata with · separator */}
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="capitalize">{resource.resource_type.replace('_', ' ')}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>{resource.publisher}</span>
            {resource.context_limit && (
              <>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="tabular-nums">{(resource.context_limit / 1000).toLocaleString()}k ctx</span>
              </>
            )}
          </div>
          <VerificationBadge
            status={resource.verification_status}
            trustScore={resource.trust_score}
            isDemoData={isDemo}
            size="sm"
          />
        </div>

        {/* Primary Title */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-neutral-100 group-hover:text-emerald-400 transition-colors tracking-tight">
            {resource.name}
          </h3>
          <ArrowUpRight className="h-4 w-4 text-neutral-500 opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 transition-all shrink-0" />
        </div>

        {/* Summary */}
        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">
          {resource.summary || resource.description}
        </p>

        {/* Capabilities preview - Clean text with separators */}
        {resource.capabilities && resource.capabilities.length > 0 && (
          <div className="text-[11px] text-neutral-500 mb-4 line-clamp-1 font-mono">
            {resource.capabilities.slice(0, 4).join(' · ')}
            {resource.capabilities.length > 4 && ` · +${resource.capabilities.length - 4} more`}
          </div>
        )}
      </div>

      {/* Card Footer: Quick Actions */}
      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-3 font-mono text-[11px]">
          {resource.models && resource.models.length > 0 && (
            <span className="flex items-center gap-1 text-neutral-400">
              <Cpu className="h-3 w-3 text-neutral-500" />
              <span className="tabular-nums">{resource.models.length}</span> models
            </span>
          )}
          {resource.dependencies && resource.dependencies.length > 0 && (
            <span className="flex items-center gap-1 text-neutral-400">
              <Layers className="h-3 w-3 text-neutral-500" />
              <span className="tabular-nums">{resource.dependencies.length}</span> deps
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAgentSpec(resource);
          }}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors py-1 px-2 rounded hover:bg-neutral-800 font-mono"
          title="View autonomous agent contract specification"
        >
          <FileJson className="h-3.5 w-3.5" />
          <span>Agent Contract</span>
        </button>
      </div>
    </div>
  );
};
