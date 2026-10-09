/**
 * AI HEAVEN - Full-Stack Dev Server & Standalone Production Launcher
 * Runs the Express API runtime and mounts Vite middlewares (dev) or static dist (prod) on port 3000.
 */

import path from 'path';
import express, { Request, Response } from 'express';
import { app as apiApp, createExpressApp } from './src/api/app';

const PORT = 3000;
const HOST = '0.0.0.0';

export { apiApp, createExpressApp };

async function startServer() {
  const app = createExpressApp();

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[AI Heaven] Full-stack engine running on http://${HOST}:${PORT}`);
  });
}

const isMainModule = Boolean(process.argv[1] && (
  process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')
));

if (isMainModule && !process.env.VERCEL) {
  startServer().catch(err => {
    console.error('[AI Heaven] Server startup error:', err);
    process.exit(1);
  });
}
