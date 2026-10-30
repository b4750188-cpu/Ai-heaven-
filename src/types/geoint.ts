/**
 * AI HEAVEN — Eyes for All: World Intelligence & Situational Awareness Contracts
 * Upstream Reference: God's Eye View (https://github.com/bilawalsidhu/gods-eye-view)
 * License Compatibility: MIT / Apache-2.0 Clean-Room Architecture
 */

export type GeointCategory =
  | 'aircraft'
  | 'maritime'
  | 'satellite'
  | 'earthquake'
  | 'wildfire'
  | 'severe_weather';

export type GeointDataStatus =
  | 'live'        // Real-time or near real-time feed (< 5 min latency)
  | 'delayed'     // Public delayed feed (e.g. 5-15 min delay enforced by provider)
  | 'estimated'   // Calculated/extrapolated position (e.g. Keplerian SGP4 orbital propagation)
  | 'historical'; // Archived/retrospective observation

export type GeointVerificationStatus =
  | 'VERIFIED'    // Formally validated against official authoritative feed (USGS, OpenSky, CelesTrak, NASA)
  | 'UNVERIFIED'  // Raw observation pending multi-source validation
  | 'CORRELATED';  // Linked with known AI Heaven infrastructure, targets, or security incidents

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
  sourceProvider: string;   // 'USGS' | 'OpenSky' | 'CelesTrak' | 'NASA_EONET' | 'OpenMeteo' | 'AIS_Open'
  dataStatus: GeointDataStatus;
  verificationStatus: GeointVerificationStatus;
  sha256EvidenceSeal: string;
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
