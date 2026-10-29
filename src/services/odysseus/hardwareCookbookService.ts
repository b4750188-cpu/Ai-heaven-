/**
 * AI HEAVEN — ODYSSEUS HARDWARE COOKBOOK & MODEL INTELLIGENCE SERVICE
 * Profiles real host hardware (CPUs, RAM, GPU/VRAM, OS, container/serverless limits),
 * evaluates quantized model parameter fits honestly without simulation,
 * tests local inference runtimes (Ollama, LM Studio, vLLM, Edge-0),
 * and provides clear compatibility recommendations.
 */

import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import {
  HostHardwareProfile,
  ModelFitAssessment,
  ModelRecommendationMatrix,
  QuantizedModelSpec,
  QuantizationLevel
} from '../../types/odysseus';

export const QUANTIZED_MODEL_CATALOG: QuantizedModelSpec[] = [
  {
    id: 'llama-3.2-1b-instruct',
    name: 'Llama 3.2 1B Instruct',
    family: 'Llama',
    parameterCountB: 1.2,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 1.5,
    recommendedRamGb: 4.0,
    contextWindowTokens: 131072,
    tags: ['compact', 'mobile', 'fast', 'general'],
    license: 'Llama 3.2 Community',
    isLocalOnly: true
  },
  {
    id: 'llama-3.2-3b-instruct',
    name: 'Llama 3.2 3B Instruct',
    family: 'Llama',
    parameterCountB: 3.2,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 2.8,
    recommendedRamGb: 6.0,
    contextWindowTokens: 131072,
    tags: ['general', 'fast', 'reasoning', 'compact'],
    license: 'Llama 3.2 Community',
    isLocalOnly: true
  },
  {
    id: 'deepseek-r1-distill-qwen-7b',
    name: 'DeepSeek R1 Distill Qwen 7B',
    family: 'DeepSeek',
    parameterCountB: 7.6,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 5.5,
    recommendedRamGb: 12.0,
    contextWindowTokens: 32768,
    tags: ['reasoning', 'math', 'coding', 'logic'],
    license: 'MIT',
    isLocalOnly: true
  },
  {
    id: 'qwen-2.5-7b-instruct',
    name: 'Qwen 2.5 7B Instruct',
    family: 'Qwen',
    parameterCountB: 7.6,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 5.5,
    recommendedRamGb: 12.0,
    contextWindowTokens: 32768,
    tags: ['coding', 'multilingual', 'general'],
    license: 'Apache-2.0',
    isLocalOnly: true
  },
  {
    id: 'mistral-7b-instruct-v0.3',
    name: 'Mistral 7B Instruct v0.3',
    family: 'Mistral',
    parameterCountB: 7.2,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 5.2,
    recommendedRamGb: 12.0,
    contextWindowTokens: 32768,
    tags: ['function_calling', 'general', 'fast'],
    license: 'Apache-2.0',
    isLocalOnly: true
  },
  {
    id: 'gemma-2-9b-instruct',
    name: 'Gemma 2 9B Instruct',
    family: 'Gemma',
    parameterCountB: 9.2,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 7.0,
    recommendedRamGb: 16.0,
    contextWindowTokens: 8192,
    tags: ['general', 'reasoning', 'academic'],
    license: 'Gemma Terms of Use',
    isLocalOnly: true
  },
  {
    id: 'qwen-2.5-14b-instruct',
    name: 'Qwen 2.5 14B Instruct',
    family: 'Qwen',
    parameterCountB: 14.7,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 10.5,
    recommendedRamGb: 24.0,
    contextWindowTokens: 32768,
    tags: ['reasoning', 'coding', 'high_capability'],
    license: 'Apache-2.0',
    isLocalOnly: true
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek R1 Distill Qwen 32B',
    family: 'DeepSeek',
    parameterCountB: 32.5,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 22.0,
    recommendedRamGb: 48.0,
    contextWindowTokens: 32768,
    tags: ['deep_reasoning', 'complex_math', 'architecture'],
    license: 'MIT',
    isLocalOnly: true
  },
  {
    id: 'llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct',
    family: 'Llama',
    parameterCountB: 70.6,
    defaultQuantization: 'Q4_K_M',
    minVramGb: 48.0,
    recommendedRamGb: 96.0,
    contextWindowTokens: 131072,
    tags: ['frontier_grade', 'heavy_workload', 'sota'],
    license: 'Llama 3.3 Community',
    isLocalOnly: true
  }
];

