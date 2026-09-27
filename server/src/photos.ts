import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { addPhoto, deletePhoto, listPhotos, searchPhotos, type PhotoRecord } from './store.js';

export const photosRouter = Router();

// GET /api/photos — newest first
photosRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listPhotos());
  } catch (err) {
    next(err);
  }
});

// GET /api/photos/search?q= — tag / caption match (case-insensitive)
photosRouter.get('/search', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    res.json(await searchPhotos(q));
  } catch (err) {
    next(err);
  }
});

// POST /api/photos — client sends the Cloudinary upload result (upload itself
// went direct browser → Cloudinary via the unsigned preset, so the server
// never needs the Cloudinary secret).
photosRouter.post('/', async (req, res, next) => {
  try {
    const { publicId, tags, caption } = (req.body ?? {}) as {
      publicId?: unknown;
      tags?: unknown;
      caption?: unknown;
    };
    if (typeof publicId !== 'string' || publicId.trim() === '') {
      res.status(400).json({ error: 'publicId is required' });
      return;
    }
    const record: PhotoRecord = {
      id: randomUUID(),
      publicId: publicId.trim(),
      tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
      caption: typeof caption === 'string' ? caption.slice(0, 500) : '',
      createdAt: new Date().toISOString(),
    };
    res.status(201).json(await addPhoto(record));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/photos/:id — remove a memory from the vault
photosRouter.delete('/:id', async (req, res, next) => {
  try {
    const ok = await deletePhoto(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
