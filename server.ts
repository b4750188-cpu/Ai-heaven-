/**
 * AI HEAVEN - Full-Stack Dev Server & Standalone Production Launcher
 * Runs the Express API runtime and mounts Vite middlewares (dev) or static dist (prod) on port 3000.
 */

import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import { app as apiApp, createExpressApp } from './src/api/app';

const PORT = 3000;
const HOST = '0.0.0.0';

export { apiApp, createExpressApp };

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    process.env.VITE_DEV_SERVER = 'true';
  }
  const app = createExpressApp();

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html with Vite client, React refresh preamble, and iframe security headers
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/health') || url.includes('.')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app https://aistudio.google.com https://*.aistudio.google.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        );
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
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

process.on('uncaughtException', (err) => {
  console.error('[AI Heaven Server] Uncaught exception intercepted (preventing crash):', err?.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[AI Heaven Server] Unhandled rejection intercepted (preventing crash):', reason);
});

const isMainModule = Boolean(process.argv[1] && (
  process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')
));

if (isMainModule && !process.env.VERCEL) {
  startServer().catch(err => {
    console.error('[AI Heaven] Server startup error:', err);
  });
}
