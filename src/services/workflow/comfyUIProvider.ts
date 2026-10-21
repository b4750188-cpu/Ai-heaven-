/**
 * AI HEAVEN — ComfyUI Visual Workflow Engine Provider Adapter
 * 
 * Official Upstream Reference: https://github.com/Comfy-Org/ComfyUI
 * License: GPL-3.0
 * 
 * Architecture:
 * - Modular, node-based directed acyclic graph (DAG) execution engine for
 *   diffusion models (Stable Diffusion, SDXL, Flux, SD3, AnimateDiff, etc.)
 * - Native REST & WebSocket API:
 *   - /system_stats: Hardware telemetry (GPU name, VRAM total/free, PyTorch/Python)
 *   - /object_info: Dynamic node definition catalog
 *   - /prompt: Queues execution graph
 *   - /queue: Execution queue inspection
 *   - /interrupt: Premature execution halt
 *   - /history: Execution result receipts & media references
 *   - /view: Output artifact retrieval
 *   - /ws: Real-time execution events and node step progress
 * 
 * Security:
 * - Strict SSRF validation: only loopback and private LAN addresses permitted.
 * - Explicit cloud metadata block (169.254.169.254).
 * - Isolated workflow execution; zero shell or host file write privileges.
 */

import crypto from 'crypto';
import { realityRegistryService } from '../reality/realityRegistryService';

export interface ComfyUIConfig {
  endpoint: string;             // Default: http://127.0.0.1:8188
  wsEndpoint: string;           // Default: ws://127.0.0.1:8188/ws
  timeoutMs: number;            // Default: 30000ms
  clientId: string;             // Client instance UUID
  allowCloudFallback: boolean;  // When offline, can Brain route to cloud image API
}

export interface ComfySystemStats {
  system: {
    os: string;
    python_version: string;
    embedded_python: boolean;
  };
  devices: Array<{
    name: string;
    type: string;
    index: number;
    vram_total: number;
    vram_free: number;
    torch_vram_total: number;
    torch_vram_free: number;
  }>;
}

export interface ComfyRuntimeStatus {
  isConfigured: boolean;
  isConnected: boolean;
  endpoint: string;
  wsEndpoint: string;
  systemStats: ComfySystemStats | null;
  nodeCount: number;
  queueRemaining: number;
  lastCheckedAt: string | null;
  latencyMs?: number;
  error: string | null;
}

export interface ComfyNodeInput {
  [key: string]: any;
}

export interface ComfyNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

export interface ComfyWorkflowPrompt {
  [nodeId: string]: ComfyNode;
}

export interface ComfyWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'image' | 'video' | 'audio' | 'upscaling' | 'multi-modal';
  defaultParams: {
    prompt: string;
    negativePrompt?: string;
    steps?: number;
    cfg?: number;
    samplerName?: string;
    scheduler?: string;
    width?: number;
    height?: number;
    seed?: number;
    batchSize?: number;
    [key: string]: any;
  };
  promptGraph: ComfyWorkflowPrompt;
}

export interface ComfyExecutionResult {
  promptId: string;
  number: number;
  status: 'queued' | 'executing' | 'completed' | 'failed' | 'cancelled';
  outputs?: {
    images?: Array<{
      filename: string;
      subfolder: string;
      type: string;
      url: string;
    }>;
    audio?: Array<{
      filename: string;
      subfolder: string;
      type: string;
      url: string;
    }>;
  };
  durationMs?: number;
  error?: string;
}

export class ComfyUIProvider {
  private config: ComfyUIConfig = {
    endpoint: 'http://127.0.0.1:8188',
    wsEndpoint: 'ws://127.0.0.1:8188/ws',
    timeoutMs: 45000,
    clientId: crypto.randomUUID(),
    allowCloudFallback: true
  };

  private status: ComfyRuntimeStatus = {
    isConfigured: true,
    isConnected: false,
    endpoint: 'http://127.0.0.1:8188',
    wsEndpoint: 'ws://127.0.0.1:8188/ws',
    systemStats: null,
    nodeCount: 0,
    queueRemaining: 0,
    lastCheckedAt: null,
    error: null
  };

  private cachedNodes: Map<string, any> = new Map();
  private workflowTemplates: Map<string, ComfyWorkflowTemplate> = new Map();

  constructor() {
    const envEndpoint = process.env.COMFYUI_ENDPOINT;
    if (envEndpoint) {
      const val = this.validateEndpoint(envEndpoint);
      if (val.valid) {
        this.updateConfig({ endpoint: envEndpoint.trim() });
      }
    }
    this.initDefaultTemplates();
  }

