import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { memoryCardUrl } from '../lib/cloudinary';
import type { SharedPhoto } from '../lib/types';

interface Props {
  token: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; photo: SharedPhoto };

/**
 * Standalone public page for a shared memory (/share/:token).
 * Rendered instead of the vault when the path matches — anyone with the
 * link sees this gold memory card, no account or app needed.
 */
export default function ShareView({ token }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .getShared(token)
      .then((photo) => {
        if (!cancelled) setState({ kind: 'ready', photo });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="hero-glow flex min-h-screen flex-col">
      <header className="border-b border-amber-400/20 bg-black/50 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-300">Pixelyaad</h1>
            <p className="text-xs text-stone-400">Shared memory · AI Photo Memory Vault</p>
          </div>
          <a
            href="/"
            className="rounded-full border border-amber-400/40 px-4 py-1.5 text-sm text-amber-200 transition hover:bg-amber-400/10"
          >
            Apni vault banao →
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-10">
        {state.kind === 'loading' && (
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-300" />
            <p className="text-sm text-stone-400">Yaad load ho rahi hai…</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="mt-16 max-w-md rounded-2xl border border-amber-400/20 bg-[#111116] p-8 text-center">
            <p className="text-4xl">🔗</p>
            <h2 className="mt-4 text-lg font-semibold text-stone-100">Yeh link kaam nahi kar raha</h2>
            <p className="mt-2 text-sm text-stone-400">
              Link galat hai ya owner ne share revoke kar diya hai. Owner se naya link maango.
            </p>
            <a
              href="/"
              className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Pixelyaad kholo
            </a>
          </div>
        )}

        {state.kind === 'ready' && (
          <article className="w-full overflow-hidden rounded-2xl border border-amber-400/25 bg-[#111116] shadow-[0_0_60px_-15px_rgba(251,191,36,0.3)]">
            <img
              src={memoryCardUrl(state.photo.publicId, state.photo.caption)}
              alt={state.photo.caption || 'Shared memory'}
              className="w-full object-cover"
            />
            <div className="space-y-4 p-6">
              {state.photo.caption && (
                <h2 className="text-center text-xl font-semibold text-amber-100">{state.photo.caption}</h2>
              )}
              {state.photo.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {state.photo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-center text-xs text-stone-500">
                💛 Shared from a Pixelyaad vault ·{' '}
                {new Date(state.photo.createdAt).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </article>
        )}
      </main>

      <footer className="border-t border-amber-400/10 px-4 py-5 text-center text-xs text-stone-500">
        Pixelyaad — AI Photo Memory Vault · yaadein jo kabhi fade nahi hoti
      </footer>
    </div>
  );
}
