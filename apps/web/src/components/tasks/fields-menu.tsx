'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { Priority, TaskStatus } from '@ablespace/shared';
import { useLabels, useMembers, useProjects } from '@/lib/api/use-projects';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/components/ui/badge';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown';
import { cn } from '@/lib/utils/cn';
import type { TaskFilters } from '@/lib/api/use-tasks';


/** Midnight UTC on the given day, as the API's date filters expect. */
function dayBoundary(offsetDays: number, endOfDay = false): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date.toISOString();
}

/**
 * Due-date ranges offered in the Fields menu.
 *
 * Presets rather than a pair of date pickers: these are the questions people
 * actually ask of a board, and each maps onto the dueFrom/dueTo the API
 * already accepts. The ranges are computed on open so "today" stays correct in
 * a tab left open overnight.
 */
const DUE_DATE_PRESETS: Array<{
  id: string;
  label: string;
  range: () => { dueFrom?: string; dueTo?: string };
}> = [
  {
    id: 'overdue',
    label: 'Overdue',
    // No lower bound: anything due before today counts.
    range: () => ({ dueTo: dayBoundary(-1, true) }),
  },
  {
    id: 'today',
    label: 'Due today',
    range: () => ({ dueFrom: dayBoundary(0), dueTo: dayBoundary(0, true) }),
  },
  {
    id: 'week',
    label: 'Due this week',
    range: () => ({ dueFrom: dayBoundary(0), dueTo: dayBoundary(7, true) }),
  },
  {
    id: 'month',
    label: 'Due this month',
    range: () => ({ dueFrom: dayBoundary(0), dueTo: dayBoundary(30, true) }),
  },
];

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
    // A range counts once however many bounds it sets.
    filters.dueFrom || filters.dueTo ? 1 : 0,
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

          <DropdownSeparator />
          <DropdownLabel>Due Date</DropdownLabel>
          {DUE_DATE_PRESETS.map((preset) => {
            const range = preset.range();
            const active = filters.dueFrom === range.dueFrom && filters.dueTo === range.dueTo;

            return (
              <DropdownItem
                key={preset.id}
                selected={active}
                // Selecting the active preset clears it, so the menu is a
                // toggle rather than a one-way trip.
                onSelect={() =>
                  onChange(active ? { dueFrom: undefined, dueTo: undefined } : range)
                }
              >
                {preset.label}
              </DropdownItem>
            );
          })}

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