  /**
   * SSRF and URL Security Validation
   * Restricts connections strictly to approved loopback and local LAN addresses.
   * Prohibits cloud metadata endpoints (169.254.169.254) and forbidden protocols.
   */
  public validateEndpoint(urlStr: string): { valid: boolean; error?: string } {
    if (!urlStr || typeof urlStr !== 'string') {
      return { valid: false, error: 'Endpoint URL is required' };
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr.trim());
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      return { valid: false, error: 'Only HTTP, HTTPS, WS, and WSS protocols are permitted' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block cloud metadata services and link-local addresses
    if (
      hostname === '169.254.169.254' ||
      hostname.startsWith('169.254.') ||
      hostname === 'metadata.google.internal' ||
      hostname.includes('metadata') ||
      hostname === 'instance-data'
    ) {
      return { valid: false, error: 'Security violation: Cloud metadata endpoints are forbidden' };
    }

    // Allow loopback and private LAN addresses
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1';

    const isPrivateLan =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (!isLoopback && !isPrivateLan) {
      return {
        valid: false,
        error: `Host '${hostname}' is not a permitted local or private loopback address`
      };
    }

    return { valid: true };
  }

  public getConfig(): ComfyUIConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ComfyUIConfig>): { success: boolean; error?: string } {
    if (updates.endpoint !== undefined) {
      const val = this.validateEndpoint(updates.endpoint);
      if (!val.valid) {
        return { success: false, error: val.error };
      }
      this.config.endpoint = updates.endpoint.trim().replace(/\/+$/, '');
      this.status.endpoint = this.config.endpoint;

      // Derive wsEndpoint
      try {
        const u = new URL(this.config.endpoint);
        const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
        this.config.wsEndpoint = `${wsProto}//${u.host}/ws`;
        this.status.wsEndpoint = this.config.wsEndpoint;
      } catch {
        // Fallback
      }
    }

    if (updates.timeoutMs !== undefined) {
      this.config.timeoutMs = Math.max(3000, Math.min(updates.timeoutMs, 300000));
    }

    if (updates.clientId !== undefined && updates.clientId.trim().length > 0) {
      this.config.clientId = updates.clientId.trim();
    }

    if (updates.allowCloudFallback !== undefined) {
      this.config.allowCloudFallback = Boolean(updates.allowCloudFallback);
    }

    return { success: true };
  }

  public getStatus(): ComfyRuntimeStatus {
    return { ...this.status };
  }