export class HardwareCookbookService {
  private cachedProfile: HostHardwareProfile | null = null;
  private lastProfileScan = 0;
  private readonly CACHE_TTL_MS = 10000; // 10s freshness

  /**
   * Scans real host hardware specs and local runtime ports.
   */
  public async getHostProfile(forceFresh = false): Promise<HostHardwareProfile> {
    const now = Date.now();
    if (!forceFresh && this.cachedProfile && now - this.lastProfileScan < this.CACHE_TTL_MS) {
      return this.cachedProfile;
    }

    const cpus = os.cpus() || [];
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Generic CPU';
    const cpuCores = cpus.length;
    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();
    const totalSystemRamGb = Math.round((totalRamBytes / (1024 ** 3)) * 10) / 10;
    const freeSystemRamGb = Math.round((freeRamBytes / (1024 ** 3)) * 10) / 10;
    const osPlatform = os.platform();
    const architecture = os.arch();

    const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const isDocker = fs.existsSync('/.dockerenv');
    const isServerlessOrContainer = isCloudRun || isVercel || isDocker;

    let environmentName = 'local_workstation';
    if (isCloudRun) environmentName = 'cloud_run';
    else if (isVercel) environmentName = 'vercel';
    else if (isDocker) environmentName = 'docker';

    // GPU detection
    const gpuInfo = this.probeGpu(osPlatform, architecture);

    // Test local serving backends concurrently
    const localBackends = await this.probeLocalBackends();

    const profile: HostHardwareProfile = {
      cpuCores,
      cpuModel,
      totalSystemRamGb,
      freeSystemRamGb,
      osPlatform,
      architecture,
      gpuAvailable: gpuInfo.available,
      gpuName: gpuInfo.name,
      vramGb: gpuInfo.vramGb,
      isServerlessOrContainer,
      environmentName,
      localBackends
    };

    this.cachedProfile = profile;
    this.lastProfileScan = now;
    return profile;
  }

