import type { Photo, SharedPhoto } from './types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface NewPhoto {
  publicId: string;
  tags: string[];
  caption: string;
}

export const api = {
  health: () => req<{ ok: boolean; service: string }>('/api/health'),
  listPhotos: () => req<Photo[]>('/api/photos'),
  searchPhotos: (q: string) => req<Photo[]>(`/api/photos/search?q=${encodeURIComponent(q)}`),
  savePhoto: (photo: NewPhoto) =>
    req<Photo>('/api/photos', { method: 'POST', body: JSON.stringify(photo) }),
  deletePhoto: (id: string) => req<void>(`/api/photos/${id}`, { method: 'DELETE' }),
  createShare: (id: string) =>
    req<{ token: string }>(`/api/photos/${id}/share`, { method: 'POST' }),
  revokeShare: (id: string) => req<void>(`/api/photos/${id}/share`, { method: 'DELETE' }),
  getShared: (token: string) => req<SharedPhoto>(`/api/photos/shared/${token}`),
};
