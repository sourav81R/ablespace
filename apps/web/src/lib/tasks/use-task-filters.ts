'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Priority, TaskStatus } from '@ablespace/shared';
import type { TaskFilters } from '@/lib/api/use-tasks';

export type TaskView = 'board' | 'list';

/**
 * Filter state, held in the URL rather than in React state.
 *
 * This makes a filtered board refresh-safe, shareable and navigable with the
 * browser's back button — all of which come free once the query string is the
 * source of truth, and none of which work if the state lives in a component.
 */
export function useTaskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Splits a comma-separated parameter, keeping only recognised values. */
  const readEnum = useCallback(
    <T extends string>(key: string, allowed: readonly T[]): T[] | undefined => {
      const raw = searchParams.get(key);
      if (!raw) return undefined;

      const values = raw
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is T => (allowed as readonly string[]).includes(value));

      return values.length > 0 ? values : undefined;
    },
    [searchParams],
  );

  const filters: TaskFilters = useMemo(
    () => ({
      search: searchParams.get('search') ?? undefined,
      status: readEnum('status', Object.values(TaskStatus)),
      priority: readEnum('priority', Object.values(Priority)),
      memberId: searchParams.get('memberId') ?? undefined,
      labelId: searchParams.get('labelId') ?? undefined,
      reporterId: searchParams.get('reporterId') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      dueFrom: searchParams.get('dueFrom') ?? undefined,
      dueTo: searchParams.get('dueTo') ?? undefined,
    }),
    [searchParams, readEnum],
  );

  const view: TaskView = searchParams.get('view') === 'list' ? 'list' : 'board';

  /**
   * Writes parameters back to the URL.
   *
   * `replace` rather than `push`: typing in the search box would otherwise add
   * a history entry per keystroke and make the back button unusable.
   */
  const setParams = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        const serialised = Array.isArray(value) ? value.join(',') : value;
        if (!serialised) {
          next.delete(key);
        } else {
          next.set(key, serialised);
        }
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setView = useCallback(
    (nextView: TaskView) => setParams({ view: nextView === 'board' ? undefined : nextView }),
    [setParams],
  );

  /** Clears filters but keeps the chosen view, which is a display preference. */
  const reset = useCallback(() => {
    const next = new URLSearchParams();
    const currentView = searchParams.get('view');
    if (currentView) next.set('view', currentView);

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  /** True when any filter is applied — drives the "Reset" affordance. */
  const hasFilters = useMemo(
    () =>
      Object.entries(filters).some(
        ([, value]) => value !== undefined && (!Array.isArray(value) || value.length > 0),
      ),
    [filters],
  );

  return { filters, view, setParams, setView, reset, hasFilters };
}