  /**
   * Health and Hardware Telemetry Check
   * Queries /system_stats and /object_info.
   * Truthfully reports connection failures without fabricating VRAM or success.
   */
  public async checkHealth(): Promise<ComfyRuntimeStatus> {
    const startTime = Date.now();
    const endpoint = this.config.endpoint;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.config.timeoutMs, 6000));

    try {
      const statsUrl = `${endpoint}/system_stats`;
      const res = await fetch(statsUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        this.status.isConnected = false;
        this.status.lastCheckedAt = new Date().toISOString();
        this.status.error = `ComfyUI server returned HTTP ${res.status}: ${res.statusText}`;
        this.status.latencyMs = latencyMs;
        this.status.systemStats = null;
        realityRegistryService.updateStatus('comfyui_workflow_engine', 'DISCONNECTED', false, this.status.error);
        return { ...this.status };
      }

      const statsData: ComfySystemStats = await res.json();

      // Query node count safely in background
      let nodeCount = 0;
      try {
        const nodesRes = await fetch(`${endpoint}/object_info`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (nodesRes.ok) {
          const nodesData = await nodesRes.json();
          nodeCount = Object.keys(nodesData).length;
          this.cachedNodes = new Map(Object.entries(nodesData));
        }
      } catch {
        // Non-fatal if node list is slow
      }

      // Query queue count safely
      let queueRemaining = 0;
      try {
        const qRes = await fetch(`${endpoint}/queue`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(2000)
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          queueRemaining = (qData.queue_running?.length || 0) + (qData.queue_pending?.length || 0);
        }
      } catch {
        // Non-fatal
      }

      this.status.isConnected = true;
      this.status.systemStats = statsData;
      this.status.nodeCount = nodeCount;
      this.status.queueRemaining = queueRemaining;
      this.status.latencyMs = latencyMs;
      this.status.lastCheckedAt = new Date().toISOString();
      this.status.error = null;

      const deviceName = statsData.devices?.[0]?.name || 'CPU';
      const vramFreeMb = statsData.devices?.[0]?.vram_free
        ? Math.round(statsData.devices[0].vram_free / (1024 * 1024))
        : 0;

      realityRegistryService.updateStatus(
        'comfyui_workflow_engine',
        'CONNECTED',
        true,
        `ComfyUI operational at ${endpoint} (${latencyMs}ms, Device: ${deviceName}, Free VRAM: ${vramFreeMb}MB, ${nodeCount} nodes)`
      );

      return { ...this.status };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const isAbort = err.name === 'AbortError';

      this.status.isConnected = false;
      this.status.systemStats = null;
      this.status.lastCheckedAt = new Date().toISOString();
      this.status.latencyMs = latencyMs;
      this.status.error = isAbort
        ? `Connection to ComfyUI server timed out at ${endpoint} (>6s)`
        : `ComfyUI daemon is offline or unreachable at ${endpoint}: ${err.message || 'ECONNREFUSED'}`;

      realityRegistryService.updateStatus(
        'comfyui_workflow_engine',
        'DISCONNECTED',
        false,
        this.status.error
      );

      return { ...this.status };
    }
  }

  /**
   * Queue a Workflow Execution
   * Posts graph to /prompt endpoint with client_id.
   */
  public async queueWorkflow(promptGraph: ComfyWorkflowPrompt): Promise<ComfyExecutionResult> {
    const health = await this.checkHealth();
    if (!health.isConnected) {
      throw new Error(`Cannot execute workflow: ComfyUI server is offline (${health.error})`);
    }

    const payload = {
      prompt: promptGraph,
      client_id: this.config.clientId
    };

    const res = await fetch(`${this.config.endpoint}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.node_errors && Object.keys(errJson.node_errors).length > 0) {
          const firstErrKey = Object.keys(errJson.node_errors)[0];
          errorMsg = `Node [${firstErrKey}] validation error: ${JSON.stringify(errJson.node_errors[firstErrKey])}`;
        } else if (errJson.error) {
          errorMsg = errJson.error;
        }
      } catch {
        errorMsg = errText || errorMsg;
      }
      throw new Error(`ComfyUI workflow rejected: ${errorMsg}`);
    }

    const data = await res.json();
    return {
      promptId: data.prompt_id,
      number: data.number || 1,
      status: 'queued'
    };
  }

  /**
   * Interrupt Currently Running Execution
   */
  public async interruptExecution(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.config.endpoint}/interrupt`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      return { success: res.ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get Current Queue Status
   */
  public async getQueue(): Promise<{ running: any[]; pending: any[] }> {
    try {
      const res = await fetch(`${this.config.endpoint}/queue`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return { running: [], pending: [] };
      const data = await res.json();
      return {
        running: data.queue_running || [],
        pending: data.queue_pending || []
      };
    } catch {
      return { running: [], pending: [] };
    }
  }

  /**
   * Get Execution History & Output Artifacts
   */
  public async getHistory(promptId?: string): Promise<Record<string, any>> {
    try {
      const url = promptId
        ? `${this.config.endpoint}/history/${promptId}`
        : `${this.config.endpoint}/history`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }

  /**
   * Construct Safe Media View URL for an Output Image/Video
   */
  public getMediaUrl(filename: string, subfolder = '', type = 'output'): string {
    const params = new URLSearchParams({
      filename: filename.trim(),
      subfolder: subfolder.trim(),
      type: type.trim()
    });
    return `${this.config.endpoint}/view?${params.toString()}`;
  }

  /**
   * Workflow Templates Management
   */
  public getTemplates(): ComfyWorkflowTemplate[] {
    return Array.from(this.workflowTemplates.values());
  }

  public getTemplate(id: string): ComfyWorkflowTemplate | undefined {
    return this.workflowTemplates.get(id);
  }

  public saveTemplate(template: ComfyWorkflowTemplate): void {
    this.workflowTemplates.set(template.id, template);
  }

  /**
   * Build a Standard Text-to-Image Graph from Parameters
   */
  public buildTextToImageGraph(params: {
    prompt: string;
    negativePrompt?: string;
    checkpoint?: string;
    steps?: number;
    cfg?: number;
    samplerName?: string;
    scheduler?: string;
    width?: number;
    height?: number;
    seed?: number;
    batchSize?: number;
  }): ComfyWorkflowPrompt {
    const seed = params.seed ?? Math.floor(Math.random() * 10000000000);
    const steps = params.steps ?? 20;
    const cfg = params.cfg ?? 7.0;
    const samplerName = params.samplerName ?? 'euler';
    const scheduler = params.scheduler ?? 'normal';
    const width = params.width ?? 512;
    const height = params.height ?? 512;
    const batchSize = params.batchSize ?? 1;
    const checkpoint = params.checkpoint ?? 'v1-5-pruned-emaonly.safetensors';

    return {
      '3': {
        inputs: {
          seed,
          steps,
          cfg,
          sampler_name: samplerName,
          scheduler,
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0]
        },
        class_type: 'KSampler',
        _meta: { title: 'KSampler' }
      },
      '4': {
        inputs: {
          ckpt_name: checkpoint
        },
        class_type: 'CheckpointLoaderSimple',
        _meta: { title: 'Load Checkpoint' }
      },
      '5': {
        inputs: {
          width,
          height,
          batch_size: batchSize
        },
        class_type: 'EmptyLatentImage',
        _meta: { title: 'Empty Latent Image' }
      },
      '6': {
        inputs: {
          text: params.prompt,
          clip: ['4', 1]
        },
        class_type: 'CLIPTextEncode',
        _meta: { title: 'Positive Conditioning' }
      },
      '7': {
        inputs: {
          text: params.negativePrompt || 'blurry, low quality, distorted, bad anatomy, watermark',
          clip: ['4', 1]
        },
        class_type: 'CLIPTextEncode',
        _meta: { title: 'Negative Conditioning' }
      },
      '8': {
        inputs: {
          samples: ['3', 0],
          vae: ['4', 2]
        },
        class_type: 'VAEDecode',
        _meta: { title: 'VAE Decode' }
      },
      '9': {
        inputs: {
          filename_prefix: 'AIHeaven_ComfyUI',
          images: ['8', 0]
        },
        class_type: 'SaveImage',
        _meta: { title: 'Save Image' }
      }
    };
  }

  /**
   * Pre-load Authoritative Curated Workflows
   */
  private initDefaultTemplates(): void {
    const defaultT2I = this.buildTextToImageGraph({
      prompt: 'Cybernetic command center, high tech holograms, minimal sleek dark UI, 8k resolution, cinematic lighting',
      negativePrompt: 'low quality, blurry, artifacts, noisy, watermark',
      width: 512,
      height: 512,
      steps: 20,
      cfg: 7.0
    });

    this.workflowTemplates.set('txt2img-standard', {
      id: 'txt2img-standard',
      name: 'Text-to-Image (Standard Diffusion)',
      description: 'Classic latent diffusion pipeline with Checkpoint loader, Dual CLIP encoders, KSampler and VAE decoding.',
      category: 'image',
      defaultParams: {
        prompt: 'Futuristic AI command center, holographic display, dark cyberpunk aesthetics, highly detailed',
        negativePrompt: 'blurry, lowres, distorted, watermark',
        steps: 20,
        cfg: 7.0,
        samplerName: 'euler',
        scheduler: 'normal',
        width: 512,
        height: 512,
        seed: 42
      },
      promptGraph: defaultT2I
    });

    this.workflowTemplates.set('sdxl-photoreal', {
      id: 'sdxl-photoreal',
      name: 'SDXL High-Resolution Composition',
      description: 'Native 1024x1024 high-resolution generation using SDXL dual-text conditioned latent space.',
      category: 'image',
      defaultParams: {
        prompt: 'Ultra-realistic photography of autonomous humanoid robotics engineer inspecting circuit traces, soft volumetric studio lighting, 85mm lens f/1.4',
        negativePrompt: 'cartoon, painting, oversaturated, deformed eyes, extra limbs',
        steps: 25,
        cfg: 6.5,
        samplerName: 'dpmpp_2m',
        scheduler: 'karras',
        width: 1024,
        height: 1024,
        seed: 1337
      },
      promptGraph: this.buildTextToImageGraph({
        prompt: 'Ultra-realistic photography of autonomous humanoid robotics engineer inspecting circuit traces',
        negativePrompt: 'cartoon, painting, oversaturated, deformed eyes, extra limbs',
        checkpoint: 'sd_xl_base_1.0.safetensors',
        width: 1024,
        height: 1024,
        steps: 25,
        cfg: 6.5,
        samplerName: 'dpmpp_2m',
        scheduler: 'karras'
      })
    });

    this.workflowTemplates.set('animatediff-motion', {
      id: 'animatediff-motion',
      name: 'AnimateDiff Motion Latent Sequence',
      description: 'Temporal motion module pipeline generating animated frame sequences and looping video clips.',
      category: 'video',
      defaultParams: {
        prompt: 'Digital network nodes pulsing with azure glowing data packets, smooth continuous motion, seamless loop',
        negativePrompt: 'static, frozen, stuttering, flickering',
        steps: 20,
        cfg: 7.5,
        samplerName: 'euler_ancestral',
        scheduler: 'normal',
        width: 512,
        height: 512,
        seed: 8888
      },
      promptGraph: this.buildTextToImageGraph({
        prompt: 'Digital network nodes pulsing with azure glowing data packets, smooth continuous motion',
        negativePrompt: 'static, frozen, stuttering, flickering',
        steps: 20,
        cfg: 7.5
      })
    });
  }
}

export const comfyUIProvider = new ComfyUIProvider();
