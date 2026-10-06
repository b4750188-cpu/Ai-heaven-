import { IngestionLog, IngestionResult, ISourceConnector, SourceConnectorConfig } from '../../types/connector';
import { Resource, ResourceRelationship } from '../../types/resource';

export abstract class BaseSourceConnector implements ISourceConnector {
  abstract config: SourceConnectorConfig;
  protected logs: IngestionLog[] = [];

  protected log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: Record<string, unknown>) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    });
  }

  abstract discover(): Promise<string[]>;
  abstract fetch(identifier: string): Promise<Record<string, unknown>>;
  abstract normalize(raw: Record<string, unknown>): Promise<Resource>;

  async validate(resource: Resource): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!resource.id || !resource.slug) errors.push('Missing unique identifier or slug');
    if (!resource.name) errors.push('Missing resource name');
    if (!resource.source_url) errors.push('Missing authoritative source URL');
    if (!resource.documentation_url) errors.push('Missing documentation URL');
    if (!resource.agent_contract?.what_is_it) errors.push('Missing required agent contract: what_is_it');
    if (typeof resource.trust_score !== 'number' || resource.trust_score < 0 || resource.trust_score > 100) {
      errors.push('Trust score must be a number between 0 and 100');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async deduplicate(
    resource: Resource,
    existingResources: Resource[]
  ): Promise<{ isDuplicate: boolean; matchedId?: string }> {
    // Check canonical URL match
    const bySourceUrl = existingResources.find(
      r => r.source_url.toLowerCase() === resource.source_url.toLowerCase()
    );
    if (bySourceUrl) return { isDuplicate: true, matchedId: bySourceUrl.id };

    // Check slug match
    const bySlug = existingResources.find(
      r => r.slug.toLowerCase() === resource.slug.toLowerCase()
    );
    if (bySlug) return { isDuplicate: true, matchedId: bySlug.id };

    // Check official external identifier
    if (resource.external_identifiers) {
      for (const [key, val] of Object.entries(resource.external_identifiers)) {
        if (!val) continue;
        // Only treat specific identifying keys as uniqueness identifiers (avoid matching generic publisher/source domains)
        const isUniqueKey = key.includes('id') || key.includes('full_name') || key.includes('canonical') || key.includes('spec_url');
        if (isUniqueKey) {
          const byIdentifier = existingResources.find(
            r => r.external_identifiers && r.external_identifiers[key] === val
          );
          if (byIdentifier) return { isDuplicate: true, matchedId: byIdentifier.id };
        }
      }
    }

    return { isDuplicate: false };
  }

  abstract extract_relationships(resource: Resource): Promise<ResourceRelationship[]>;

  async verify(resource: Resource): Promise<{ verified: boolean; trust_score: number; audit_source: string }> {
    // Server-level validation: verify source domain against provider whitelist
    const parsedUrl = new URL(resource.source_url);
    const isDomainAuthoritative = parsedUrl.hostname.endsWith(this.config.official_domain);

    const verified = isDomainAuthoritative && Boolean(resource.documentation_url);
    const trust_score = verified ? 96 : 40;

    return {
      verified,
      trust_score,
      audit_source: `Domain whitelist verified: ${this.config.official_domain}`
    };
  }

  async sync(): Promise<IngestionResult> {
    const started_at = new Date().toISOString();
    this.logs = [];
    this.log('info', `Initializing synchronization for connector: ${this.config.name}`);

    const ingestedResources: Resource[] = [];
    const extractedRelationships: ResourceRelationship[] = [];
    let deduplicated_count = 0;

    try {
      this.log('info', `Running discovery phase on ${this.config.target_source}...`);
      const identifiers = await this.discover();
      this.log('info', `Discovered ${identifiers.length} candidate resource identifiers.`);

      for (const id of identifiers) {
        this.log('info', `Fetching raw metadata for: ${id}`);
        const raw = await this.fetch(id);

        this.log('info', `Normalizing schema for: ${id}`);
        const normalized = await this.normalize(raw);

        const validation = await this.validate(normalized);
        if (!validation.valid) {
          this.log('warn', `Validation failed for ${id}: ${validation.errors.join(', ')}`);
          continue;
        }

        const dedup = await this.deduplicate(normalized, ingestedResources);
        if (dedup.isDuplicate) {
          deduplicated_count++;
          this.log('info', `Deduplicated existing record: ${id} matches ${dedup.matchedId}`);
          continue;
        }

        const verification = await this.verify(normalized);
        normalized.verification_status = verification.verified ? 'verified' : 'unverified';
        normalized.trust_score = verification.trust_score;

        const rels = await this.extract_relationships(normalized);
        extractedRelationships.push(...rels);
        ingestedResources.push(normalized);

        this.log('success', `Successfully processed and verified: ${normalized.name}`);
      }

      const completed_at = new Date().toISOString();
      return {
        connector_id: this.config.id,
        connector_name: this.config.name,
        started_at,
        completed_at,
        status: 'success',
        discovered_count: identifiers.length,
        normalized_count: ingestedResources.length,
        deduplicated_count,
        relationships_extracted: extractedRelationships.length,
        resources: ingestedResources,
        relationships: extractedRelationships,
        logs: this.logs
      };
    } catch (err: any) {
      this.log('error', `Sync failed with exception: ${err.message}`);
      return {
        connector_id: this.config.id,
        connector_name: this.config.name,
        started_at,
        completed_at: new Date().toISOString(),
        status: 'failed',
        discovered_count: 0,
        normalized_count: 0,
        deduplicated_count: 0,
        relationships_extracted: 0,
        resources: [],
        relationships: [],
        logs: this.logs
      };
    }
  }
}
