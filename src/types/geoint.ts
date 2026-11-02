/**
 * AI HEAVEN — Eyes for All: World Intelligence & Situational Awareness Contracts
 * Upstream Reference: God's Eye View (https://github.com/bilawalsidhu/gods-eye-view)
 * License Compatibility: MIT Clean-Room Native Integration
 * 
 * Supports:
 * - 3D Globe with photorealistic Blue Marble / Tactical / Terrain / Graticule views
 * - Comprehensive live telemetry: Aircraft, Maritime, Satellites, Earthquakes, Fires, Weather,
 *   Public Webcams, Radio ATC/VHF, Urban Traffic Congestion
 * - Click-to-track & lock-on camera targeting with distance matrix & nearby contacts
 * - Cockpit mode with first-person perspective and flight instrument HUD
 * - FLIR Thermal IR, NVG Night Vision, Amber CRT, and Tactical Vector shader optical filters
 * - Voice commands interface for hands-free situational navigation
 * - Geospatial annotations, great-circle waypoint route planning, and sensor viewsheds
 * - Scene Director with timeline keyframe bookmarks and shareable scene JSON exports
 */

export type GeointCategory =
  | 'aircraft'
  | 'maritime'
  | 'satellite'
  | 'earthquake'
  | 'wildfire'
  | 'severe_weather'
  | 'public_camera'
  | 'radio_stream'
  | 'traffic_flow';

export type GeointDataStatus =
  | 'live'        // Real-time or near real-time feed (< 5 min latency)
  | 'delayed'     // Public delayed feed (e.g. 5-15 min delay enforced by provider)
  | 'estimated'   // Calculated/extrapolated position (e.g. Keplerian SGP4 orbital propagation)
  | 'historical'; // Archived/retrospective observation

export type GeointVerificationStatus =
  | 'VERIFIED'    // Formally validated against official authoritative feed (USGS, OpenSky, CelesTrak, NASA, Open-Meteo)
  | 'UNVERIFIED'  // Raw observation pending multi-source validation
  | 'CORRELATED'; // Linked with known AI Heaven infrastructure, targets, or security incidents

export interface GeoPoint {
  latitude: number;   // -90 to +90
  longitude: number;  // -180 to +180
  altitudeMeters?: number; // Geopotential altitude in meters above sea level
}

export interface GeointEntity {
  id: string;
  category: GeointCategory;
  name: string;
  callsign?: string;
  position: GeoPoint;
  headingDeg?: number;      // 0 to 360 degrees
  speedKts?: number;        // Ground speed in knots
  verticalRateFpm?: number; // Feet per minute
  timestamp: string;        // ISO 8601
  sourceProvider: string;   // 'USGS' | 'OpenSky' | 'CelesTrak' | 'NASA_EONET' | 'OpenMeteo' | 'AIS_Open' | 'LiveTraffic' | 'PublicCam' | 'VHF_ATC'
  dataStatus: GeointDataStatus;
  verificationStatus: GeointVerificationStatus;
  sha256EvidenceSeal: string;
  military?: boolean;
  squawk?: string;
  viewshed?: {
    fovDeg: number;
    rangeKm: number;
    azimuthDeg: number;
  };
  streamUrl?: string;
  cockpitCapable?: boolean;
  audioFrequencyMhz?: number;
  trafficCongestionLevel?: 'light' | 'moderate' | 'heavy' | 'gridlock';
  weatherConditions?: {
    temperatureC: number;
    windKts: number;
    windHeadingDeg: number;
    visibilityKm: number;
    precipitationMm: number;
    barometricHpa: number;
  };
  metadata: Record<string, unknown>;
}

export interface GeointLayerConfig {
  id: GeointCategory;
  name: string;
  description: string;
  isEnabled: boolean;
  activeEntityCount: number;
  lastUpdated?: string;
  attribution: string;
  attributionUrl: string;
  requiresKey: boolean;
  isKeyConfigured: boolean;
  rateLimitStatus: 'nominal' | 'approaching_limit' | 'rate_limited' | 'error';
}

export interface GeointQueryFilter {
  categories?: GeointCategory[];
  search?: string;
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  minMagnitude?: number; // For earthquakes (e.g. 2.5)
  limit?: number;        // Default 100, max 500
  militaryOnly?: boolean;
}

