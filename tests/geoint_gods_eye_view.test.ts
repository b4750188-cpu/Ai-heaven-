import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { geointDataService } from '../src/services/geoint/geointDataService';
import { geointCorrelationEngine } from '../src/services/geoint/geointCorrelationEngine';
import { geointSourceBridge } from '../src/services/geoint/geointSourceBridge';
import { mcpClientService } from '../src/services/mcp/mcpClientService';
import { centralBrainService } from '../src/services/brain/centralBrainService';
import { droidFamilyService } from '../src/services/family/droidFamilyService';
import { sourceKnowledgeService } from '../src/services/source/sourceKnowledgeService';
import { app } from '../src/api/app';
import { Server } from 'http';

describe("AI Heaven — Eyes for All (God's Eye View Integration) Test Suite", () => {
  let server: Server;
  let testPort: number;
  let baseUrl: string;

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          testPort = addr.port;
          baseUrl = `http://127.0.0.1:${testPort}/api`;
        }
        resolve();
      });
    });
  });

  // =========================================================================
  // 1. DATA PROVIDERS & TELEMETRY INGESTION
  // =========================================================================
  describe('1. Real-World Telemetry Feeds & Data Integrity', () => {
    test('fetches real seismic data with valid coordinates and SHA-256 evidence seals', async () => {
      const quakes = await geointDataService.fetchEarthquakes(2.0);
      assert.ok(Array.isArray(quakes), 'Must return an array of seismic entities');
      if (quakes.length > 0) {
        const sample = quakes[0];
        assert.equal(sample.category, 'earthquake');
        assert.equal(sample.sourceProvider, 'USGS Earthquake Hazards Program');
        assert.ok(sample.position.latitude >= -90 && sample.position.latitude <= 90);
        assert.ok(sample.position.longitude >= -180 && sample.position.longitude <= 180);
        assert.ok(sample.sha256EvidenceSeal.length >= 16, 'Must contain cryptographic SHA-256 evidence seal');
        assert.equal(sample.dataStatus, 'live');
        assert.equal(sample.verificationStatus, 'VERIFIED');
      }
    });

    test('fetches orbital assets with Keplerian sub-satellite point calculations', async () => {
      const sats = await geointDataService.fetchSatellites();
      assert.ok(Array.isArray(sats), 'Must return array of satellites');
      assert.ok(sats.length > 0, 'Should load active orbital elements from catalog');
      const sample = sats[0];
      assert.equal(sample.category, 'satellite');
      assert.equal(sample.dataStatus, 'estimated', 'Orbital positions must be truthfully labeled as estimated');
      assert.ok(sample.position.latitude >= -90 && sample.position.latitude <= 90);
      assert.ok(sample.position.longitude >= -180 && sample.position.longitude <= 180);
      assert.ok((sample.position.altitudeMeters || 0) > 100000, 'LEO satellite altitude must exceed 100km');
    });

    test('fetches active aircraft telemetry and tags airborne status', async () => {
      const aircraft = await geointDataService.fetchAircraft();
      assert.ok(Array.isArray(aircraft), 'Must return array of aircraft');
      if (aircraft.length > 0) {
        const sample = aircraft[0];
        assert.equal(sample.category, 'aircraft');
        assert.ok(['OpenSky Network ADS-B', 'Airplanes.live Mil ADS-B'].includes(sample.sourceProvider));
        assert.ok(sample.position.latitude >= -90 && sample.position.latitude <= 90);
        assert.ok(sample.sha256EvidenceSeal.length > 0);
      }
    });

    test('fetches environmental hazards and wildfires from NASA EONET', async () => {
      const events = await geointDataService.fetchEnvironmentalEvents();
      assert.ok(Array.isArray(events), 'Must return environmental events');
      if (events.length > 0) {
        const sample = events[0];
        assert.ok(sample.category === 'wildfire' || sample.category === 'severe_weather');
        assert.equal(sample.sourceProvider, 'NASA EONET (Earth Observatory)');
      }
    });

    test('fetches strategic maritime transit chokepoint AIS data', async () => {
      const vessels = await geointDataService.fetchMaritime();
      assert.ok(Array.isArray(vessels), 'Must return vessels array');
      assert.ok(vessels.length > 0, 'Must load strategic maritime vessels');
      const sample = vessels[0];
      assert.equal(sample.category, 'maritime');
      assert.ok(sample.metadata.imo || sample.metadata.mmsi);
    });
  });

  // =========================================================================
  // 2. SATELLITE PASS PREDICTION & ORBITAL MECHANICS
  // =========================================================================
  describe('2. Satellite Pass Prediction Engine (SGP4 Projection)', () => {
    test('calculates upcoming overhead passes for target coordinates', async () => {
      const passes = await geointDataService.predictSatellitePasses(37.7749, -122.4194, 'San Francisco');
      assert.ok(Array.isArray(passes), 'Must return pass predictions');
      assert.ok(passes.length > 0, 'Must identify satellites within orbital inclination reach');
      const pass = passes[0];
      assert.ok(pass.maxElevationDeg >= 15 && pass.maxElevationDeg <= 90, 'Elevation angle must be valid');
      assert.ok(pass.durationSeconds > 0, 'Pass duration must be positive');
      assert.ok(pass.sha256CalculationSeal.length > 0, 'Calculation seal required');
      assert.equal(pass.isAnalyticalPrediction, true, 'Must be marked as analytical prediction, not physical radar observation');
    });
  });

  // =========================================================================
  // 3. SPATIAL CORRELATION & EPISTEMIC PROVENANCE
  // =========================================================================
  describe('3. Spatial Correlation Engine', () => {
    test('calculates accurate Haversine distance between coordinates', () => {
      // Distance between NYC (40.7128, -74.0060) and London (51.5074, -0.1278) ~5570 km
      const dist = geointCorrelationEngine.calculateDistanceKm(40.7128, -74.0060, 51.5074, -0.1278);
      assert.ok(dist > 5500 && dist < 5650, `Distance should be ~5570km, got ${dist}`);
    });

    test('correlates spatial phenomena against target facility and distinguishes facts from hypotheses', async () => {
      const report = await geointCorrelationEngine.correlateTarget(
        'Silicon Valley Datacenter',
        37.4419,
        -122.1430,
        350
      );
      assert.ok(report.id.startsWith('rep_'), 'Report must have unique ID');
      assert.equal(report.targetRegion, 'Silicon Valley Datacenter (Radius: 350km)');
      assert.ok(Array.isArray(report.correlations), 'Must have correlations list');

      // Verify epistemic rule: physical measurements are facts; orbital sub-satellite intersections are hypotheses
      for (const m of report.correlations) {
        if (m.category === 'satellite') {
          assert.equal(m.isVerifiedFact, false, 'Satellite ground projections must be analytical hypotheses');
          assert.ok(m.rationale.includes('ANALYTICAL HYPOTHESIS'));
        } else {
          assert.equal(m.isVerifiedFact, true, 'Physical seismic/flight events must be verified facts');
          assert.ok(m.rationale.includes('VERIFIED:'));
        }
      }
    });
  });

  // =========================================================================
  // 4. MCP TOOL REGISTRATION & EXECUTION
  // =========================================================================
  describe('4. Model Context Protocol (MCP) Integration', () => {
    test('registers mcp_geoint server in MCP registry with tools', () => {
      const server = mcpClientService.getServer('mcp_geoint');
      assert.ok(server, 'mcp_geoint server must be registered');
      assert.equal(server.isEnabled, true);

      const tools = mcpClientService.listTools('mcp_geoint');
      const toolNames = tools.map((t: any) => t.name);
      assert.ok(toolNames.includes('geoint_query_entities'));
      assert.ok(toolNames.includes('geoint_predict_satellite_pass'));
      assert.ok(toolNames.includes('geoint_correlate_target'));
    });

    test('executes geoint_query_entities tool with JSON-RPC receipt', async () => {
      const res = await mcpClientService.callTool('mcp_geoint', 'geoint_query_entities', {
        categories: ['satellite'],
        limit: 5
      });
      assert.equal(res.isError, false);
      assert.ok(res.receipt.receiptId.startsWith('mcp_rcpt_'));
      assert.equal(res.receipt.status, 'success');
      const parsed = JSON.parse(res.content[0].text || '{}');
      assert.ok(parsed.count > 0);
    });

    test('executes geoint_predict_satellite_pass tool with valid receipt', async () => {
      const res = await mcpClientService.callTool('mcp_geoint', 'geoint_predict_satellite_pass', {
        latitude: 51.5074,
        longitude: -0.1278,
        locationName: 'London Datacenter'
      });
      assert.equal(res.isError, false);
      const parsed = JSON.parse(res.content[0].text || '{}');
      assert.ok(parsed.passes.length > 0);
    });

    test('enforces SSRF protection blocking localhost, metadata, and private IP fetch attempts', () => {
      assert.equal(geointDataService.isSafeUrl('http://127.0.0.1:8080/secret'), false);
      assert.equal(geointDataService.isSafeUrl('http://localhost:3000/api'), false);
      assert.equal(geointDataService.isSafeUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.equal(geointDataService.isSafeUrl('http://10.0.0.1/admin'), false);
      assert.equal(geointDataService.isSafeUrl('http://192.168.1.1/router'), false);
      assert.equal(geointDataService.isSafeUrl('http://172.20.0.1/docker'), false);
      assert.equal(geointDataService.isSafeUrl('http://[::1]:80/'), false);
      assert.equal(geointDataService.isSafeUrl('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'), true);
      assert.equal(geointDataService.isSafeUrl('https://celestrak.org/NORAD/elements/gp.php'), true);
    });

    test('handles invalid arguments gracefully in geoint MCP tool execution', async () => {
      // Missing required latitude/longitude
      const res = await mcpClientService.callTool('mcp_geoint', 'geoint_predict_satellite_pass', {
        locationName: 'Unknown'
      });
      // Tool handles gracefully and does not throw unhandled exception
      assert.ok(res.receipt, 'Must emit receipt even on incomplete arguments');
    });
  });

  // =========================================================================
  // 5. SOURCE KNOWLEDGE POOL INTEGRATION
  // =========================================================================
  describe('5. SOURCE Knowledge Pool Deposition & Droid Family', () => {
    test('deposits verified spatial observation into user family SOURCE pool with SHA-256 seal', async () => {
      const testUser = {
        id: 'user_geoint_tester',
        email: 'geoint_analyst@aiheaven.test',
        fullName: 'GEOINT Analyst'
      };

      const entity = {
        id: 'quake_test_fixture_01',
        category: 'earthquake' as const,
        name: 'M 4.5 Ridgecrest Seismic Event',
        position: { latitude: 35.8, longitude: -117.5, altitudeMeters: -8000 },
        timestamp: new Date().toISOString(),
        sourceProvider: 'USGS Earthquake Hazards Program',
        dataStatus: 'live' as const,
        verificationStatus: 'VERIFIED' as const,
        sha256EvidenceSeal: 'abcdef1234567890abcdef12',
        metadata: { mag: 4.5, depthKm: 8, place: 'Ridgecrest, CA' }
      };

      const entry = await geointSourceBridge.depositEntityToSource(
        testUser,
        entity,
        'Directly confirmed seismic wave telemetry.'
      );

      assert.ok(entry.id.startsWith('src_'), 'Entry ID must be formatted with src_');
      assert.ok(entry.title.includes('M 4.5 Ridgecrest'));
      assert.equal(entry.verificationStatus, 'VERIFIED');
      assert.equal(entry.contributor.name, 'Horus-09 (EYE_OF_RA)');
      assert.equal(entry.metadata?.latitude, 35.8);
      assert.equal(entry.metadata?.longitude, -117.5);
      assert.equal(entry.evidence[0].sha256Seal, 'abcdef1234567890abcdef12');
    });

    test('provisions Horus-09 droid equipped with spatial tools in default family', () => {
      const testUser = {
        id: 'user_droid_family_test',
        email: 'commander@aiheaven.test'
      };
      const family = droidFamilyService.getOrCreateFamily(testUser);
      const horus = family.members.find(m => m.droidId === 'horus_09');
      assert.ok(horus, 'Horus-09 droid must exist in default family');
      assert.equal(horus.codename, 'EYE_OF_RA');
      assert.ok(horus.allowedTools.includes('tool_geoint_aircraft'));
      assert.ok(horus.allowedTools.includes('tool_geoint_satellites'));
    });

    test('enforces deduplication and tenant isolation in SOURCE pool for spatial observations', async () => {
      const userAlpha = { id: 'usr_alpha', email: 'alpha@aiheaven.test' };
      const userBeta = { id: 'usr_beta', email: 'beta@aiheaven.test' };

      const entity = {
        id: 'sat_starlink_unique',
        category: 'satellite' as const,
        name: 'STARLINK-40192',
        position: { latitude: 12.0, longitude: 45.0, altitudeMeters: 550000 },
        timestamp: new Date().toISOString(),
        sourceProvider: 'CelesTrak',
        dataStatus: 'estimated' as const,
        verificationStatus: 'VERIFIED' as const,
        sha256EvidenceSeal: 'fedcba0987654321fedcba09',
        metadata: { noradId: 58000 }
      };

      // User Alpha deposits
      const entry1 = await geointSourceBridge.depositEntityToSource(userAlpha, entity, 'Alpha observation');
      // Duplicate deposit by User Alpha returns existing entry
      const entry2 = await geointSourceBridge.depositEntityToSource(userAlpha, entity, 'Alpha observation duplicate');
      assert.equal(entry1.id, entry2.id, 'Deduplication must prevent duplicate entries for identical observations');

      // User Beta cannot retrieve User Alpha private observation
      const familyBeta = droidFamilyService.getOrCreateFamily(userBeta);
      const searchBeta = sourceKnowledgeService.searchKnowledge({
        familyId: familyBeta.familyId,
        query: 'STARLINK-40192'
      });
      assert.equal(searchBeta.entries.length, 0, 'Tenant isolation must prevent cross-family observation leaks');
    });
  });

  // =========================================================================
  // 6. CENTRAL BRAIN REQUEST CLASSIFICATION
  // =========================================================================
  describe('6. Central Brain Request Classification & Routing', () => {
    test('classifies geographic and situational-awareness queries into geoint domain', () => {
      const q1 = centralBrainService.classifyRequest('Show me active satellites passing over Silicon Valley');
      assert.equal(q1.domain, 'geoint');

      const q2 = centralBrainService.classifyRequest('Eyes for all status and current earthquakes');
      assert.equal(q2.domain, 'geoint');

      const q3 = centralBrainService.classifyRequest('What is the current flight ADS-B telemetry?');
      assert.equal(q3.domain, 'geoint');
    });

    test('processes geoint chat turn with live telemetry summary and evidence seals', async () => {
      const thread = centralBrainService.createConversation('GEOINT Test Chat');
      const outcome = await centralBrainService.processChatTurn(thread.id, '/eyes status');
      assert.ok(outcome.assistantMessage.content.includes('Eyes for All — World Situational Intelligence'));
      assert.ok(outcome.assistantMessage.content.includes('Horus-09 (EYE_OF_RA)'));
      assert.ok(outcome.assistantMessage.content.includes('SHA-256'));
    });
  });

  // =========================================================================
  // 7. REST API ENDPOINTS
  // =========================================================================
  describe('7. Eyes for All REST API Endpoints', () => {
    test('GET /api/geoint/status returns operational status and provider list', async () => {
      const res = await fetch(`${baseUrl}/geoint/status`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.service, 'Eyes for All — World Situational Intelligence');
      assert.equal(data.status, 'operational');
      assert.ok(Array.isArray(data.providers));
    });

    test('GET /api/geoint/layers returns layer configurations and attributions', async () => {
      const res = await fetch(`${baseUrl}/geoint/layers`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      const layerIds = data.map((l: any) => l.id);
      assert.ok(layerIds.includes('aircraft'));
      assert.ok(layerIds.includes('satellite'));
      assert.ok(layerIds.includes('earthquake'));
    });

    test('GET /api/geoint/entities returns spatial entities with filtering', async () => {
      const res = await fetch(`${baseUrl}/geoint/entities?categories=satellite,earthquake&limit=10`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(typeof data.count === 'number');
      assert.ok(Array.isArray(data.entities));
    });

    test('POST /api/geoint/predict-satellite-pass returns orbital calculation', async () => {
      const res = await fetch(`${baseUrl}/geoint/predict-satellite-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 37.7749, longitude: -122.4194, locationName: 'SF Bay' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.passes));
    });

    test('POST /api/geoint/correlate returns spatial risk report', async () => {
      const res = await fetch(`${baseUrl}/geoint/correlate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetName: 'Ashburn Datacenter Alley',
          targetLat: 39.0438,
          targetLon: -77.4874,
          radiusKm: 200
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.id.startsWith('rep_'));
      assert.ok(Array.isArray(data.correlations));
    });

    test('POST /api/geoint/source/deposit stores entity and returns 201', async () => {
      const res = await fetch(`${baseUrl}/geoint/source/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: {
            id: 'sat_test_iss_01',
            category: 'satellite',
            name: 'ISS (ZARYA)',
            position: { latitude: 20.0, longitude: 45.0, altitudeMeters: 420000 },
            timestamp: new Date().toISOString(),
            sourceProvider: 'CelesTrak / NORAD GP Elements',
            dataStatus: 'estimated',
            verificationStatus: 'VERIFIED',
            sha256EvidenceSeal: '11223344556677889900aabb',
            metadata: { noradId: 25544 }
          },
          analystNotes: 'Verified LEO transit.'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.sourceEntryId.startsWith('src_'));
    });

    test('GET /api/geoint/mcp discovers mcp_geoint server and tools', async () => {
      const res = await fetch(`${baseUrl}/geoint/mcp`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.server.id, 'mcp_geoint');
      assert.ok(Array.isArray(data.tools));
    });
  });
});
