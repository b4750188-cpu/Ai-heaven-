/**
 * AI HEAVEN — Eyes for All Spatial Correlation Engine
 * Correlates real-time geospatial observations against targets, datacenters, and infrastructure.
 * Strictly distinguishes physical verified measurements from analytical hypotheses.
 */

import crypto from 'crypto';
import { geointDataService } from './geointDataService';
import {
  GeointCategory,
  GeointCorrelationMatch,
  GeointInvestigationReport
} from '../../types/geoint';

export class GeointCorrelationEngine {
  /**
   * Great-circle Haversine distance in kilometers
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Executes a multi-source correlation investigation for a geographic region or target coordinate
   */
  public async correlateTarget(
    targetName: string,
    targetLat: number,
    targetLon: number,
    radiusKm = 250,
    categories?: GeointCategory[]
  ): Promise<GeointInvestigationReport> {
    const reportId = `rep_${crypto.randomUUID().slice(0, 10)}`;
    const entities = await geointDataService.queryEntities({
      categories,
      limit: 300
    });

    const matches: GeointCorrelationMatch[] = [];

    for (const ent of entities) {
      const dist = this.calculateDistanceKm(
        targetLat,
        targetLon,
        ent.position.latitude,
        ent.position.longitude
      );

      if (dist <= radiusKm) {
        let correlationType: GeointCorrelationMatch['correlationType'] = 'geographic_proximity';
        let isVerifiedFact = true;
        let rationale = '';

        if (ent.category === 'earthquake') {
          correlationType = 'infrastructure_hazard';
          const mag = (ent.metadata.mag as number) || 0;
          rationale = `VERIFIED: Seismic event of magnitude ${mag.toFixed(1)} recorded by USGS at depth ${ent.metadata.depthKm || 0}km (${dist.toFixed(1)}km from target).`;
        } else if (ent.category === 'wildfire') {
          correlationType = 'infrastructure_hazard';
          rationale = `VERIFIED: Active thermal anomaly / wildfire detected by NASA EONET (${dist.toFixed(1)}km from target).`;
        } else if (ent.category === 'aircraft') {
          correlationType = 'airspace_overlap';
          rationale = `VERIFIED: Active transponder ${ent.callsign || ent.name} detected at altitude ${ent.metadata.altitudeFeet || 0}ft, ground speed ${ent.speedKts || 0}kts.`;
        } else if (ent.category === 'satellite') {
          correlationType = 'satellite_pass';
          isVerifiedFact = false; // Epistemic rule: orbital sub-satellite intersection is a mathematical projection, not physical radar contact
          rationale = `ANALYTICAL HYPOTHESIS: Orbital track of ${ent.name} (NORAD ${ent.metadata.noradId}) passes within ${dist.toFixed(1)}km ground projection. Potential surveillance or communications window.`;
        } else if (ent.category === 'maritime') {
          correlationType = 'geographic_proximity';
          rationale = `VERIFIED: Maritime vessel ${ent.name} transiting nearby waterway (${dist.toFixed(1)}km away).`;
        }

        matches.push({
          entityId: ent.id,
          entityName: ent.name,
          category: ent.category,
          distanceKm: dist,
          correlatedTarget: targetName,
          correlationType,
          confidence: isVerifiedFact ? 0.98 : 0.72,
          isVerifiedFact,
          rationale
        });
      }
    }

    // Sort by proximity
    matches.sort((a, b) => a.distanceKm - b.distanceKm);

    const verifiedCount = matches.filter(m => m.isVerifiedFact).length;
    const hypoCount = matches.filter(m => !m.isVerifiedFact).length;

    const summary = `Correlated ${matches.length} spatial entities within ${radiusKm}km of ${targetName} (${targetLat.toFixed(4)}, ${targetLon.toFixed(4)}). Detected ${verifiedCount} verified physical phenomena and ${hypoCount} analytical projections.`;

    return {
      id: reportId,
      topic: `Situational Awareness: ${targetName}`,
      targetRegion: `${targetName} (Radius: ${radiusKm}km)`,
      totalEntitiesAnalyzed: entities.length,
      correlations: matches.slice(0, 25),
      sourceEntriesDeposited: [],
      summary,
      timestamp: new Date().toISOString(),
      analystDroidId: 'horus_09'
    };
  }
}

export const geointCorrelationEngine = new GeointCorrelationEngine();