export interface SatellitePassPrediction {
  satelliteName: string;
  noradId: number;
  targetLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
  predictedPassTime: string;
  maxElevationDeg: number;
  durationSeconds: number;
  passType: 'visual' | 'radar_sar' | 'communication' | 'telemetry';
  sha256CalculationSeal: string;
  isAnalyticalPrediction: boolean; // Explicitly true: computed orbital projection, not physical radar detection
}

export interface GeointCorrelationMatch {
  entityId: string;
  entityName: string;
  category: GeointCategory;
  distanceKm: number;
  correlatedTarget: string;
  correlationType: 'geographic_proximity' | 'airspace_overlap' | 'infrastructure_hazard' | 'satellite_pass';
  confidence: number; // 0.0 - 1.0
  isVerifiedFact: boolean; // true = physical measurement; false = analytical hypothesis
  rationale: string;
}

export interface GeointInvestigationReport {
  id: string;
  topic: string;
  targetRegion: string;
  totalEntitiesAnalyzed: number;
  correlations: GeointCorrelationMatch[];
  sourceEntriesDeposited: string[];
  summary: string;
  timestamp: string;
  analystDroidId: string;
}

// -----------------------------------------------------------------------------
// GOD'S EYE VIEW ADVANCED ORIGINAL CAPABILITIES CONTRACTS
// -----------------------------------------------------------------------------

export interface NearbyContact {
  entity: GeointEntity;
  distanceKm: number;
  bearingDeg: number;
  relativeAltitudeMeters?: number;
  closingSpeedKts?: number;
}

export interface CockpitTelemetry {
  entityId: string;
  callsign: string;
  category: GeointCategory;
  altitudeMeters: number;
  altitudeFeet: number;
  airspeedKts: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  verticalSpeedFpm: number;
  gForce: number;
  latitude: number;
  longitude: number;
  nearestAirfieldOrPort?: string;
}

export interface GeospatialAnnotation {
  id: string;
  title: string;
  type: 'tactical_marker' | 'perimeter_fence' | 'hazard_zone' | 'sensor_viewshed';
  coordinates: GeoPoint[];
  color: string;
  notes: string;
  radiusKm?: number;
  createdBy: string;
  createdAt: string;
  tenantId: string;
}

export interface GeospatialRoute {
  id: string;
  name: string;
  waypoints: GeoPoint[];
  totalDistanceKm: number;
  totalDistanceNm: number;
  plannedSpeedKts: number;
  estimatedEnrouteHours: number;
  color: string;
  notes?: string;
}

export interface ViewshedFrustum {
  id: string;
  entityId: string;
  origin: GeoPoint;
  azimuthDeg: number;
  fovAngleDeg: number;
  rangeKm: number;
  visualColor: string;
  elevationAngleDeg?: number;
}

export interface SceneDirectorBookmark {
  id: string;
  name: string;
  timestamp: string;
  cameraPosition: { x: number; y: number; z: number };
  targetCoordinates: GeoPoint;
  targetEntityId?: string;
  opticMode: 'standard' | 'flir_thermal' | 'night_vision' | 'radar_hud' | 'amber_crt';
  globeImagery: 'blue_marble' | 'dark_tactical' | 'terrain' | 'graticule';
  activeCategories: GeointCategory[];
  notes?: string;
}

export interface ShareableSceneState {
  sceneId: string;
  title: string;
  description: string;
  exportedBy: string;
  exportedAt: string;
  sha256Seal: string;
  bookmarks: SceneDirectorBookmark[];
  annotations: GeospatialAnnotation[];
  routes: GeospatialRoute[];
}

export interface VoiceCommandIntent {
  recognizedText: string;
  action:
    | 'track_entity'
    | 'switch_optic_mode'
    | 'fly_to_location'
    | 'toggle_layer'
    | 'enter_cockpit'
    | 'exit_cockpit'
    | 'calculate_nearby'
    | 'reset_view';
  parameters: {
    targetEntityName?: string;
    targetLocationName?: string;
    opticMode?: 'standard' | 'flir_thermal' | 'night_vision' | 'radar_hud' | 'amber_crt';
    layerId?: GeointCategory;
    latitude?: number;
    longitude?: number;
  };
  confidence: number;
}
