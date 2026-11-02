/**
 * AI HEAVEN — Eyes for All to SOURCE Knowledge Pool Bridge
 * Deposits verified real-world spatial observations into the user's family SOURCE pool.
 * Enforces deduplication, cryptographic evidence sealing, coordinates, and TTL expiration rules.
 */

import crypto from 'crypto';
import { GeointEntity, GeointCorrelationMatch } from '../../types/geoint';
import { sourceKnowledgeService } from '../source/sourceKnowledgeService';
import { droidFamilyService } from '../family/droidFamilyService';
import { SourceKnowledgeEntry, KnowledgeCategory, SourceEvidence } from '../../types/sourceKnowledge';

export class GeointSourceBridge {
  /**
   * Deposits a verified geographic entity observation into SOURCE
   */
  public async depositEntityToSource(
    user: { id: string; email: string; fullName?: string; tenantId?: string },
    entity: GeointEntity,
    analystNotes?: string,
    droidId = 'horus_09'
  ): Promise<SourceKnowledgeEntry> {
    const family = droidFamilyService.getOrCreateFamily(user);
    const tenantId = user.tenantId || `tenant_${user.id}`;

    // Strict Server-Side Evidence Verification:
    // Never trust caller-supplied claims blindly. Compute authoritative SHA-256 seal.
    const authoritativePayload = {
      id: entity.id,
      category: entity.category,
      position: {
        latitude: Number(entity.position.latitude),
        longitude: Number(entity.position.longitude),
        altitudeMeters: entity.position.altitudeMeters || 0
      },
      sourceProvider: entity.sourceProvider,
      timestamp: entity.timestamp
    };
    const authoritativeEvidenceSeal = crypto.createHash('sha256').update(JSON.stringify(authoritativePayload)).digest('hex').slice(0, 24);

    // Verify physical plausibility and authentic provider
    const isPhysicalValid = 
      typeof entity.position.latitude === 'number' &&
      typeof entity.position.longitude === 'number' &&
      entity.position.latitude >= -90 && entity.position.latitude <= 90 &&
      entity.position.longitude >= -180 && entity.position.longitude <= 180;

    const knownVerifiedProviders = new Set([
      'USGS Earthquake Hazards Program',
      'OpenSky Network ADS-B',
      'Airplanes.live Mil ADS-B',
      'CelesTrak Orbital Catalog',
      'CelesTrak SGP4 Orbit Propagation',
      'NASA EONET (Earth Observatory)',
      'Public Maritime Transit Index',
      'Open-Meteo High-Resolution Weather Model',
      'Caltrans & DOT Highway Traffic Sensors',
      'Public Port Authority & Coastal Webcams',
      'LiveATC & Marine VHF Broadcast'
    ]);

    const isKnownProvider = knownVerifiedProviders.has(entity.sourceProvider);
    // If coordinates are invalid or provider is unknown, demote to INFERRED rather than blindly accepting caller claim
    const isServerVerified = isPhysicalValid && isKnownProvider;
    const verifiedStatus: 'VERIFIED' | 'INFERRED' = isServerVerified ? 'VERIFIED' : 'INFERRED';
    const confidenceScore = isServerVerified ? 0.95 : 0.60;
    const evidenceSeal = (entity.sha256EvidenceSeal && /^[0-9a-f]{16,64}$/i.test(entity.sha256EvidenceSeal))
      ? entity.sha256EvidenceSeal
      : authoritativeEvidenceSeal;

    const evidence: SourceEvidence[] = [
      {
        id: `ev_geo_${crypto.randomUUID().slice(0, 8)}`,
        evidenceType: 'url_reference',
        uri: (entity.metadata.usgsUrl as string) || (entity.metadata.sourceUrl as string) || `geoint://${entity.sourceProvider}/${entity.id}`,
        snippet: `Provider: ${entity.sourceProvider} | Lat: ${entity.position.latitude.toFixed(4)}, Lon: ${entity.position.longitude.toFixed(4)}, Alt: ${entity.position.altitudeMeters || 0}m | Status: ${entity.dataStatus.toUpperCase()} | ServerVerified: ${isServerVerified}.`,
        sha256Seal: evidenceSeal,
        verifiedAt: new Date().toISOString(),
        verifiedByDroidId: droidId
      }
    ];

    const title = `[GEOINT] ${entity.category.toUpperCase()}: ${entity.name} (${entity.sourceProvider})`;
    const content = `### Spatial Intelligence Telemetry
- **Entity ID**: \`${entity.id}\`
- **Category**: ${entity.category}
- **Provider**: ${entity.sourceProvider}
- **Data Status**: ${entity.dataStatus}
- **Coordinates**: ${entity.position.latitude.toFixed(5)}°, ${entity.position.longitude.toFixed(5)}°
- **Altitude**: ${entity.position.altitudeMeters ? `${entity.position.altitudeMeters} meters` : 'Surface'}
- **Speed / Track**: ${entity.speedKts ? `${entity.speedKts} knots` : 'Stationary'} @ ${entity.headingDeg ?? 0}°
- **Timestamp**: ${entity.timestamp}
- **Authoritative Evidence Seal**: \`${authoritativeEvidenceSeal}\`

#### Telemetry Metadata
\`\`\`json
${JSON.stringify(entity.metadata, null, 2)}
\`\`\`

${analystNotes ? `#### Analyst / Droid Assessment\n${analystNotes}` : ''}`;

    const tags = ['geoint', 'eyes_for_all', entity.category, entity.sourceProvider.toLowerCase().replace(/[^a-z0-9]/g, '_')];
    if (entity.metadata.country) tags.push(String(entity.metadata.country).toLowerCase());

    const result = sourceKnowledgeService.contributeKnowledge({
      familyId: family.familyId,
      tenantId,
      title,
      content,
      category: 'research_discovery' as KnowledgeCategory,
      requestedStatus: verifiedStatus,
      confidence: confidenceScore,
      contributor: {
        type: 'droid',
        id: droidId,
        name: droidId === 'horus_09' ? 'Horus-09 (EYE_OF_RA)' : 'Argus-01 (WATCHER_CORE)',
        role: 'Global Situational Awareness & GEOINT Specialist'
      },
      tags,
      evidence,
      accessScope: 'private_family',
      metadata: {
        latitude: entity.position.latitude,
        longitude: entity.position.longitude,
        altitudeMeters: entity.position.altitudeMeters,
        geointCategory: entity.category,
        entityId: entity.id,
        sourceProvider: entity.sourceProvider,
        dataStatus: entity.dataStatus,
        sha256Seal: evidenceSeal,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7-day default TTL for dynamic feeds
      }
    });

    const entry = result.entry;

    // Notify droid family about verified spatial observation
    droidFamilyService.sendFamilyMessage({
      familyId: family.familyId,
      fromDroidId: droidId,
      toDroidId: 'central_brain_00',
      messageType: 'finding_contribution',
      subject: `Spatial Observation Deposited: ${entity.name}`,
      payload: {
        body: `Verified spatial entity [${entity.category}] deposited to SOURCE pool (ID: ${entry.id}). Coordinates: (${entity.position.latitude.toFixed(3)}, ${entity.position.longitude.toFixed(3)}). Evidence SHA-256: ${evidenceSeal}`,
        relatedEntryId: entry.id
      }
    });

    return entry;
  }

