import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { captionLangLabel, suggestCaption, type CaptionLang } from '../lib/captions';
import { uploadUnsignedWithProgress } from '../lib/cloudinary';
import type { Photo } from '../lib/types';

interface StagedItem {
  id: string;
  fileName: string;
  previewUrl: string;
  status: 'uploading' | 'ready' | 'error' | 'saving' | 'saved';
  progress: number;
  publicId?: string;
  tags: string[];
  caption: string;
  error?: string;
}

interface Props {
  preset: string | undefined;
  disabled: boolean;
  onSaved: (photos: Photo[]) => void;
  notify: (msg: string, kind: 'ok' | 'err') => void;
}

let seq = 0;
const nextId = () => `staged-${Date.now()}-${seq++}`;

export default function Dropzone({ preset, disabled, onSaved, notify }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<StagedItem[]>([]);
  const [lang, setLang] = useState<CaptionLang>('en');
  const [dragging, setDragging] = useState(false);

  const patch = (id: string, p: Partial<StagedItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const uploadOne = async (item: StagedItem, useLang: CaptionLang) => {
    if (!preset) return;
    try {
      const result = await uploadUnsignedWithProgress(
        (item as StagedItem & { file: File }).file,
        preset,
        (pct) => patch(item.id, { progress: pct }),
      );
      const tags = Array.isArray(result.tags) ? result.tags : [];
      patch(item.id, {
        status: 'ready',
        progress: 100,
        publicId: result.public_id,
        tags,
        caption: suggestCaption(tags, useLang),
      });
    } catch (e) {
      patch(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || !preset || disabled) return;
    const fresh: (StagedItem & { file: File })[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 10)
      .map((file) => ({
        id: nextId(),
        file,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading' as const,
        progress: 0,
        tags: [],
        caption: '',
      }));
    if (fresh.length === 0) {
      notify('Sirf image files upload karo (jpg/png/webp)', 'err');
      return;
    }
    setItems((prev) => [...prev, ...fresh]);
    // Upload in parallel; each item reports its own progress.
    void Promise.all(fresh.map((it) => uploadOne(it, lang)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const flipLang = () => {
    const next: CaptionLang = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    // Re-suggest captions for staged items that haven't been manually edited
    // (heuristic: caption is empty or exactly matches the old suggestion).
    setItems((prev) =>
      prev.map((it) => {
        if (it.status !== 'ready') return it;
        const oldSug = suggestCaption(it.tags, lang);
        const untouched = it.caption.trim() === '' || it.caption === oldSug;
        return untouched ? { ...it, caption: suggestCaption(it.tags, next) } : it;
      }),
    );
  };

  const readyItems = items.filter((i) => i.status === 'ready');
  const busyCount = items.filter((i) => i.status === 'uploading' || i.status === 'saving').length;

  const saveAll = async () => {
    if (readyItems.length === 0) return;
    const saved: Photo[] = [];
    for (const it of readyItems) {
      patch(it.id, { status: 'saving' });
      try {
        const photo = await api.savePhoto({
          publicId: it.publicId!,
          tags: it.tags,
          caption: it.caption.trim(),
        });
        patch(it.id, { status: 'saved' });
        saved.push(photo);
      } catch (e) {
        patch(it.id, { status: 'error', error: e instanceof Error ? e.message : 'Save failed' });
      }
    }
    if (saved.length > 0) {
      onSaved(saved);
      notify(
        saved.length === 1 ? 'Yaad vault me save ho gayi ✨' : `${saved.length} yaadein vault me save ho gayin ✨`,
        'ok',
      );
      setItems((prev) => prev.filter((i) => i.status !== 'saved'));
    }
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
        dragging ? 'border-amber-300 bg-amber-400/10' : 'border-stone-700 bg-white/[0.02]'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="text-4xl">📷</div>
        <div>
          <p className="text-lg font-medium text-stone-100">Apni yaadein yahan drop karo</p>
          <p className="text-sm text-stone-400">
            Purani photo upload karo — AI tags, caption suggestion aur restore ke saath vault me save hogi.
          </p>
        </div>

        <div>
          <button
            type="button"
            disabled={disabled || busyCount > 0}
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyCount > 0 ? `Upload ho raha hai… (${busyCount})` : 'Photo chuno'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {items.length > 0 && (
          <div className="space-y-3 pt-2 text-left">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-200">
                {readyItems.length > 0
                  ? 'Review karo — caption edit kar sakte ho, phir save karo'
                  : 'Upload ho raha hai…'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={flipLang}
                  title="Caption language"
                  className="rounded-full border border-amber-400/40 px-3 py-1 text-xs text-amber-200 transition hover:bg-amber-400/10"
                >
                  {captionLangLabel(lang)} ⇄
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-full px-3 py-1 text-xs text-stone-500 transition hover:text-stone-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {items.map((it) => (
              <div
                key={it.id}
                className="flex gap-3 rounded-xl border border-stone-800 bg-black/40 p-3"
              >
                <img
                  src={it.previewUrl}
                  alt={it.fileName}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  {it.status === 'uploading' && (
                    <div className="space-y-2 pt-2">
                      <p className="truncate text-xs text-stone-400">{it.fileName}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${it.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-stone-500">{it.progress}%</p>
                    </div>
                  )}
                  {it.status === 'error' && (
                    <div className="space-y-1 pt-1">
                      <p className="truncate text-xs text-stone-400">{it.fileName}</p>
                      <p className="text-xs text-red-300">{it.error}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-xs text-stone-500 underline hover:text-stone-300"
                      >
                        Hatayo
                      </button>
                    </div>
                  )}
                  {(it.status === 'ready' || it.status === 'saving') && (
                    <div className="space-y-2">
                      {it.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {it.tags.slice(0, 6).map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        value={it.caption}
                        disabled={it.status === 'saving'}
                        onChange={(e) => patch(it.id, { caption: e.target.value })}
                        placeholder="Caption likho… (jaise: Dadi ke saath Diwali 1998)"
                        className="w-full rounded-lg border border-stone-700 bg-black/40 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-400/60 focus:outline-none"
                      />
                      {it.status === 'saving' && <p className="text-xs text-stone-500">Save ho raha hai…</p>}
                    </div>
                  )}
                </div>
                {it.status !== 'uploading' && it.status !== 'saving' && (
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    aria-label="Remove"
                    className="h-fit rounded-full px-2 py-1 text-stone-500 hover:bg-white/5 hover:text-stone-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {readyItems.length > 0 && (
              <button
                type="button"
                onClick={saveAll}
                className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                {readyItems.length === 1 ? 'Vault me save karo' : `${readyItems.length} photos vault me save karo`}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
