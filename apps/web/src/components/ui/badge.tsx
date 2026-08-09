'use client';

import { Priority, TaskStatus } from '@ablespace/shared';
import { cn } from '@/lib/utils/cn';

/** Human labels; the enum values themselves are not presentable. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.DOING]: 'Doing',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.ON_HOLD]: 'On Hold',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NONE]: 'None',
  [Priority.URGENT]: 'Urgent',
  [Priority.HIGH]: 'High',
  [Priority.MEDIUM]: 'Medium',
  [Priority.LOW]: 'Low',
};

/**
 * Status colours.
 *
 * Deliberately not the accent: status must read the same whichever accent the
 * user picked, or "completed" would change meaning with the theme.
 */
const STATUS_STYLES: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'bg-muted text-muted-foreground',
  [TaskStatus.DOING]: 'bg-info-muted text-info',
  [TaskStatus.COMPLETED]: 'bg-success-muted text-success',
  [TaskStatus.ON_HOLD]: 'bg-warning-muted text-warning',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  [Priority.URGENT]: 'bg-danger-muted text-danger',
  [Priority.HIGH]: 'bg-warning-muted text-warning',
  [Priority.MEDIUM]: 'bg-info-muted text-info',
  [Priority.LOW]: 'bg-muted text-muted-foreground',
  [Priority.NONE]: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  // "None" is the absence of a priority, not a value worth a chip.
  if (priority === Priority.NONE) {
    return <span className={cn('text-2xs text-muted-foreground', className)}>—</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium',
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-medium"
      // Label colours are workspace data, not theme tokens, so they are applied
      // inline. The 18% tint keeps text readable in both modes.
      style={{ backgroundColor: `${color}2e`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

/** A due date that turns red once it has passed. */
export function DueDateChip({ date }: { date: string | null }) {
  if (!date) return <span className="text-2xs text-muted-foreground">—</span>;

  const due = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = due < today;

  return (
    <time
      dateTime={date}
      className={cn('text-2xs', overdue ? 'font-medium text-danger' : 'text-muted-foreground')}
    >
      {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
    </time>
  );
}