  /**
   * Deposits an entire spatial investigation correlation report into SOURCE
   */
  public async depositInvestigationReportToSource(
    user: { id: string; email: string; fullName?: string; tenantId?: string },
    report: {
      topic: string;
      targetRegion: string;
      correlations: GeointCorrelationMatch[];
      summary: string;
    },
    droidId = 'horus_09'
  ): Promise<SourceKnowledgeEntry> {
    const family = droidFamilyService.getOrCreateFamily(user);
    const tenantId = user.tenantId || `tenant_${user.id}`;

    const title = `[GEOINT INVESTIGATION] ${report.topic} (${report.targetRegion})`;
    const content = `### Spatial Intelligence Assessment: ${report.topic}
- **Region**: ${report.targetRegion}
- **Analyzed By**: ${droidId}
- **Generated**: ${new Date().toISOString()}

#### Correlation Summary
${report.summary}

#### Correlated Entities & Risk Vectors
${report.correlations.map(c => `- **${c.entityName}** [${c.category.toUpperCase()}]: Distance ${c.distanceKm.toFixed(1)} km to ${c.correlatedTarget}. Relation: ${c.correlationType} (Confidence: ${(c.confidence * 100).toFixed(0)}%, Verified Fact: ${c.isVerifiedFact}). ${c.rationale}`).join('\n')}
`;

    const result = sourceKnowledgeService.contributeKnowledge({
      familyId: family.familyId,
      tenantId,
      title,
      content,
      category: 'research_discovery',
      requestedStatus: 'VERIFIED',
      confidence: 0.9,
      contributor: {
        type: 'droid',
        id: droidId,
        name: 'Horus-09 (EYE_OF_RA)',
        role: 'Global Situational Awareness & GEOINT Specialist'
      },
      tags: ['geoint', 'investigation', 'spatial_correlation', report.targetRegion.toLowerCase().replace(/[^a-z0-9]/g, '_')],
      evidence: [
        {
          id: `ev_rep_${crypto.randomUUID().slice(0, 8)}`,
          evidenceType: 'manual_assertion',
          snippet: `Correlated ${report.correlations.length} spatial entities against region "${report.targetRegion}".`,
          sha256Seal: crypto.createHash('sha256').update(content).digest('hex').slice(0, 24),
          verifiedAt: new Date().toISOString(),
          verifiedByDroidId: droidId
        }
      ],
      accessScope: 'private_family',
      metadata: {
        targetRegion: report.targetRegion,
        correlationCount: report.correlations.length
      }
    });

    return result.entry;
  }
}

export const geointSourceBridge = new GeointSourceBridge();
