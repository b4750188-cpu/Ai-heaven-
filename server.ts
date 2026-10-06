/**
 * AI HEAVEN - Full-Stack Express Server
 * Serves real REST API endpoints (/api/*) and mounts Vite SPA middlewares on port 3000.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { RESOURCES, PROVIDERS, RELATIONSHIPS } from './src/data/database.ts';
import { googleAISourceConnector } from './src/services/connectors/googleAIConnector.ts';
import { gitHubSourceConnector } from './src/services/connectors/githubConnector.ts';
import { mcpSourceConnector } from './src/services/connectors/mcpConnector.ts';

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

// In-memory runtime database initialized with authoritative records
let currentResources = [...RESOURCES];
let currentRelationships = [...RELATIONSHIPS];

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'AI Heaven Full-Stack Engine',
      environment: process.env.NODE_ENV || 'development',
      resources_count: currentResources.length,
      relationships_count: currentRelationships.length,
      timestamp: new Date().toISOString()
    });
  });

  // 2. Resources endpoint with filtering, search, and pagination
  app.get('/api/resources', (req: Request, res: Response) => {
    const {
      q,
      type,
      provider,
      verified_only,
      include_demo = 'true',
      limit = '50',
      offset = '0'
    } = req.query;

    let filtered = [...currentResources];

    if (include_demo === 'false') {
      filtered = filtered.filter(r => !r.provenance.is_demo_data);
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(r => r.resource_type === type);
    }

    if (provider && provider !== 'all') {
      filtered = filtered.filter(r => r.provider_id === provider);
    }

    if (verified_only === 'true') {
      filtered = filtered.filter(r => r.verification_status === 'verified');
    }

    if (typeof q === 'string' && q.trim()) {
      const query = q.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.slug.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.publisher.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query)) ||
        r.capabilities.some(c => c.toLowerCase().includes(query))
      );
    }

    const total = filtered.length;
    const numOffset = Math.max(0, parseInt(String(offset), 10) || 0);
    const numLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const items = filtered.slice(numOffset, numOffset + numLimit);

    res.json({
      items,
      total,
      limit: numLimit,
      offset: numOffset
    });
  });

  // 3. Resource Detail by Slug
  app.get('/api/resources/:slug', (req: Request, res: Response) => {
    const { slug } = req.params;
    const resource = currentResources.find(r => r.slug === slug || r.id === slug);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  });

  // 4. Resource Relationships
  app.get('/api/resources/:slug/relationships', (req: Request, res: Response) => {
    const { slug } = req.params;
    const rels = currentRelationships.filter(
      r => r.source_slug === slug || r.target_slug === slug
    );
    res.json(rels);
  });

  // 5. Providers endpoint
  app.get('/api/providers', (req: Request, res: Response) => {
    res.json(PROVIDERS);
  });

  // 6. Knowledge Graph endpoint
  app.get('/api/graph', (req: Request, res: Response) => {
    const nodes = currentResources.map(r => ({
      id: r.slug,
      slug: r.slug,
      name: r.name,
      resource_type: r.resource_type,
      provider_id: r.provider_id,
      trust_score: r.trust_score,
      verification_status: r.verification_status,
      is_demo_data: r.provenance.is_demo_data
    }));

    const edges = currentRelationships.map(rel => ({
      id: rel.id,
      source: rel.source_slug,
      target: rel.target_slug,
      relationship_type: rel.relationship_type,
      evidence_url: rel.evidence_url,
      confidence: rel.confidence,
      verified: rel.verified,
      description: rel.description
    }));

    res.json({ nodes, edges });
  });

  // 7. Trigger Live Ingestion Sync for a specific connector
  app.post('/api/connectors/:id/sync', async (req: Request, res: Response) => {
    const { id } = req.params;
    let connector;

    if (id === 'conn_google_ai') connector = googleAISourceConnector;
    else if (id === 'conn_github') connector = gitHubSourceConnector;
    else if (id === 'conn_mcp') connector = mcpSourceConnector;
    else {
      return res.status(404).json({ error: 'Unknown connector' });
    }

    try {
      const result = await connector.sync();

      // Upsert synchronized resources into current state
      result.resources.forEach(newRes => {
        const idx = currentResources.findIndex(r => r.slug === newRes.slug);
        if (idx >= 0) {
          currentResources[idx] = newRes;
        } else {
          currentResources.push(newRes);
        }
      });

      // Upsert relationships
      result.relationships.forEach(newRel => {
        const exists = currentRelationships.some(
          r => r.source_slug === newRel.source_slug && r.target_slug === newRel.target_slug
        );
        if (!exists) {
          currentRelationships.push(newRel);
        }
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite development middlewares for SPA hot-reloading
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[AI Heaven] Full-stack engine running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[AI Heaven] Server startup error:', err);
  process.exit(1);
});
