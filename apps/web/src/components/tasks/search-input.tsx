'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * How long typing must pause before the search is issued.
 *
 * 300ms sits mid-range: short enough to feel immediate, long enough that an
 * average typist produces one request per word rather than one per keystroke.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search input with debounce.
 *
 * The field keeps its own state so typing stays responsive, and only pushes to
 * the URL once the user pauses — otherwise every keystroke is a request and a
 * history write.
 *
 * The search term itself goes to the API, which matches it against task title,
 * description and label names in MongoDB. The browser never filters the loaded
 * page, so a match on task 500 of 500 is still found.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search tasks…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  // Re-sync when the URL changes from outside — a reset, or the back button.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;

    const timer = setTimeout(() => onChange(draft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label="Search tasks"
        className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Board / List toggle. */
