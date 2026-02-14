import express from 'express';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import bodyParser from 'body-parser';

// Import API handlers (using tsx to run them directly)
// We need to use dynamic imports or require consistently.
// Since we are in module mode (package.json type: module), we use imports.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
    const app = express();
    const port = 3000;

    // Middleware to parse JSON bodies (Vercel does this automatically)
    app.use(bodyParser.json());

    // --- API Routes Configuration ---
    // We need to wrap Vercel-style handlers (req, res) to work with Express
    const handleVercel = (handlerModule: any) => async (req: any, res: any) => {
        try {
            // Vercel handlers allow `res.status(code).json(body)`
            // Express supports this too, but let's ensure compatibility if needed.
            // The biggest difference is Vercel's helper methods on `res`.
            // Express `res` has .status() and .json() built-in.

            // Inject Vercel-specific helpers if missing (though Express covers most)
            await handlerModule.default(req, res);
        } catch (err: any) {
            console.error('API Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    };

    // Register API Routes manually
    // This mimics vercel.json rewrites locally

    app.post('/api/runs/start', async (req, res) => {
        const mod = await import('./api/runs/start.ts');
        await handleVercel(mod)(req, res);
    });

    // Helper to merge route params into query (mimic Vercel/Next.js)
    // using Proxy to avoid mutating read-only req properties
    const createProxyReq = (req: any, routeParams: any) => {
        return new Proxy(req, {
            get(target, prop, receiver) {
                if (prop === 'query') {
                    return { ...target.query, ...routeParams };
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    };

    app.post('/api/runs/:runId/steps/:step/execute', async (req, res) => {
        // Express params are in req.params, Vercel puts them in req.query sometimes for dynamic routes
        // But our code reads from req.query in some places or req.query in Vercel
        // Let's normalize: sync params to query for compatibility
        const proxyReq = createProxyReq(req, req.params);
        const mod = await import('./api/runs/[runId]/steps/[step]/execute.ts');
        await handleVercel(mod)(proxyReq, res);
    });

    app.post('/api/runs/:runId/steps/:step/confirm-read', async (req, res) => {
        const proxyReq = createProxyReq(req, req.params);
        const mod = await import('./api/runs/[runId]/steps/[step]/confirm-read.ts');
        await handleVercel(mod)(proxyReq, res);
    });

    app.get('/api/runs/:runId/steps/:step/pdf', async (req, res) => {
        const proxyReq = createProxyReq(req, req.params);
        const mod = await import('./api/runs/[runId]/steps/[step]/pdf.ts');
        await handleVercel(mod)(proxyReq, res);
    });


    // --- Vite Middleware for Frontend ---
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
    });

    app.use(vite.middlewares);

    app.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
        console.log(`> Local API Server running (v3.1 In-Memory)`);
    });
}

startServer();
