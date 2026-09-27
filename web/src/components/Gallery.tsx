import { thumbnailUrl } from '../lib/cloudinary';
import type { Photo } from '../lib/types';

interface Props {
  photos: Photo[];
  loading: boolean;
  onSelect: (photo: Photo) => void;
}

export function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-stone-800 bg-black/40">
          <div className="aspect-square animate-pulse bg-stone-800/60" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-stone-800/60" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-stone-800/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Gallery({ photos, loading, onSelect }: Props) {
  if (loading) return <GallerySkeleton />;
  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-stone-800 bg-white/[0.02] p-12 text-center">
        <p className="text-stone-400">Abhi koi yaad nahi hai.</p>
        <p className="mt-1 text-sm text-stone-500">Upar photo upload karo — vault yahin banega.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect(photo)}
          className="group overflow-hidden rounded-xl border border-stone-800 bg-black/40 text-left transition hover:border-amber-400/40"
        >
          <div className="aspect-square overflow-hidden">
            <img
              src={thumbnailUrl(photo.publicId)}
              alt={photo.caption || photo.publicId}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div className="p-3">
            <p className="truncate text-sm text-stone-200">{photo.caption || 'Bina caption'}</p>
            {photo.tags.length > 0 && (
              <p className="mt-1 truncate text-xs text-amber-200/70">{photo.tags.slice(0, 3).join(' · ')}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
