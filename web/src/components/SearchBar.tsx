import { useState } from 'react';

interface Props {
  value: string;
  onSearch: (query: string) => void;
}

export default function SearchBar({ value, onSearch }: Props) {
  const [draft, setDraft] = useState(value);

  return (
    <form
      className="flex w-full gap-2 sm:w-80"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft);
      }}
    >
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Tag ya caption se dhoondo…"
        className="w-full rounded-full border border-stone-700 bg-black/40 px-4 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-400/60 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-400/10"
      >
        Search
      </button>
    </form>
  );
}
