'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { Priority, TaskStatus } from '@ablespace/shared';
import { useLabels, useMembers, useProjects } from '@/lib/api/use-projects';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/components/ui/badge';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { TaskView } from '@/lib/tasks/use-task-filters';
import type { TaskFilters } from '@/lib/api/use-tasks';

/**
 * Search input with debounce.
 *
 * The field keeps its own state so typing stays responsive, and only pushes to
 * the URL once the user pauses — otherwise every keystroke is a request and a
 * history write.
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

    const timer = setTimeout(() => onChange(draft), 300);
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

/**
 * The Fields menu: the six filters the design lists.
 *
 * Multi-select for status and priority, single-select for the rest, matching
 * what the API's query DTO accepts.
 */
export function FieldsMenu({
  filters,
  onChange,
  onReset,
  hasFilters,
}: {
  filters: TaskFilters;
  onChange: (updates: Record<string, string | string[] | undefined>) => void;
  onReset: () => void;
  hasFilters: boolean;
}) {
  const labels = useLabels();
  const members = useMembers();
  const projects = useProjects();

  const toggleInArray = (current: string[] | undefined, value: string): string[] | undefined => {
    const set = new Set(current ?? []);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    return set.size > 0 ? [...set] : undefined;
  };

  const activeCount = [
    filters.status?.length,
    filters.priority?.length,
    filters.memberId ? 1 : 0,
    filters.labelId ? 1 : 0,
    filters.reporterId ? 1 : 0,
    filters.projectId ? 1 : 0,
  ].reduce<number>((total, value) => total + (value ?? 0), 0);

  return (
    <Dropdown
      align="end"
      className="max-h-[70vh] w-[260px] overflow-y-auto"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          className={cn(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeCount > 0
              ? 'border-primary/40 bg-primary-muted text-primary'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Fields
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-2xs text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
      )}
    >
      {() => (
        <>
          <DropdownLabel>Status</DropdownLabel>
          {Object.values(TaskStatus).map((status) => (
            <DropdownItem
              key={status}
              selected={filters.status?.includes(status)}
              onSelect={() => onChange({ status: toggleInArray(filters.status, status) })}
            >
              {STATUS_LABELS[status]}
            </DropdownItem>
          ))}

          <DropdownSeparator />
          <DropdownLabel>Priority</DropdownLabel>
          {Object.values(Priority).map((priority) => (
            <DropdownItem
              key={priority}
              selected={filters.priority?.includes(priority)}
              onSelect={() => onChange({ priority: toggleInArray(filters.priority, priority) })}
            >
              {PRIORITY_LABELS[priority]}
            </DropdownItem>
          ))}

          {members.data && members.data.length > 0 && (
            <>
              <DropdownSeparator />
              <DropdownLabel>Members</DropdownLabel>
              {members.data.map((member) => (
                <DropdownItem
                  key={member.id}
                  selected={filters.memberId === member.id}
                  onSelect={() =>
                    onChange({
                      memberId: filters.memberId === member.id ? undefined : member.id,
                    })
                  }
                >
                  {member.displayName}
                </DropdownItem>
              ))}

              <DropdownSeparator />
              <DropdownLabel>Reporter</DropdownLabel>
              {members.data.map((member) => (
                <DropdownItem
                  key={member.id}
                  selected={filters.reporterId === member.id}
                  onSelect={() =>
                    onChange({
                      reporterId: filters.reporterId === member.id ? undefined : member.id,
                    })
                  }
                >
                  {member.displayName}
                </DropdownItem>
              ))}
            </>
          )}

          {labels.data && labels.data.length > 0 && (
            <>
              <DropdownSeparator />
              <DropdownLabel>Labels</DropdownLabel>
              {labels.data.map((label) => (
                <DropdownItem
                  key={label.id}
                  selected={filters.labelId === label.id}
                  onSelect={() =>
                    onChange({ labelId: filters.labelId === label.id ? undefined : label.id })
                  }
                  icon={
                    <span
                      className="block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                  }
                >
                  {label.name}
                </DropdownItem>
              ))}
            </>
          )}

          {projects.data && projects.data.data.length > 0 && (
            <>
              <DropdownSeparator />
              <DropdownLabel>Project</DropdownLabel>
              {projects.data.data.map((project) => (
                <DropdownItem
                  key={project.id}
                  selected={filters.projectId === project.id}
                  onSelect={() =>
                    onChange({
                      projectId: filters.projectId === project.id ? undefined : project.id,
                    })
                  }
                >
                  {project.name}
                </DropdownItem>
              ))}
            </>
          )}

          {hasFilters && (
            <>
              <DropdownSeparator />
              <DropdownItem onSelect={onReset} icon={<X className="h-3.5 w-3.5" />}>
                Reset filters
              </DropdownItem>
            </>
          )}
        </>
      )}
    </Dropdown>
  );
}

/** Search, filters, view switcher and the add-task action. */
export function TaskToolbar({
  filters,
  view,
  hasFilters,
  onParamsChange,
  onViewChange,
  onReset,
  action,
}: {
  filters: TaskFilters;
  view: TaskView;
  hasFilters: boolean;
  onParamsChange: (updates: Record<string, string | string[] | undefined>) => void;
  onViewChange: (view: TaskView) => void;
  onReset: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchInput
        value={filters.search ?? ''}
        onChange={(search) => onParamsChange({ search: search || undefined })}
      />

      <FieldsMenu
        filters={filters}
        onChange={onParamsChange}
        onReset={onReset}
        hasFilters={hasFilters}
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ViewSwitcher view={view} onChange={onViewChange} />
        {action}
      </div>
    </div>
  );
}
