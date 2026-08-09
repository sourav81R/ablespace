'use client';

import { Plus } from 'lucide-react';
import { TaskStatus, type TaskDto } from '@ablespace/shared';
import { STATUS_LABELS } from '@/components/ui/badge';
import { TaskCard } from './task-card';

/**
 * One board column.
 *
 * Owns its own Add Task control so a new task lands in the column the user
 * clicked, rather than always in To Do.
 */
export function TaskColumn({
  status,
  tasks,
  onAddTask,
  onEditTask,
}: {
  status: TaskStatus;
  tasks: TaskDto[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: TaskDto) => void;
}) {
  return (
    <section
      aria-label={STATUS_LABELS[status]}
      className="flex w-[280px] shrink-0 flex-col rounded-lg bg-muted/50"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-xs font-semibold text-foreground">
            {STATUS_LABELS[status]}
          </h2>
          <span className="shrink-0 rounded-full bg-card px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(status)}
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      {/* Each column scrolls independently, so one long column does not
          stretch the board and push the others out of view. */}
      <div className="scrollbar-thin flex max-h-[calc(100vh-16rem)] flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tasks.length === 0 ? (
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="rounded-md border border-dashed border-border px-3 py-6 text-2xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            No tasks — add one
          </button>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={() => onEditTask(task)} />
          ))
        )}
      </div>
    </section>
  );
}
