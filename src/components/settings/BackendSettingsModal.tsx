import { Check, CheckCircle2, Database, ExternalLink, RefreshCw, Server, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiClient, BackendStatus } from '../../services/apiClient';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackendStatusChange?: (connected: boolean) => void;
}

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
  onBackendStatusChange
}) => {
  const [apiUrl, setApiUrl] = useState('');
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(apiClient.getBaseUrl());
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await apiClient.checkHealth();
      setStatus(res);
      if (onBackendStatusChange) {
        onBackendStatusChange(res.connected);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSaveAndTest = async () => {
    apiClient.setBaseUrl(apiUrl);
    await checkConnection();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 space-y-6 p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-neutral-800 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 font-mono">
                AI Heaven Backend Configuration
              </h2>
              <p className="text-xs text-neutral-400">
                FastAPI · PostgreSQL · SQLAlchemy 2.0 ORM Integration
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="text-neutral-500 hover:text-neutral-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">BACKEND STATUS:</span>
            {checking ? (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Checking...</span>
              </span>
            ) : status?.connected ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected ({status.latencyMs}ms)</span>
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-500" />
                <span>Local Standalone Store (Authoritative Fallback Active)</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-500">
            Active Endpoint: {status?.baseUrl || 'Local Standalone Store'}
          </div>
          {status?.error && (
            <div className="text-[11px] text-amber-500/90 pt-1">
              Notice: {status.error}
            </div>
          )}
        </div>

        {/* API URL Config Form */}
        <div className="space-y-2 font-mono">
          <label className="block text-xs text-neutral-300 font-medium">
            FastAPI Server Base URL (VITE_API_URL / NEXT_PUBLIC_API_URL)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="e.g., https://api.aiheaven.internal or http://localhost:8000"
              className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
            <button
              onClick={handleSaveAndTest}
              disabled={checking}
              className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
            >
              Test & Save
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            When configured, AI Heaven issues live HTTP requests to your FastAPI endpoints with zero schema alterations. When unset or unreachable, it seamlessly queries the local verified dataset.
          </p>
        </div>

        {/* Architecture Mapping Notes */}
        <div className="border-t border-neutral-800 pt-4 space-y-2 text-xs">
          <div className="font-mono text-[11px] text-neutral-400 font-medium">
            COMPATIBILITY SPECIFICATION:
          </div>
          <ul className="text-[11px] text-neutral-400 space-y-1 font-mono list-disc list-inside">
            <li>GET /resources - Paginated resource listings with search filters</li>
            <li>GET /resources/:slug - Full resource document with agent contract</li>
            <li>GET /resources/:slug/relationships - Verified relationship edges</li>
            <li>GET /graph - Global knowledge graph node & edge collections</li>
            <li>GET /providers - Provider organizations registry</li>
          </ul>
        </div>

        <div className="border-t border-neutral-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200 transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
