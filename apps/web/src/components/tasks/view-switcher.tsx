'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { TaskView } from '@/lib/tasks/use-task-filters';

export function ViewSwitcher({
  view,
  onChange,
}: {
  view: TaskView;
  onChange: (view: TaskView) => void;
}) {
  const options: Array<{ value: TaskView; label: string; icon: React.ReactNode }> = [
    { value: 'board', label: 'Board', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      role="group"
      aria-label="View"
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={view === option.value}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
            view === option.value
              ? 'bg-primary-muted text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Midnight UTC on the given day, as the API's date filters expect. */
