import { ArrowRight, FileJson, Search, ShieldCheck, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Resource } from '../../types/resource';
import { VerificationBadge } from '../common/VerificationBadge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  onSelectResource: (resource: Resource) => void;
  onOpenAgentSpec: (resource: Resource) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  resources,
  onSelectResource,
  onOpenAgentSpec
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return resources.slice(0, 6);
    }
    const q = query.toLowerCase().trim();
    return resources.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.publisher.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      r.capabilities.some(c => c.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [query, resources]);

  // Keyboard navigation: Escape, Up, Down, Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          onSelectResource(results[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectResource]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-neutral-950/80 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 border-b border-neutral-800 bg-neutral-950/60">
          <Search className="h-4 w-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search resources, models, APIs, SDKs, or protocols..."
            className="w-full bg-transparent py-4 pl-3 pr-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-500 hover:text-neutral-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-neutral-800/60 p-2">
          {results.length > 0 ? (
            results.map((res, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={res.id}
                  onClick={() => {
                    onSelectResource(res);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-neutral-800/80 text-neutral-100' : 'text-neutral-300 hover:bg-neutral-850'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                      <span className="capitalize">{res.resource_type.replace('_', ' ')}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span>{res.publisher}</span>
                      {res.context_limit && (
                        <>
                          <span aria-hidden="true" className="text-neutral-600">·</span>
                          <span className="tabular-nums font-semibold text-emerald-400">
                            {(res.context_limit / 1000).toLocaleString()}k ctx
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-semibold truncate text-neutral-100">
                      {res.name}
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {res.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <VerificationBadge
                      status={res.verification_status}
                      trustScore={res.trust_score}
                      isDemoData={res.provenance.is_demo_data}
                      size="sm"
                    />
                    <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'translate-x-1 text-emerald-400' : 'text-neutral-600'}`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500 font-mono">
              No matching resources found for "{query}".
            </div>
          )}
        </div>

        {/* Search Footer */}
        <div className="border-t border-neutral-800 px-4 py-2.5 bg-neutral-950/80 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span>Navigate with ↑ ↓ · Press Enter to open</span>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
};