  /**
   * Probes for local GPU without hanging or throwing unhandled errors.
   */
  private probeGpu(platform: string, arch: string): { available: boolean; name?: string; vramGb?: number } {
    // 1. Apple Silicon (Darwin + arm64) unified memory
    if (platform === 'darwin' && arch === 'arm64') {
      const totalGb = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
      return {
        available: true,
        name: 'Apple Silicon (Unified Memory Architecture)',
        vramGb: Math.round(totalGb * 0.75 * 10) / 10 // Up to 75% unified memory allocatable to Metal
      };
    }

    // 2. Linux / Windows NVIDIA GPU probe via nvidia-smi
    if (platform === 'linux' || platform === 'win32') {
      try {
        const cmd = 'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits';
        const output = execSync(cmd, { timeout: 1500, stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
        if (output && output.includes(',')) {
          const [gpuName, memMbStr] = output.split(',').map(s => s.trim());
          const memMb = parseInt(memMbStr, 10);
          if (!isNaN(memMb)) {
            return {
              available: true,
              name: gpuName,
              vramGb: Math.round((memMb / 1024) * 10) / 10
            };
          }
        }
      } catch {
        // No nvidia-smi installed or non-NVIDIA system
      }
    }

    return { available: false };
  }

  /**
   * Probes common local LLM backend endpoints with fast HTTP timeouts (500ms).
   */
  private async probeLocalBackends() {
    const endpoints = {
      ollama: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
      lmStudio: process.env.LM_STUDIO_HOST || 'http://127.0.0.1:1234',
      vllm: process.env.VLLM_HOST || 'http://127.0.0.1:8001',
      edge0: process.env.EDGE0_ENDPOINT || 'http://127.0.0.1:8000'
    };

    const [ollama, lmStudio, vllm, edge0] = await Promise.all([
      this.pingLocalEndpoint(`${endpoints.ollama}/api/tags`, endpoints.ollama),
      this.pingLocalEndpoint(`${endpoints.lmStudio}/v1/models`, endpoints.lmStudio),
      this.pingLocalEndpoint(`${endpoints.vllm}/v1/models`, endpoints.vllm),
      this.pingLocalEndpoint(`${endpoints.edge0}/health`, endpoints.edge0)
    ]);

    return { ollama, lmStudio, vllm, edge0 };
  }

  private async pingLocalEndpoint(
    url: string,
    baseEndpoint: string
  ): Promise<{ isOnline: boolean; endpoint: string; models: string[]; latencyMs?: number }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 600);

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const latencyMs = Date.now() - start;
        let models: string[] = [];
        try {
          const data = await res.json();
          if (Array.isArray(data?.models)) {
            models = data.models.map((m: any) => m.name || m.id).filter(Boolean);
          } else if (Array.isArray(data?.data)) {
            models = data.data.map((m: any) => m.id).filter(Boolean);
          }
        } catch {
          // Response was ok but not model json
        }
        return { isOnline: true, endpoint: baseEndpoint, models, latencyMs };
      }
    } catch {
      // Offline / unreachable
    }
    return { isOnline: false, endpoint: baseEndpoint, models: [] };
  }

  /**
   * Evaluates memory requirement and hardware fit for a model specification.
   */
  public evaluateModelFit(model: QuantizedModelSpec, hardware: HostHardwareProfile): ModelFitAssessment {
    const bitsMap: Record<QuantizationLevel, number> = {
      Q4_K_M: 4.5,
      Q5_K_M: 5.5,
      Q8_0: 8.5,
      FP16: 16.0
    };

    const bitsPerWeight = bitsMap[model.defaultQuantization] || 4.5;
    const weightsGb = (model.parameterCountB * bitsPerWeight) / 8;
    const kvAndOverheadGb = 1.0 + (Math.min(model.contextWindowTokens, 8192) / 4096) * 0.4;
    const requiredMemoryGb = Math.round((weightsGb + kvAndOverheadGb) * 10) / 10;

    const availableMemoryGb = hardware.gpuAvailable && hardware.vramGb
      ? hardware.vramGb
      : hardware.totalSystemRamGb;

    const memoryHeadroomGb = Math.round((availableMemoryGb - requiredMemoryGb) * 10) / 10;

    let fit: ModelFitAssessment['fit'] = 'insufficient_hardware';
    let explanation = '';
    let estimatedTokensPerSec = 0;
    let recommendedBackend: ModelFitAssessment['recommendedBackend'] = 'cloud_api';

    // 1. GPU VRAM fit check
    if (hardware.gpuAvailable && hardware.vramGb && hardware.vramGb >= requiredMemoryGb) {
      fit = 'optimal';
      explanation = `Fits comfortably in ${hardware.gpuName || 'GPU'} VRAM (${requiredMemoryGb} GB required vs ${hardware.vramGb} GB available). Zero CPU offload required.`;
      estimatedTokensPerSec = model.parameterCountB <= 8 ? 65 : model.parameterCountB <= 14 ? 38 : 18;
      recommendedBackend = hardware.localBackends.ollama.isOnline ? 'ollama' : 'lmstudio';
    }
    // 2. Apple Silicon unified RAM fit check
    else if (hardware.osPlatform === 'darwin' && hardware.architecture === 'arm64' && hardware.totalSystemRamGb >= requiredMemoryGb * 1.2) {
      fit = 'optimal';
      explanation = `Fits in Apple Silicon unified memory (${requiredMemoryGb} GB required vs ${hardware.totalSystemRamGb} GB system RAM). Metal GPU acceleration enabled.`;
      estimatedTokensPerSec = model.parameterCountB <= 8 ? 48 : model.parameterCountB <= 14 ? 28 : 12;
      recommendedBackend = 'ollama';
    }
    // 3. CPU RAM fit check (sufficient RAM)
    else if (hardware.totalSystemRamGb >= requiredMemoryGb * 1.3) {
      fit = 'possible_with_offload';
      explanation = `Can run in host system RAM (${requiredMemoryGb} GB required vs ${hardware.totalSystemRamGb} GB available). Lacks full dedicated VRAM; inference will run via CPU cores with reduced tokens/sec.`;
      estimatedTokensPerSec = model.parameterCountB <= 3 ? 18 : model.parameterCountB <= 8 ? 7 : 2;
      recommendedBackend = hardware.localBackends.ollama.isOnline ? 'ollama' : 'edge0';
    }
    // 4. Tight RAM / High OOM Risk
    else if (hardware.totalSystemRamGb >= requiredMemoryGb) {
      fit = 'possible_with_offload';
      explanation = `Near boundary limit (${requiredMemoryGb} GB required vs ${hardware.totalSystemRamGb} GB total RAM). Heavy memory pressure; risk of swapping or OOM kill during long contexts.`;
      estimatedTokensPerSec = model.parameterCountB <= 8 ? 4 : 1;
      recommendedBackend = 'edge0';
    }
    // 5. Out of bounds
    else {
      fit = 'insufficient_hardware';
      explanation = `Insufficient memory (${requiredMemoryGb} GB required vs ${hardware.totalSystemRamGb} GB available RAM). Model will crash with Out Of Memory (OOM). Use cloud API endpoints instead.`;
      estimatedTokensPerSec = 0;
      recommendedBackend = 'cloud_api';
    }

    return {
      model,
      fit,
      requiredMemoryGb,
      availableMemoryGb,
      memoryHeadroomGb,
      estimatedTokensPerSec,
      explanation,
      recommendedBackend
    };
  }

  /**
   * Produces the complete recommendation matrix comparing local models to cloud options.
   */
  public async getRecommendationMatrix(): Promise<ModelRecommendationMatrix> {
    const hardware = await this.getHostProfile();

    const localFits = QUANTIZED_MODEL_CATALOG.map(model =>
      this.evaluateModelFit(model, hardware)
    );

    const cloudAlternatives = [
      {
        provider: 'Google Gemini',
        model: 'gemini-2.5-flash',
        contextTokens: 1048576,
        costPerMillionInput: 0.075,
        costPerMillionOutput: 0.30,
        recommendedUse: 'High-speed reasoning, 1M context analysis, multimodal research'
      },
      {
        provider: 'Anthropic',
        model: 'claude-3-5-sonnet-20241022',
        contextTokens: 200000,
        costPerMillionInput: 3.00,
        costPerMillionOutput: 15.00,
        recommendedUse: 'Complex autonomous agent loops, rigorous coding, patch synthesis'
      },
      {
        provider: 'OpenAI',
        model: 'gpt-4o',
        contextTokens: 128000,
        costPerMillionInput: 2.50,
        costPerMillionOutput: 10.00,
        recommendedUse: 'General workspace workflows, structured schema extraction'
      },
      {
        provider: 'DeepSeek',
        model: 'deepseek-chat (V3)',
        contextTokens: 64000,
        costPerMillionInput: 0.14,
        costPerMillionOutput: 0.28,
        recommendedUse: 'Cost-effective high-intelligence reasoning, mathematics, logic'
      }
    ];

    let environmentAdvisory = '';
    if (hardware.isServerlessOrContainer) {
      environmentAdvisory =
        `Container/Serverless Environment detected (${hardware.environmentName}). Dedicated GPU passthrough is not available on standard serverless instances. Local large quantized models (>=7B) are not recommended in production serverless containers; cloud API routing or connection to an external dedicated Ollama/LM Studio node is advised.`;
    } else if (hardware.gpuAvailable) {
      environmentAdvisory =
        `Dedicated hardware acceleration detected (${hardware.gpuName}, ~${hardware.vramGb} GB VRAM). Local execution of models up to ${hardware.vramGb && hardware.vramGb >= 16 ? '14B' : '7B'} will perform with excellent token latency and complete data privacy.`;
    } else {
      environmentAdvisory =
        `CPU-only host detected with ${hardware.totalSystemRamGb} GB RAM. Compact models (Llama 3.2 1B-3B) can execute locally via CPU. For heavier workloads (7B+), cloud API endpoints are recommended for sub-second responses.`;
    }

    return {
      hardware,
      localFits,
      cloudAlternatives,
      environmentAdvisory
    };
  }
}

export const hardwareCookbookService = new HardwareCookbookService();
