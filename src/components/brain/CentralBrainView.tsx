/**
 * AI HEAVEN - Central Brain & Model Router Work Area
 * Real-time request classifier, model benchmark matrix, routing decision history,
 * and quota failover controls.
 */

import React, { useEffect, useState } from 'react';
import {
  Brain,
  Cpu,
  Layers,
  Zap,
  DollarSign,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Database,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface ModelSpec {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  inputCostPerM: number;
  outputCostPerM: number;
  avgLatencyMs: number;
  codingScore: number;
  reasoningScore: number;
  speedScore: number;
  isAvailable: boolean;
  recommendedFor: string[];
}

interface RoutingDecision {
  id: string;
  timestamp: string;
  query: string;
  detectedDomain: string;
  complexity: string;
  estimatedTokens: number;
  selectedModelId: string;
  selectedModelName: string;
  fallbackModelId: string;
  rationale: string;
  scores: {
    suitability: number;
    latencyWeight: number;
    costWeight: number;
    qualityScore: number;
  };
}

export const CentralBrainView: React.FC = () => {
  const [models, setModels] = useState<ModelSpec[]>([]);
  const [decisions, setDecisions] = useState<RoutingDecision[]>([]);
  const [quotas, setQuotas] = useState<any[]>([]);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'router' | 'models' | 'decisions' | 'quotas'>('router');

  useEffect(() => {
    loadBrainData();
  }, []);

  const loadBrainData = async () => {
    setIsLoading(true);
    try {
      const [modelsData, decisionsData, quotasData] = await Promise.all([
        apiClient.getBrainModels(),
        apiClient.getBrainDecisions(),
        apiClient.getQuotas()
      ]);
      setModels(modelsData);
      setDecisions(decisionsData);
      setQuotas(quotasData);
    } catch (err) {
      console.error('Failed to load brain data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;
    setIsClassifying(true);
    try {
      const res = await apiClient.classifyRequest(testPrompt.trim());
      setTestResult(res);
      // Refresh decision list
      const updatedDecisions = await apiClient.getBrainDecisions();
      setDecisions(updatedDecisions);
    } catch (err) {
      console.error('Classification error:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <span>AI Operating System</span>
            <span aria-hidden="true">·</span>
            <span>Subsystem 01</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">Active & Armed</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Brain className="h-6 w-6 text-blue-400" />
            Central Brain & Dynamic Model Router
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Autonomous routing engine evaluating task suitability, context depth, inference latency, token economics, and quota limits to select optimal model execution paths.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBrainData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Functional Segmented Control) */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('router')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'router'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Interactive Router Tester
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'models'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Calibrated Model Matrix ({models.length})
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'decisions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Decision Log ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'quotas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Provider Quotas & Failover
        </button>
      </div>

      {/* TAB 1: INTERACTIVE ROUTER */}
      {activeTab === 'router' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Query Classifier */}
          <div className="lg:col-span-6 bg-slate-900/40 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Live Request Classifier & Routing Simulator
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter any engineering prompt to observe domain classification, complexity calculation, token estimation, and the multi-criteria model selection algorithm.
            </p>

            <form onSubmit={handleTestClassify} className="space-y-3">
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="e.g. Audit PostgreSQL migrations, check concurrency locks, and run regression test suite..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTestPrompt('Refactor backend API endpoints, add strict input validation, and verify zero regressions')}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-mono underline"
                  >
                    Sample Coding
                  </button>
                  <span className="text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => setTestPrompt('Audit authorization boundaries for sensitive credentials and check for command injection vulnerabilities')}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-mono underline"
                  >
                    Sample Security
                  </button>
                  <span className="text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => setTestPrompt('ls -la workspace files and inspect latest git commits')}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-mono underline"
                  >
                    Sample Terminal
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isClassifying || !testPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {isClassifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Evaluate Route
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Metrics */}
            <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Total Models</div>
                <div className="text-base font-semibold font-mono text-slate-200 mt-0.5">{models.length}</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Available Quota</div>
                <div className="text-base font-semibold font-mono text-emerald-400 mt-0.5">100% Active</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Avg Decision Latency</div>
                <div className="text-base font-semibold font-mono text-blue-400 mt-0.5">&lt; 4ms</div>
              </div>
            </div>
          </div>

          {/* Right: Simulation Output */}
          <div className="lg:col-span-6 bg-slate-900/40 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              Routing Decision Output
            </h2>

            {testResult ? (
              <div className="space-y-4">
                {/* Result Summary Banner */}
                <div className="p-3.5 rounded-md bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                    <span className="text-blue-400 font-semibold uppercase">{testResult.domain} Domain</span>
                    <span>Complexity: {testResult.complexity}</span>
                    <span>Tokens: ~{testResult.estimatedTokens}</span>
                  </div>
                  <div className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    <span>Selected:</span>
                    <span className="text-emerald-400 font-mono">{testResult.recommendedModel.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {testResult.rationale}
                  </div>
                </div>

                {/* Model Comparison Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 border border-emerald-900/40 rounded">
                    <div className="text-[11px] text-emerald-400 font-mono mb-1">PRIMARY ROUTE</div>
                    <div className="font-semibold text-slate-200">{testResult.recommendedModel.name}</div>
                    <div className="text-slate-400 text-[11px] mt-1 space-y-0.5">
                      <div>Provider: {testResult.recommendedModel.provider}</div>
                      <div>Window: {testResult.recommendedModel.contextWindow.toLocaleString()} tokens</div>
                      <div>Coding Score: {testResult.recommendedModel.codingScore}/100</div>
                      <div>Avg Latency: {testResult.recommendedModel.avgLatencyMs}ms</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="text-[11px] text-slate-500 font-mono mb-1">FAILOVER TARGET</div>
                    <div className="font-semibold text-slate-300">{testResult.fallbackModel.name}</div>
                    <div className="text-slate-400 text-[11px] mt-1 space-y-0.5">
                      <div>Provider: {testResult.fallbackModel.provider}</div>
                      <div>Window: {testResult.fallbackModel.contextWindow.toLocaleString()} tokens</div>
                      <div>Cost / 1M Out: ${testResult.fallbackModel.outputCostPerM.toFixed(2)}</div>
                      <div>Speed Score: {testResult.fallbackModel.speedScore}/100</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded">
                <Brain className="h-8 w-8 mb-2 text-slate-600" />
                <p className="text-xs">No simulation executed yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Submit a prompt on the left to see routing logic in action.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MODEL MATRIX */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">{model.provider}</span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Available
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">{model.name}</h3>
                  <div className="text-xs text-slate-400 mt-1">
                    Context: <span className="font-mono text-slate-200">{model.contextWindow.toLocaleString()}</span> tokens
                  </div>

                  {/* Benchmark & Performance Scores */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Coding (SWE-bench / HumanEval)</span>
                        <span className="font-mono text-slate-200">{model.codingScore}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${model.codingScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Reasoning (GPQA / MMLU)</span>
                        <span className="font-mono text-slate-200">{model.reasoningScore}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${model.reasoningScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Inference Speed</span>
                        <span className="font-mono text-slate-200">{model.speedScore}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${model.speedScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Latency: ~{model.avgLatencyMs}ms</span>
                  <span>Cost: ${model.outputCostPerM.toFixed(2)}/M out</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT DECISION LOG */}
      {activeTab === 'decisions' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Historical Routing Decisions</h3>
            <span className="text-xs font-mono text-slate-500">{decisions.length} recorded</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {decisions.map((dec) => (
              <div key={dec.id} className="p-4 hover:bg-slate-850/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-400 font-semibold">{dec.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="uppercase text-[10px] text-slate-400 font-mono">{dec.detectedDomain}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-medium">{dec.selectedModelName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(dec.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-mono line-clamp-1 mb-1">
                  "{dec.query}"
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  {dec.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: QUOTAS & FAILOVER */}
      {activeTab === 'quotas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotas.map((q) => (
            <div key={q.providerId} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-200">{q.providerName}</span>
                <span className={`text-[11px] font-mono ${q.status === 'operational' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {q.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-400 mb-3">
                Active Account: <span className="font-mono text-slate-300">{q.activeAccount}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Requests / Minute</span>
                    <span className="font-mono">{q.requestsPerMinute} / {q.requestsLimit}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (q.requestsPerMinute / q.requestsLimit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                  <span>Failover Target:</span>
                  <span className="text-slate-300">{q.failoverTarget}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
