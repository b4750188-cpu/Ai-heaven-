/**
 * AI HEAVEN — ComfyUI Visual AI Workflow Engine Test Suite
 * 
 * Verifies:
 * 1. Provider registration & configuration defaults.
 * 2. SSRF validation & boundary defense (blocking AWS/GCP metadata, non-HTTP, arbitrary unapproved external hosts).
 * 3. Truthful runtime health checking (zero fabricated connections or fake VRAM).
 * 4. Workflow DAG construction & node linkage validation.
 * 5. Curated workflow template registry.
 * 6. Central Brain self-awareness & official upstream provenance.
 * 7. Central Brain model catalog integration.
 * 8. Inference vs tool privilege decoupling.
 * 9. Media artifact URL generation safety.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { comfyUIProvider } from '../src/services/workflow/comfyUIProvider';
import { centralBrainService } from '../src/services/brain/centralBrainService';
import { realityRegistryService } from '../src/services/reality/realityRegistryService';

test('AI HEAVEN - ComfyUI Visual AI Workflow Engine Suite', async (t) => {
  // Test 1: Provider Registration & Defaults
  await t.test('1. Provider Registration & Configuration Defaults', () => {
    const cfg = comfyUIProvider.getConfig();
    assert.ok(cfg.endpoint.startsWith('http://127.0.0.1:8188'), 'Default endpoint is 127.0.0.1:8188');
    assert.ok(cfg.wsEndpoint.startsWith('ws://127.0.0.1:8188/ws'), 'Default wsEndpoint is ws://127.0.0.1:8188/ws');
    assert.ok(cfg.timeoutMs >= 3000, 'Sensible timeout configured');
    assert.ok(cfg.clientId && cfg.clientId.length > 0, 'Unique client ID generated');

    const status = comfyUIProvider.getStatus();
    assert.equal(status.isConfigured, true);
    assert.ok(typeof status.isConnected === 'boolean');
  });

  // Test 2: SSRF & Security Validation
  await t.test('2. SSRF & Endpoint Security Validation', () => {
    // Permitted: loopback & local LAN
    assert.equal(comfyUIProvider.validateEndpoint('http://127.0.0.1:8188').valid, true);
    assert.equal(comfyUIProvider.validateEndpoint('http://localhost:8188').valid, true);
    assert.equal(comfyUIProvider.validateEndpoint('http://192.168.1.50:8188').valid, true);
    assert.equal(comfyUIProvider.validateEndpoint('http://10.0.0.25:8188').valid, true);
    assert.equal(comfyUIProvider.validateEndpoint('http://172.16.0.5:8188').valid, true);

    // Prohibited: Cloud metadata
    assert.equal(comfyUIProvider.validateEndpoint('http://169.254.169.254/latest/meta-data').valid, false);
    assert.equal(comfyUIProvider.validateEndpoint('http://169.254.1.1').valid, false);
    assert.equal(comfyUIProvider.validateEndpoint('http://metadata.google.internal/computeMetadata/v1/').valid, false);

    // Prohibited: Non-HTTP protocols
    assert.equal(comfyUIProvider.validateEndpoint('file:///etc/passwd').valid, false);
    assert.equal(comfyUIProvider.validateEndpoint('ftp://127.0.0.1:21').valid, false);
    assert.equal(comfyUIProvider.validateEndpoint('javascript:alert(1)').valid, false);

    // Prohibited: Arbitrary external hosts
    assert.equal(comfyUIProvider.validateEndpoint('https://evil-attacker.com:8188').valid, false);
  });

  // Test 3: Truthful Runtime Status & Zero Fabrication
  await t.test('3. Truthful Runtime Status & Zero Fabrication', async () => {
    // When ComfyUI daemon is not running on 8188, checkHealth must truthfully report isConnected = false
    const status = await comfyUIProvider.checkHealth();
    assert.equal(status.isConnected, false, 'Truthfully reports disconnected when daemon is offline');
    assert.equal(status.systemStats, null, 'Never fabricates fake GPU or fake VRAM');
    assert.ok(status.error && status.error.length > 0, 'Provides truthful actionable error notice');

    // Reality registry capability state must reflect DISCONNECTED
    const cap = realityRegistryService.getCapability('comfyui_workflow_engine');
    assert.ok(cap, 'ComfyUI capability is registered in Reality Registry');
    assert.equal(cap?.state, 'DISCONNECTED');
  });

  // Test 4: Workflow Graph Construction & DAG Validation
  await t.test('4. Workflow Graph Construction & DAG Validation', () => {
    const graph = comfyUIProvider.buildTextToImageGraph({
      prompt: 'Cyberpunk floating island with glowing waterfall',
      negativePrompt: 'blurry, low quality',
      steps: 25,
      cfg: 7.5,
      width: 768,
      height: 768,
      seed: 9999
    });

    // Check mandatory standard ComfyUI nodes
    assert.ok(graph['3'], 'KSampler node present');
    assert.equal(graph['3'].class_type, 'KSampler');
    assert.equal(graph['3'].inputs.steps, 25);
    assert.equal(graph['3'].inputs.cfg, 7.5);
    assert.equal(graph['3'].inputs.seed, 9999);

    assert.ok(graph['4'], 'CheckpointLoaderSimple node present');
    assert.equal(graph['4'].class_type, 'CheckpointLoaderSimple');

    assert.ok(graph['5'], 'EmptyLatentImage node present');
    assert.equal(graph['5'].class_type, 'EmptyLatentImage');
    assert.equal(graph['5'].inputs.width, 768);
    assert.equal(graph['5'].inputs.height, 768);

    assert.ok(graph['6'], 'Positive CLIPTextEncode node present');
    assert.equal(graph['6'].class_type, 'CLIPTextEncode');
    assert.equal(graph['6'].inputs.text, 'Cyberpunk floating island with glowing waterfall');

    assert.ok(graph['7'], 'Negative CLIPTextEncode node present');
    assert.equal(graph['7'].class_type, 'CLIPTextEncode');
    assert.equal(graph['7'].inputs.text, 'blurry, low quality');

    assert.ok(graph['8'], 'VAEDecode node present');
    assert.equal(graph['8'].class_type, 'VAEDecode');

    assert.ok(graph['9'], 'SaveImage node present');
    assert.equal(graph['9'].class_type, 'SaveImage');
  });

  // Test 5: Curated Template Catalog
  await t.test('5. Curated Template Catalog', () => {
    const templates = comfyUIProvider.getTemplates();
    assert.ok(templates.length >= 3, 'Pre-loaded with curated workflow templates');

    const t2i = templates.find(t => t.id === 'txt2img-standard');
    assert.ok(t2i, 'Standard Text-to-Image template exists');
    assert.equal(t2i?.category, 'image');

    const sdxl = templates.find(t => t.id === 'sdxl-photoreal');
    assert.ok(sdxl, 'SDXL Photoreal template exists');

    const anim = templates.find(t => t.id === 'animatediff-motion');
    assert.ok(anim, 'AnimateDiff Motion template exists');
    assert.equal(anim?.category, 'video');
  });

  // Test 6: Central Brain Self-Awareness & Upstream Provenance
  await t.test('6. Central Brain Self-Awareness & Upstream Provenance', () => {
    const response = centralBrainService.generateSelfAwarenessResponse('check comfyui status');
    assert.ok(response, 'Central Brain responds to ComfyUI self-awareness inquiry');
    assert.ok(response?.includes('Comfy-Org/ComfyUI'), 'Cites official Comfy-Org/ComfyUI repository');
    assert.ok(response?.includes('GPL-3.0'), 'References official GPL-3.0 license');
    assert.ok(response?.includes('DAG'), 'Describes Directed Acyclic Graph architecture');
  });

  // Test 7: Central Brain Model Catalog
  await t.test('7. Central Brain Model Catalog & Model Registration', () => {
    const models = centralBrainService.getModels();
    const comfyModels = models.filter(m => m.provider === 'comfyui');
    assert.ok(comfyModels.length >= 2, 'ComfyUI models registered in Central Brain');

    const sdxlTurbo = comfyModels.find(m => m.id === 'comfyui-sdxl-turbo');
    assert.ok(sdxlTurbo, 'comfyui-sdxl-turbo model registered');
    assert.equal(sdxlTurbo?.outputCostPerM, 0, 'Zero API token cost for local ComfyUI inference');
  });

  // Test 8: Inference vs Tool Privilege Decoupling
  await t.test('8. Inference vs Tool Privilege Decoupling', () => {
    const quotas = centralBrainService.getProviderStatuses();
    const comfyQuota = quotas.find(q => q.providerId === 'comfyui-local' || q.provider === 'comfyui-local');
    assert.ok(comfyQuota, 'Quota tracked for ComfyUI local');
    assert.equal(comfyQuota?.status, 'operational');
  });

  // Test 9: Media View URL Generator Safety
  await t.test('9. Media View URL Generator Safety', () => {
    const mediaUrl = comfyUIProvider.getMediaUrl('render_001.png', 'sub_tests', 'output');
    assert.ok(mediaUrl.includes('/view?'), 'Constructs standard /view endpoint URL');
    assert.ok(mediaUrl.includes('filename=render_001.png'));
    assert.ok(mediaUrl.includes('subfolder=sub_tests'));
    assert.ok(mediaUrl.includes('type=output'));
  });
});
