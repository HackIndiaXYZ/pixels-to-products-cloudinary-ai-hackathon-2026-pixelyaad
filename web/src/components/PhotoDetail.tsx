import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { deliveryUrl, enhancedUrl, memoryCardUrl, restoreUrl } from '../lib/cloudinary';
import type { Photo } from '../lib/types';

interface Props {
  photo: Photo;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onShareChange: (id: string, token: string | null) => void;
}

type ViewMode = 'restored' | 'enhanced';

export default function PhotoDetail({ photo, onClose, onDelete, onShareChange }: Props) {
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState<ViewMode>('restored');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(photo.shareToken ?? null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // A different photo can reuse this dialog — keep the share panel in sync.
  useEffect(() => {
    setShareToken(photo.shareToken ?? null);
    setCopied(false);
  }, [photo.id, photo.shareToken]);

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null;

  const handleCreateShare = async () => {
    setShareBusy(true);
    try {
      const { token } = await api.createShare(photo.id);
      setShareToken(token);
      onShareChange(photo.id, token);
    } finally {
      setShareBusy(false);
    }
  };

  const handleRevokeShare = async () => {
    setShareBusy(true);
    try {
      await api.revokeShare(photo.id);
      setShareToken(null);
      onShareChange(photo.id, null);
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard API unavailable (non-secure context) — select the input instead.
      document.getElementById('share-url-input')?.focus();
      (document.getElementById('share-url-input') as HTMLInputElement | null)?.select();
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const before = deliveryUrl(photo.publicId);
  const after = mode === 'restored' ? restoreUrl(photo.publicId) : enhancedUrl(photo.publicId);
  const cardUrl = memoryCardUrl(photo.publicId, photo.caption);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(photo.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-400/20 bg-[#111116]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-800 px-5 py-3">
          <p className="truncate text-sm font-medium text-stone-200">{photo.caption || 'Bina caption'}</p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1 text-sm text-stone-400 hover:bg-white/5 hover:text-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Mode toggle: AI restore vs AI enhance */}
          <div className="flex justify-center gap-2">
            {(
              [
                { key: 'restored', label: '✨ AI Restore', hint: 'e_gen_restore' },
                { key: 'enhanced', label: '💡 AI Enhance', hint: 'e_improve' },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                title={m.hint}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  mode === m.key
                    ? 'bg-amber-400 font-semibold text-black'
                    : 'border border-stone-700 text-stone-300 hover:border-amber-400/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Before / after comparison slider */}
          <div>
            <div className="relative aspect-[4/3] select-none overflow-hidden rounded-xl border border-stone-800">
              <img src={after} alt="AI processed" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                <img src={before} alt="Original" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              </div>
              <div className="absolute inset-y-0 w-0.5 bg-amber-300" style={{ left: `${pos}%` }} />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-stone-200">Original</span>
              <span className="absolute right-3 top-3 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-black">
                {mode === 'restored' ? 'AI Restored' : 'AI Enhanced'}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                className="compare-slider absolute inset-x-4 bottom-3 w-[calc(100%-2rem)]"
                aria-label="Before/after comparison"
              />
            </div>
            <p className="mt-2 text-center text-xs text-stone-500">
              Slider ghumao — <code>{mode === 'restored' ? 'e_gen_restore' : 'e_improve'}</code> ka kamaal dekho
            </p>
          </div>

          {/* Tags */}
          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCardOpen((v) => !v)}
              className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              🖼️ Memory card {cardOpen ? 'chhupao' : 'dekho'}
            </button>
            <button
              type="button"
              onClick={handleCreateShare}
              disabled={shareBusy || Boolean(shareToken)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                shareToken
                  ? 'border-amber-400/50 bg-amber-400/10 font-semibold text-amber-200'
                  : 'border-stone-700 text-stone-300 hover:border-amber-400/40 hover:text-amber-200'
              } disabled:opacity-60`}
            >
              {shareBusy ? '…' : shareToken ? '🔗 Shared ✓' : '🔗 Share'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                confirmDelete
                  ? 'border-red-400/60 bg-red-400/10 font-semibold text-red-200 hover:bg-red-400/20'
                  : 'border-stone-700 text-stone-400 hover:border-red-400/40 hover:text-red-300'
              }`}
            >
              {deleting ? 'Delete ho raha…' : confirmDelete ? 'Pakka delete karna hai?' : 'Delete'}
            </button>
            <span className="text-xs text-stone-500">
              Saved {new Date(photo.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
          </div>

          {/* Share panel */}
          {shareUrl && (
            <div className="rounded-xl border border-amber-400/20 bg-black/40 p-4">
              <p className="mb-2 text-center text-xs text-stone-400">
                🔗 Public link — jiske paas yeh link hai woh yaad dekh sakta hai, bina login ke
              </p>
              <div className="flex gap-2">
                <input
                  id="share-url-input"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-black/60 px-3 py-2 text-xs text-amber-100"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-amber-300"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={handleRevokeShare}
                  disabled={shareBusy}
                  className="text-xs text-stone-500 underline-offset-2 hover:text-red-300 hover:underline disabled:opacity-60"
                >
                  Share revoke karo (link kaam karna band)
                </button>
              </div>
            </div>
          )}

          {/* Memory card preview */}
          {cardOpen && (
            <div className="rounded-xl border border-amber-400/20 bg-black/40 p-4">
              <p className="mb-3 text-center text-xs text-stone-400">
                4:5 shareable card — Cloudinary <code>l_text</code> overlay, real-time generated
              </p>
              <img
                src={cardUrl}
                alt="Memory card"
                className="mx-auto max-h-[480px] rounded-lg border border-stone-800"
                loading="lazy"
              />
              <div className="mt-3 text-center">
                <a
                  href={cardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-full border border-amber-400/40 px-5 py-2 text-sm text-amber-200 transition hover:bg-amber-400/10"
                >
                  Full size kholo ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
