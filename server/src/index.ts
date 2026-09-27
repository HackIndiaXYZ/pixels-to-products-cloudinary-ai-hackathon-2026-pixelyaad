import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { photosRouter } from './photos.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'pixelyaad' });
});

app.use('/api/photos', photosRouter);

// Serve the built web app when present (run `npm run build` in web/).
// In dev, the Vite dev server proxies /api/* here instead.
const webDist = path.resolve(process.cwd(), '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ ok: true, hint: 'Run `npm run build` in web/ to serve the UI from this server.' });
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Pixelyaad server listening on http://localhost:${PORT}`);
});
