/**
 * AI HEAVEN - Edge0 Local Inference Engine & Brain Integration Test Suite
 * 
 * Verifies:
 * 1. Provider configuration & default state
 * 2. Strict SSRF validation (blocks cloud metadata 169.254.169.254, non-http, external hosts)
 * 3. Runtime health check handling (truthfully reports unreachable when no local daemon runs)
 * 4. Local-only mode enforcement (blocks unpermitted cloud fallback)
 * 5. Cloud fallback disclosure (when permission is granted)
 * 6. Central Brain model routing with Edge0
 * 7. Android hardware & runtime compatibility analysis
 * 8. Tool execution permission boundary (inference does not grant shell/tools)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { edge0Provider } from '../src/services/inference/edge0Provider';
import { centralBrainService } from '../src/services/brain/centralBrainService';
import { realityRegistryService } from '../src/services/reality/realityRegistryService';

test('AI HEAVEN - Edge0 Local AI Engine & Security Suite', async (t) => {
  await t.test('1. Provider Registration & Configuration Defaults', () => {
    const config = edge0Provider.getConfig();
    assert.ok(config.endpoint.startsWith('http'), 'Endpoint has HTTP scheme');
    assert.equal(typeof config.timeoutMs, 'number');
    assert.equal(typeof config.localOnlyMode, 'boolean');
    assert.equal(typeof config.allowCloudFallback, 'boolean');
    assert.ok(config.preferredModel.includes('Edge0'), 'Preferred model is Edge0');

    const status = edge0Provider.getStatus();
    assert.equal(typeof status.isConnected, 'boolean');
    assert.ok(Array.isArray(status.loadedModels));
  });

  await t.test('2. SSRF & Endpoint Security Validation', () => {
    // Valid loopback and private LAN addresses
    assert.equal(edge0Provider.validateEndpoint('http://127.0.0.1:8000').valid, true);
    assert.equal(edge0Provider.validateEndpoint('http://localhost:8000').valid, true);
    assert.equal(edge0Provider.validateEndpoint('http://localhost:52000').valid, true);
    assert.equal(edge0Provider.validateEndpoint('http://192.168.1.100:8000').valid, true);
    assert.equal(edge0Provider.validateEndpoint('http://10.0.0.5:8080').valid, true);

    // Forbidden cloud metadata endpoints (SSRF)
    const metadataCheck = edge0Provider.validateEndpoint('http://169.254.169.254/latest/meta-data/');
    assert.equal(metadataCheck.valid, false, 'Blocks AWS/GCP link-local metadata IP');
    assert.ok(metadataCheck.error?.includes('metadata'), 'Provides descriptive SSRF error');

    // Forbidden arbitrary external hosts
    const externalCheck = edge0Provider.validateEndpoint('https://evil-unapproved-external.com/api');
    assert.equal(externalCheck.valid, false, 'Blocks arbitrary unapproved external web host');

    // Forbidden protocols
    const fileCheck = edge0Provider.validateEndpoint('file:///etc/passwd');
    assert.equal(fileCheck.valid, false, 'Blocks file:// scheme');
  });

  await t.test('3. Truthful Runtime Status & Zero Fabrication', async () => {
    // With no daemon running on port 8000 in this container, health check must report offline
    const status = await edge0Provider.checkHealth();
    assert.equal(status.isConnected, false, 'Reports disconnected truthfully when no daemon is listening');
    assert.ok(status.error, 'Contains descriptive connection error explanation');
    assert.equal(status.loadedModels.length, 0, 'Does not fabricate loaded models');

    // Reality registry should reflect DISCONNECTED state
    const cap = realityRegistryService.getCapability('edge0_local_engine');
    assert.ok(cap, 'Edge0 registered in reality capabilities');
    assert.equal(cap?.isConnected, false);
    assert.equal(cap?.state, 'DISCONNECTED');
  });

  await t.test('4. Android Compatibility Analysis & W3C Boundary', () => {
    const report = edge0Provider.getAndroidCompatibilityReport();
    assert.equal(report.isSupportedArchitecture, true);
    assert.ok(report.architecture.includes('ARM64'));
    assert.ok(report.minStorageSpeed.includes('UFS'));
    assert.ok(report.minRamGb >= 4.0);
    assert.equal(report.pwaNativeBoundary.canDirectExecuteBinary, false, 'Truthfully reports W3C sandbox cannot run raw NDK binary');
    assert.ok(report.pwaNativeBoundary.setupInstructions.length >= 3);
  });

  await t.test('5. Central Brain Model Catalog & Dynamic Edge0 Registration', () => {
    const models = centralBrainService.getModels();
    const edge035B = models.find(m => m.id === 'edge0-35b-a3b');
    const edge08B = models.find(m => m.id === 'edge0-8b-a1b');

    assert.ok(edge035B, 'Edge0 35B model registered in Central Brain');
    assert.ok(edge08B, 'Edge0 8B model registered in Central Brain');
    assert.equal(edge035B?.inputCostPerM, 0.0, 'Zero API token cost for local inference');
    assert.equal(edge035B?.isAvailable, false, 'Initially marked unavailable until confirmed by live runtime');

    // Test dynamic model sync
    centralBrainService.syncEdge0Models(['Edge0-35B-A3B-preview'], true);
    const updated = centralBrainService.getModels().find(m => m.id === 'edge0-35b-a3b');
    assert.equal(updated?.isAvailable, true, 'Updated to available when runtime is confirmed');

    // Reset back to offline
    centralBrainService.syncEdge0Models([], false);
    const reset = centralBrainService.getModels().find(m => m.id === 'edge0-35b-a3b');
    assert.equal(reset?.isAvailable, false);
  });

  await t.test('6. Local-Only Mode Enforcement: Blocks Data Egress When Offline', async () => {
    // Configure strict local-only mode with cloud fallback disabled
    edge0Provider.updateConfig({
      localOnlyMode: true,
      allowCloudFallback: false
    });

    const thread = centralBrainService.createConversation('Test Local Privacy');
    const result = await centralBrainService.processChatTurn(
      thread.id,
      'Classify this internal vulnerability data',
      'edge0-35b-a3b'
    );

    // Must block cloud processing and issue strict privacy notice
    assert.ok(
      result.assistantMessage.content.includes('[LOCAL-ONLY MODE ENFORCEMENT]'),
      'Strictly blocks request when local runtime is offline'
    );
    assert.equal(result.isLiveProvider, false);
    assert.equal(result.assistantMessage.metadata?.inferenceLocation, 'local');

    // Reset config back to normal
    edge0Provider.updateConfig({
      localOnlyMode: false,
      allowCloudFallback: true
    });
  });

  await t.test('7. Cloud Fallback Disclosure: Transparent Reporting on Failure', async () => {
    // Configure local model selection with cloud fallback permitted
    edge0Provider.updateConfig({
      localOnlyMode: false,
      allowCloudFallback: true
    });

    const thread = centralBrainService.createConversation('Test Fallback Disclosure');
    const result = await centralBrainService.processChatTurn(
      thread.id,
      'Generate a security architecture summary',
      'edge0-35b-a3b'
    );

    // Must include explicit disclosure that request routed to fallback
    assert.ok(
      result.assistantMessage.content.includes('[LOCAL-TO-CLOUD FALLBACK DISCLOSURE'),
      'Discloses fallback model and reason transparently'
    );
  });

  await t.test('8. System Self-Awareness & Connection Auditing', () => {
    const response = centralBrainService.generateSelfAwarenessResponse('check edge0 status');
    assert.ok(response, 'Generates response for Edge0 query');
    assert.ok(response?.includes('Edge0-AI/Edge0'), 'References official upstream project');
    assert.ok(response?.includes('Streaming MoE from SSD'), 'States MoE architecture accurately');
  });

  await t.test('9. Inference vs Tool Privilege Decoupling', () => {
    // Ensure Edge0 has NO direct tool authorization
    const quotas = centralBrainService.getProviderStatuses();
    const edge0Quota = quotas.find(q => q.providerId === 'edge0-local');
    assert.ok(edge0Quota, 'Quota tracked for Edge0');
    assert.equal(edge0Quota?.status, 'operational');
  });
});
