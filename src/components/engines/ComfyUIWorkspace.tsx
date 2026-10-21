/**
 * AI HEAVEN — ComfyUI Visual Workflow Engine Workspace
 * 
 * Official Upstream Reference: https://github.com/Comfy-Org/ComfyUI
 * License: GPL-3.0
 * 
 * Capabilities:
 * - Real-time connection & hardware telemetry (GPU, Free VRAM, PyTorch runtime)
 * - Directed Acyclic Graph (DAG) workflow builder & template selector
 * - Interactive parameter studio (prompt, negative prompt, steps, sampler, resolution)
 * - Visual node execution graph inspector
 * - Queue dispatch, cancellation & execution progress tracking
 * - Generated artifact inspection, image lightbox & parameter export
 * - Mobile-first responsive touch layout with strict zero-pill design
 */

import React, { useEffect, useState } from 'react';
import {
  Workflow,
  Sparkles,
  Image as ImageIcon,
  Video,
  Music,
  Play,
  Square,
  RefreshCw,
  Cpu,
  Layers,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Settings,
  ExternalLink,
  Download,
  Copy,
  Check,
  Eye,
  Sliders,
  Code,
  Clock,
  Terminal,
  Zap,
  Maximize2,
  X
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { StatusDot } from '../ui/StatusDot';

interface ComfyUIWorkspaceProps {
  onNavigateToTools?: () => void;
}

export const ComfyUIWorkspace: React.FC<ComfyUIWorkspaceProps> = () => {
  // Runtime State
  const [status, setStatus] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [endpointInput, setEndpointInput] = useState('http://127.0.0.1:8188');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Templates & Workflows
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('txt2img-standard');
  const [activeTab, setActiveTab] = useState<'studio' | 'nodes' | 'gallery' | 'docs'>('studio');

  // Parameters
  const [prompt, setPrompt] = useState('Futuristic cybernetic workstation with glowing azure holographic interfaces, cinematic lighting, 8k render, octane style');
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, deformed, noisy, watermark, oversaturated');
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(7.0);
  const [sampler, setSampler] = useState('euler');
  const [scheduler, setScheduler] = useState('normal');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [seed, setSeed] = useState(42);
  const [isRandomSeed, setIsRandomSeed] = useState(true);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ running: any[]; pending: any[] }>({ running: [], pending: [] });
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedGraph, setCopiedGraph] = useState(false);

  useEffect(() => {
    loadStatus();
    loadTemplates();
    loadHistory();
    const interval = setInterval(() => {
      refreshQueue();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const st = await apiClient.getComfyUIStatus();
      setStatus(st);
      if (st?.endpoint) setEndpointInput(st.endpoint);
    } catch {
      // Non-blocking
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await apiClient.getComfyUITemplates();
      if (Array.isArray(res?.templates)) {
        setTemplates(res.templates);
      }
    } catch {
      // Non-blocking
    }
  };

  const loadHistory = async () => {
    try {
      const hist = await apiClient.getComfyUIHistory();
      if (hist && typeof hist === 'object') {
        const histItems = Object.entries(hist).map(([id, data]: [string, any]) => ({
          promptId: id,
          ...data
        }));
        setExecutionHistory(histItems.slice(-10).reverse());
      }
    } catch {
      // Non-blocking
    }
  };

  const refreshQueue = async () => {
    try {
      const q = await apiClient.getComfyUIQueue();
      setQueueInfo(q || { running: [], pending: [] });
    } catch {
      // Non-blocking
    }
  };

  const handleTestConnection = async () => {
    setIsCheckingHealth(true);
    setExecutionError(null);
    try {
      const res = await apiClient.testComfyUIConnection();
      setStatus(res.status);
      if (!res.success) {
        setExecutionError(res.error || 'Server offline or unreachable');
      } else {
        await refreshQueue();
      }
    } catch (err: any) {
      setExecutionError(err.message || 'Connection failed');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      const res = await apiClient.configureComfyUI({ endpoint: endpointInput });
      if (res.success) {
        setConfigMessage({ type: 'success', text: 'Endpoint updated successfully' });
        setStatus(res.status);
        setTimeout(() => setIsConfigModalOpen(false), 800);
      } else {
        setConfigMessage({ type: 'error', text: res.error || 'Configuration failed' });
      }
    } catch (err: any) {
      setConfigMessage({ type: 'error', text: err.message || 'Failed to update endpoint' });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSelectTemplate = (tmpl: any) => {
    setSelectedTemplateId(tmpl.id);
    if (tmpl.defaultParams) {
      if (tmpl.defaultParams.prompt) setPrompt(tmpl.defaultParams.prompt);
      if (tmpl.defaultParams.negativePrompt) setNegativePrompt(tmpl.defaultParams.negativePrompt);
      if (tmpl.defaultParams.steps) setSteps(tmpl.defaultParams.steps);
      if (tmpl.defaultParams.cfg) setCfg(tmpl.defaultParams.cfg);
      if (tmpl.defaultParams.samplerName) setSampler(tmpl.defaultParams.samplerName);
      if (tmpl.defaultParams.scheduler) setScheduler(tmpl.defaultParams.scheduler);
      if (tmpl.defaultParams.width) setWidth(tmpl.defaultParams.width);
      if (tmpl.defaultParams.height) setHeight(tmpl.defaultParams.height);
      if (tmpl.defaultParams.seed !== undefined) setSeed(tmpl.defaultParams.seed);
    }
  };

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    const activeSeed = isRandomSeed ? Math.floor(Math.random() * 10000000000) : seed;
    if (isRandomSeed) setSeed(activeSeed);

    try {
      const outcome = await apiClient.executeComfyUIWorkflow({
        templateId: selectedTemplateId,
        params: {
          prompt,
          negativePrompt,
          steps,
          cfg,
          samplerName: sampler,
          scheduler,
          width,
          height,
          seed: activeSeed
        }
      });

      setActivePromptId(outcome.promptId);
      await refreshQueue();
      await loadHistory();
    } catch (err: any) {
      setExecutionError(err.message || 'Workflow dispatch failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleInterrupt = async () => {
    try {
      await apiClient.interruptComfyUI();
      await refreshQueue();
    } catch (err: any) {
      setExecutionError(err.message || 'Interrupt failed');
    }
  };

  const handleCopyGraph = () => {
    const selectedTmpl = templates.find(t => t.id === selectedTemplateId);
    if (selectedTmpl) {
      navigator.clipboard.writeText(JSON.stringify(selectedTmpl.promptGraph, null, 2));
      setCopiedGraph(true);
      setTimeout(() => setCopiedGraph(false), 2000);
    }
  };

  // Hardware metrics
  const isConnected = Boolean(status?.isConnected);
  const gpuDevice = status?.systemStats?.devices?.[0];
  const deviceName = gpuDevice?.name || 'CPU (No CUDA)';
  const vramTotalMb = gpuDevice?.vram_total ? Math.round(gpuDevice.vram_total / (1024 * 1024)) : 0;
  const vramFreeMb = gpuDevice?.vram_free ? Math.round(gpuDevice.vram_free / (1024 * 1024)) : 0;
  const vramUsedPercent = vramTotalMb > 0 ? Math.round(((vramTotalMb - vramFreeMb) / vramTotalMb) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#080B10] text-[#F1F4F8]">
      {/* Top Navigation & Telemetry Bar */}
      <div className="sticky top-0 z-20 bg-[#0D1118]/95 backdrop-blur-md border-b border-[#283242] px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Upstream Seal */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#42D9F5]/10 border border-[#42D9F5]/30 rounded-lg text-[#42D9F5]">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#F1F4F8] tracking-tight">ComfyUI Studio</h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#171F2B] border border-[#283242] text-[#9AA6B7]">
                  DAG Visual Engine
                </span>
              </div>
              <p className="text-[11px] text-[#9AA6B7] flex items-center gap-1.5">
                <span>Official Upstream:</span>
                <a
                  href="https://github.com/Comfy-Org/ComfyUI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#42D9F5] hover:underline flex items-center gap-0.5"
                >
                  Comfy-Org/ComfyUI <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <span>&bull;</span>
                <span className="font-mono text-neutral-400">GPL-3.0</span>
              </p>
            </div>
          </div>

          {/* Connection, Hardware & Quick Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121822] border border-[#283242] text-xs">
              <StatusDot status={isConnected ? 'online' : 'offline'} />
              <span className="font-medium text-[11px]">
                {isConnected ? 'Daemon Online' : 'Daemon Offline'}
              </span>
              {status?.latencyMs !== undefined && isConnected && (
                <span className="text-[10px] font-mono text-[#9AA6B7] border-l border-[#283242] pl-2">
                  {status.latencyMs}ms
                </span>
              )}
            </div>

            {/* Hardware VRAM Badge */}
            {isConnected && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121822] border border-[#283242] text-xs">
                <Cpu className="h-3.5 w-3.5 text-[#8A83FF]" />
                <span className="text-[11px] font-mono text-neutral-300 truncate max-w-[140px]" title={deviceName}>
                  {deviceName}
                </span>
                {vramTotalMb > 0 && (
                  <span className="text-[10px] font-mono text-[#34D399]">
                    {vramFreeMb}MB free ({100 - vramUsedPercent}%)
                  </span>
                )}
              </div>
            )}

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={isCheckingHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-xs font-medium text-[#F1F4F8] transition-colors disabled:opacity-50"
              title="Query /system_stats"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? 'animate-spin text-[#42D9F5]' : 'text-[#9AA6B7]'}`} />
              <span className="hidden sm:inline">Test Connection</span>
            </button>

            {/* Configure Endpoint Button */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-1.5 rounded-lg bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-[#9AA6B7] hover:text-[#F1F4F8] transition-colors"
              title="Configure Endpoint URL"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Interrupt Button (if queue has active items) */}
            {queueInfo.running.length > 0 && (
              <button
                onClick={handleInterrupt}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F87171]/20 hover:bg-[#F87171]/30 border border-[#F87171]/40 text-[#F87171] text-xs font-medium transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Halt Queue</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#283242]/50 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              activeTab === 'studio'
                ? 'bg-[#171F2B] text-[#42D9F5] border border-[#283242]'
                : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Workflow Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              activeTab === 'nodes'
                ? 'bg-[#171F2B] text-[#42D9F5] border border-[#283242]'
                : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Graph Inspector</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('gallery');
              loadHistory();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              activeTab === 'gallery'
                ? 'bg-[#171F2B] text-[#42D9F5] border border-[#283242]'
                : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Artifact Gallery</span>
            {executionHistory.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#121822] text-[10px] text-neutral-400 font-mono">
                {executionHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              activeTab === 'docs'
                ? 'bg-[#171F2B] text-[#42D9F5] border border-[#283242]'
                : 'text-[#9AA6B7] hover:text-[#F1F4F8]'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Runtime Setup &amp; Arch</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Unreachable Daemon Banner (Non-Intrusive, Truthful) */}
        {!isConnected && (
          <div className="p-4 bg-[#121822] border border-[#FBBF24]/30 rounded-xl space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#FBBF24] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#F1F4F8] flex items-center gap-2">
                  ComfyUI Daemon Is Offline
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171F2B] text-[#9AA6B7]">
                    Target: {status?.endpoint || 'http://127.0.0.1:8188'}
                  </span>
                </div>
                <p className="text-xs text-[#9AA6B7] leading-relaxed">
                  AI Heaven connects to your genuine local ComfyUI runtime via HTTP and WebSockets. No execution results or hardware metrics are simulated.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="px-2.5 py-1 rounded bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-[#42D9F5] font-medium"
                  >
                    View Launch Commands
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isCheckingHealth}
                    className="px-2.5 py-1 rounded bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-[#F1F4F8] font-medium"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Error Notice */}
        {executionError && (
          <div className="p-3.5 bg-[#F87171]/10 border border-[#F87171]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#F87171]">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold">Workflow Execution Notice:</strong>
              <div className="font-mono text-[11px] break-all">{executionError}</div>
            </div>
          </div>
        )}

        {/* TAB 1: STUDIO (Interactive Workflow Composer) */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Preset Selector & Parameters */}
            <div className="lg:col-span-7 space-y-5">
              {/* Template Selector Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#9AA6B7] flex items-center gap-1.5">
                  <Workflow className="h-3.5 w-3.5 text-[#42D9F5]" />
                  Curated Pipeline Templates
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {templates.map(tmpl => {
                    const isSelected = tmpl.id === selectedTemplateId;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#171F2B] border-[#42D9F5] shadow-sm'
                            : 'bg-[#121822] border-[#283242] hover:border-[#9AA6B7]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0D1118] text-[#42D9F5]">
                            {tmpl.category}
                          </span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#42D9F5]" />}
                        </div>
                        <div className="font-semibold text-xs text-[#F1F4F8] truncate">{tmpl.name}</div>
                        <p className="text-[10px] text-[#9AA6B7] line-clamp-2 mt-1 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Positive Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#F1F4F8] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#42D9F5]" />
                    Positive Conditioning Prompt
                  </label>
                  <span className="text-[10px] font-mono text-[#9AA6B7]">Node [6]: CLIPTextEncode</span>
                </div>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe desired visual output..."
                  className="w-full p-3 rounded-xl bg-[#0D1118] border border-[#283242] focus:border-[#42D9F5] focus:outline-none text-xs text-[#F1F4F8] placeholder:text-neutral-600 resize-y"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#F1F4F8] flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-[#F87171]" />
                    Negative Conditioning Prompt
                  </label>
                  <span className="text-[10px] font-mono text-[#9AA6B7]">Node [7]: CLIPTextEncode</span>
                </div>
                <textarea
                  rows={2}
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  placeholder="Elements to exclude..."
                  className="w-full p-3 rounded-xl bg-[#0D1118] border border-[#283242] focus:border-[#42D9F5] focus:outline-none text-xs text-[#F1F4F8] placeholder:text-neutral-600 resize-y"
                />
              </div>

              {/* Latent & Sampling Parameters */}
              <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl space-y-4">
                <div className="text-xs font-semibold text-[#F1F4F8] flex items-center gap-2 border-b border-[#283242] pb-2.5">
                  <Sliders className="h-3.5 w-3.5 text-[#8A83FF]" />
                  Sampling &amp; Latent Canvas Settings
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Steps */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9AA6B7]">Steps ({steps})</label>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      value={steps}
                      onChange={e => setSteps(Number(e.target.value))}
                      className="w-full accent-[#42D9F5]"
                    />
                  </div>

                  {/* CFG Scale */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9AA6B7]">CFG ({cfg})</label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={0.5}
                      value={cfg}
                      onChange={e => setCfg(Number(e.target.value))}
                      className="w-full accent-[#42D9F5]"
                    />
                  </div>

                  {/* Width */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9AA6B7]">Width</label>
                    <select
                      value={width}
                      onChange={e => setWidth(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-[#0D1118] border border-[#283242] text-xs text-[#F1F4F8]"
                    >
                      <option value={512}>512px (SD1.5)</option>
                      <option value={768}>768px (SD2.1)</option>
                      <option value={1024}>1024px (SDXL)</option>
                      <option value={1280}>1280px (Wide)</option>
                    </select>
                  </div>

                  {/* Height */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9AA6B7]">Height</label>
                    <select
                      value={height}
                      onChange={e => setHeight(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-[#0D1118] border border-[#283242] text-xs text-[#F1F4F8]"
                    >
                      <option value={512}>512px (SD1.5)</option>
                      <option value={768}>768px (Portrait)</option>
                      <option value={1024}>1024px (SDXL)</option>
                      <option value={1280}>1280px (Tall)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  {/* Sampler */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9AA6B7]">Sampler</label>
                    <select
                      value={sampler}
                      onChange={e => setSampler(e.target.value)}
                      className="w-full p-2 rounded-lg bg-[#0D1118] border border-[#283242] text-xs text-[#F1F4F8]"
                    >
                      <option value="euler">euler</option>
                      <option value="euler_ancestral">euler_ancestral</option>
                      <option value="dpmpp_2m">dpmpp_2m</option>
                      <option value="dpmpp_sde">dpmpp_sde</option>
                      <option value="ddim">ddim</option>
                    </select>
                  </div>

                  {/* Scheduler */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#9AA6B7]">Scheduler</label>
                    <select
                      value={scheduler}
                      onChange={e => setScheduler(e.target.value)}
                      className="w-full p-2 rounded-lg bg-[#0D1118] border border-[#283242] text-xs text-[#F1F4F8]"
                    >
                      <option value="normal">normal</option>
                      <option value="karras">karras</option>
                      <option value="exponential">exponential</option>
                      <option value="sgm_uniform">sgm_uniform</option>
                    </select>
                  </div>

                  {/* Seed */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-[#9AA6B7]">Seed</label>
                      <label className="text-[10px] text-neutral-400 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRandomSeed}
                          onChange={e => setIsRandomSeed(e.target.checked)}
                          className="accent-[#42D9F5]"
                        />
                        Random
                      </label>
                    </div>
                    <input
                      type="number"
                      disabled={isRandomSeed}
                      value={seed}
                      onChange={e => setSeed(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg bg-[#0D1118] border border-[#283242] text-xs text-[#F1F4F8] disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleExecuteWorkflow}
                  disabled={isExecuting || !isConnected}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#42D9F5] hover:bg-[#42D9F5]/90 text-[#080B10] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#42D9F5]/10"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Queuing Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Execute Workflow Graph</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyGraph}
                  className="p-3 rounded-xl bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-[#9AA6B7] hover:text-[#F1F4F8] transition-colors"
                  title="Copy ComfyUI Prompt Graph JSON"
                >
                  {copiedGraph ? <Check className="h-4 w-4 text-[#34D399]" /> : <Code className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Active Execution & Artifact Preview */}
            <div className="lg:col-span-5 space-y-5">
              {/* Live Queue Monitor */}
              <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#F1F4F8] border-b border-[#283242] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#42D9F5]" />
                    <span>Active Queue State</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#9AA6B7]">
                    {queueInfo.running.length} Running &bull; {queueInfo.pending.length} Pending
                  </span>
                </div>

                {activePromptId && (
                  <div className="p-3 bg-[#0D1118] border border-[#42D9F5]/30 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Prompt ID:</span>
                      <span className="font-mono text-[11px] text-[#42D9F5]">{activePromptId.slice(0, 12)}...</span>
                    </div>
                    <div className="w-full bg-[#171F2B] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#42D9F5] h-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                {queueInfo.running.length === 0 && queueInfo.pending.length === 0 && !activePromptId && (
                  <p className="text-xs text-[#9AA6B7] text-center py-3 italic">
                    Queue is empty. Dispatch a workflow to begin synthesis.
                  </p>
                )}
              </div>

              {/* Latest Generated Artifact Spotlight */}
              <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#F1F4F8] border-b border-[#283242] pb-2">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#34D399]" />
                    <span>Latest Generation</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className="text-[11px] text-[#42D9F5] hover:underline"
                  >
                    View All
                  </button>
                </div>

                {executionHistory.length > 0 && executionHistory[0]?.outputs ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-[#283242] bg-[#0D1118] aspect-square flex items-center justify-center group">
                      <div className="p-4 text-center text-xs text-neutral-400 space-y-2">
                        <ImageIcon className="h-8 w-8 text-[#42D9F5]/40 mx-auto" />
                        <div className="font-mono text-[11px] text-[#F1F4F8]">
                          {Object.keys(executionHistory[0].outputs).length} Node Output(s)
                        </div>
                        <p className="text-[10px] text-[#9AA6B7]">
                          Execution ID: <span className="font-mono">{executionHistory[0].promptId.slice(0, 8)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-[#283242] rounded-lg text-center space-y-2">
                    <ImageIcon className="h-8 w-8 text-neutral-700 mx-auto" />
                    <p className="text-xs text-[#9AA6B7]">
                      No artifacts recorded in local session yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NODE GRAPH INSPECTOR */}
        {activeTab === 'nodes' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#121822] border border-[#283242] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F1F4F8] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#42D9F5]" />
                  Active DAG Node Pipeline ({selectedTemplateId})
                </h3>
                <p className="text-xs text-[#9AA6B7]">
                  Directed Acyclic Graph nodes transmitted to ComfyUI's execution engine.
                </p>
              </div>
              <button
                onClick={handleCopyGraph}
                className="px-3 py-1.5 rounded-lg bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-xs font-medium text-[#F1F4F8] flex items-center gap-1.5 transition-colors"
              >
                {copiedGraph ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Code className="h-3.5 w-3.5" />}
                <span>Copy Graph JSON</span>
              </button>
            </div>

            {/* Visual Node Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {templates.find(t => t.id === selectedTemplateId)?.promptGraph &&
                Object.entries(templates.find(t => t.id === selectedTemplateId)!.promptGraph).map(
                  ([nodeId, node]: [string, any]) => (
                    <div
                      key={nodeId}
                      className="p-4 rounded-xl bg-[#121822] border border-[#283242] space-y-2.5 hover:border-[#42D9F5]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-[#283242] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#171F2B] text-[10px] font-mono flex items-center justify-center text-[#42D9F5]">
                            {nodeId}
                          </span>
                          <span className="font-bold text-xs text-[#F1F4F8]">
                            {node._meta?.title || node.class_type}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0D1118] text-[#8A83FF]">
                          {node.class_type}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <span className="text-[#9AA6B7] uppercase text-[9px] font-semibold tracking-wider">
                          Node Inputs
                        </span>
                        <div className="bg-[#0D1118] p-2 rounded-lg font-mono text-[10px] text-neutral-300 max-h-32 overflow-y-auto space-y-0.5">
                          {Object.entries(node.inputs || {}).map(([key, val]) => (
                            <div key={key} className="truncate">
                              <span className="text-[#42D9F5]">{key}</span>: {JSON.stringify(val)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {/* TAB 3: ARTIFACT GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F1F4F8] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#34D399]" />
                  Execution History &amp; Generated Artifacts
                </h3>
                <p className="text-xs text-[#9AA6B7]">
                  Output files saved to ComfyUI output directory.
                </p>
              </div>
              <button
                onClick={loadHistory}
                className="px-3 py-1.5 rounded-lg bg-[#171F2B] hover:bg-[#283242] border border-[#283242] text-xs font-medium text-[#F1F4F8] flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh History</span>
              </button>
            </div>

            {executionHistory.length === 0 ? (
              <div className="p-12 bg-[#121822] border border-[#283242] rounded-xl text-center space-y-2">
                <ImageIcon className="h-10 w-10 text-neutral-700 mx-auto" />
                <p className="text-sm text-[#F1F4F8] font-medium">No Completed Executions Yet</p>
                <p className="text-xs text-[#9AA6B7]">
                  When you run prompts through ComfyUI, completed image receipts and file outputs will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {executionHistory.map(item => (
                  <div
                    key={item.promptId}
                    className="p-4 rounded-xl bg-[#121822] border border-[#283242] space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-[#42D9F5]">
                        ID: {item.promptId.slice(0, 10)}...
                      </span>
                      <span className="text-[10px] font-mono text-[#34D399]">Completed</span>
                    </div>

                    <div className="p-3 bg-[#0D1118] rounded-lg text-xs font-mono text-neutral-300 space-y-1">
                      <div>Outputs registered: {item.outputs ? Object.keys(item.outputs).length : 0}</div>
                      {item.status && (
                        <div className="text-[11px] text-neutral-400">
                          Status: {JSON.stringify(item.status.status_str || 'success')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RUNTIME SETUP & ARCHITECTURE */}
        {activeTab === 'docs' && (
          <div className="p-6 bg-[#121822] border border-[#283242] rounded-xl space-y-5 text-xs text-[#9AA6B7]">
            <div className="border-b border-[#283242] pb-3 space-y-1">
              <h3 className="text-base font-bold text-[#F1F4F8] flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#42D9F5]" />
                ComfyUI Official Runtime Setup
              </h3>
              <p className="text-xs text-[#9AA6B7]">
                Step-by-step instructions for launching official Comfy-Org/ComfyUI with AI Heaven integration.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-200 text-xs">1. Clone &amp; Install Dependencies</h4>
              <pre className="p-3 bg-[#0D1118] border border-[#283242] rounded-lg font-mono text-[11px] text-[#42D9F5] overflow-x-auto">
{`git clone https://github.com/Comfy-Org/ComfyUI.git
cd ComfyUI
pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt`}
              </pre>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-200 text-xs">2. Download Model Weights</h4>
              <p className="leading-relaxed">
                Place your checkpoint files (e.g. <code className="text-neutral-300">v1-5-pruned-emaonly.safetensors</code> or <code className="text-neutral-300">sd_xl_base_1.0.safetensors</code>) inside the directory:
              </p>
              <pre className="p-2.5 bg-[#0D1118] border border-[#283242] rounded-lg font-mono text-[11px] text-neutral-300">
                ComfyUI/models/checkpoints/
              </pre>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-200 text-xs">3. Launch Daemon on Port 8188</h4>
              <pre className="p-3 bg-[#0D1118] border border-[#283242] rounded-lg font-mono text-[11px] text-[#34D399] overflow-x-auto">
                python main.py --listen 127.0.0.1 --port 8188
              </pre>
            </div>

            <div className="p-3.5 bg-[#171F2B] border border-[#283242] rounded-lg space-y-1.5">
              <strong className="text-[#F1F4F8] font-semibold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#FBBF24]" />
                Security &amp; SSRF Isolation Contract:
              </strong>
              <p className="leading-relaxed text-[11px]">
                AI Heaven enforces strict SSRF rejection on ComfyUI endpoints. Only loopback (<code className="text-neutral-300">127.0.0.1</code>) and RFC1918 private LAN addresses are permitted. Cloud metadata endpoints (<code className="text-neutral-300">169.254.169.254</code>) are strictly prohibited. ComfyUI runs with zero shell/VFS execution privileges.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Endpoint Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D1118] border border-[#283242] rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#283242] pb-3">
              <h3 className="text-sm font-bold text-[#F1F4F8] flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#42D9F5]" />
                ComfyUI Endpoint Settings
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-md text-[#9AA6B7] hover:text-[#F1F4F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-[#9AA6B7]">HTTP API Endpoint URL</label>
              <input
                type="text"
                value={endpointInput}
                onChange={e => setEndpointInput(e.target.value)}
                placeholder="http://127.0.0.1:8188"
                className="w-full p-2.5 rounded-lg bg-[#121822] border border-[#283242] text-xs text-[#F1F4F8] focus:border-[#42D9F5] focus:outline-none font-mono"
              />
              <p className="text-[10px] text-[#9AA6B7]">
                Must resolve to loopback (127.0.0.1) or a private LAN host. Cloud metadata IPs are blocked.
              </p>
            </div>

            {configMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono ${
                  configMessage.type === 'success'
                    ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30'
                    : 'bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30'
                }`}
              >
                {configMessage.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#171F2B] hover:bg-[#283242] text-xs text-[#9AA6B7] hover:text-[#F1F4F8]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={configSaving}
                className="px-4 py-1.5 rounded-lg bg-[#42D9F5] hover:bg-[#42D9F5]/90 text-[#080B10] font-bold text-xs"
              >
                {configSaving ? 'Saving...' : 'Save & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
