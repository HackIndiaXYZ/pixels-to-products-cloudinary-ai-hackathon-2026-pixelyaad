import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface PhotoRecord {
  id: string;
  publicId: string;
  tags: string[];
  caption: string;
  createdAt: string;
  /** Public share token; when set, the photo is viewable via /share/:token. */
  shareToken?: string | null;
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'photos.json');

async function readAll(): Promise<PhotoRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { photos?: unknown }).photos)) {
      return (parsed as { photos: PhotoRecord[] }).photos;
    }
    return [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

/** Atomic write: temp file + rename, so a crash never leaves half-written JSON. */
async function writeAll(photos: PhotoRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ photos }, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

export async function listPhotos(): Promise<PhotoRecord[]> {
  const photos = await readAll();
  return photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addPhoto(photo: PhotoRecord): Promise<PhotoRecord> {
  const photos = await readAll();
  photos.push(photo);
  await writeAll(photos);
  return photo;
}

export async function deletePhoto(id: string): Promise<boolean> {
  const photos = await readAll();
  const next = photos.filter((p) => p.id !== id);
  if (next.length === photos.length) return false;
  await writeAll(next);
  return true;
}

/** Set (or revoke with null) the public share token for a photo. */
export async function setShareToken(id: string, token: string | null): Promise<PhotoRecord | null> {
  const photos = await readAll();
  const photo = photos.find((p) => p.id === id);
  if (!photo) return null;
  photo.shareToken = token;
  await writeAll(photos);
  return photo;
}

/** Public lookup for shared links — never exposes internal ids. */
export async function findByShareToken(token: string): Promise<PhotoRecord | null> {
  const photos = await readAll();
  return photos.find((p) => p.shareToken === token) ?? null;
}

export async function searchPhotos(query: string): Promise<PhotoRecord[]> {  const q = query.trim().toLowerCase();
  if (!q) return [];
  const photos = await readAll();
  return photos
    .filter(
      (p) =>
        p.caption.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
