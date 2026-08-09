'use client';

import Link from 'next/link';
import { MessageSquare, ListChecks } from 'lucide-react';
import type { TaskDto } from '@ablespace/shared';
import { AvatarGroup } from '@/components/ui/avatar';
import { DueDateChip, LabelChip, PriorityBadge } from '@/components/ui/badge';

/** A task as it appears in a board column. */
export function TaskCard({ task }: { task: TaskDto }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block rounded-lg border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}

      <p className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</p>

      {task.project && (
        <p className="mt-1 truncate text-2xs text-muted-foreground">{task.project.name}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <DueDateChip date={task.dueDate} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {task.subtaskCount > 0 && (
            <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
              <ListChecks className="h-3 w-3" aria-hidden="true" />
              {task.subtaskCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {task.commentCount}
            </span>
          )}
          <AvatarGroup users={task.members} max={2} size="xs" />
        </div>
      </div>
    </Link>
  );
}
