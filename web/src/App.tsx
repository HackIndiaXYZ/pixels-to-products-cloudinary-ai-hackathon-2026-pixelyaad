import { useCallback, useEffect, useState } from 'react';
import Dropzone from './components/Dropzone';
import Gallery from './components/Gallery';
import PhotoDetail from './components/PhotoDetail';
import SearchBar from './components/SearchBar';
import ShareView from './components/ShareView';
import { api } from './lib/api';
import { isCloudinaryConfigured } from './lib/cloudinary';
import type { Photo } from './lib/types';

const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

interface Toast {
  id: number;
  msg: string;
  kind: 'ok' | 'err';
}

let toastSeq = 0;

/** /share/:token → standalone public memory page (server serves index.html for it). */
function getShareToken(): string | null {
  const m = window.location.pathname.match(/^\/share\/([A-Za-z0-9_-]{1,64})$/);
  return m ? m[1] : null;
}

export default function App() {
  const [shareToken] = useState<string | null>(() => getShareToken());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const configured = isCloudinaryConfigured() && Boolean(UPLOAD_PRESET);

  const notify = useCallback((msg: string, kind: 'ok' | 'err') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-2), { id, msg, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const refresh = useCallback(async (q?: string) => {
    try {
      setLoading(true);
      setError(null);
      const list = q?.trim() ? await api.searchPhotos(q) : await api.listPhotos();
      setPhotos(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the Pixelyaad server. Is it running on :4000?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSearch = (q: string) => {
    setQuery(q);
    void refresh(q);
  };

  const handleSaved = useCallback(
    (saved: Photo[]) => {
      // Server returns newest-first; prepend in saved order.
      setPhotos((prev) => [...saved, ...prev]);
      if (query.trim()) {
        // Keep the view consistent with the active search.
        void refresh(query);
      }
    },
    [query, refresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deletePhoto(id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        setSelected(null);
        notify('Yaad delete ho gayi', 'ok');
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Delete failed', 'err');
      }
    },
    [notify],
  );

  const handleShareChange = useCallback((id: string, token: string | null) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, shareToken: token } : p)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, shareToken: token } : prev));
  }, []);

  // Public share route — renders the standalone memory page instead of the vault.
  if (shareToken) {
    return <ShareView token={shareToken} />;
  }

  return (
    <div className="hero-glow min-h-screen">
      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-full border px-5 py-2 text-sm shadow-lg backdrop-blur ${
              t.kind === 'ok'
                ? 'border-amber-400/40 bg-black/80 text-amber-200'
                : 'border-red-400/40 bg-black/80 text-red-200'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <header className="border-b border-amber-400/20 bg-black/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-amber-300">Pixelyaad</h1>
            <p className="text-xs text-stone-400">AI Photo Memory Vault · yaadein jo kabhi fade nahi hoti</p>
          </div>
          <span className="rounded-full border border-amber-400/30 px-3 py-1 text-xs text-amber-200">
            Track 1 · AI Media Pipelines
          </span>
        </div>
      </header>

      {!configured && (
        <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <div className="mx-auto max-w-6xl">
            <strong>Setup needed:</strong> copy <code className="text-amber-100">web/.env.example</code> to{' '}
            <code className="text-amber-100">web/.env</code> and fill{' '}
            <code className="text-amber-100">VITE_CLOUDINARY_CLOUD_NAME</code> +{' '}
            <code className="text-amber-100">VITE_CLOUDINARY_UPLOAD_PRESET</code> (unsigned preset), then
            restart the dev server.
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Dropzone preset={UPLOAD_PRESET} disabled={!configured} onSaved={handleSaved} notify={notify} />

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-stone-100">
              Your vault <span className="text-sm font-normal text-stone-400">({photos.length})</span>
            </h2>
            <SearchBar value={query} onSearch={handleSearch} />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6 text-center text-sm text-red-200">
              {error}
            </div>
          ) : (
            <Gallery photos={photos} loading={loading} onSelect={setSelected} />
          )}
        </section>
      </main>

      {selected && (
        <PhotoDetail
          photo={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onShareChange={handleShareChange}
        />
      )}
    </div>
  );
}
