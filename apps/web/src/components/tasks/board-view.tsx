'use client';

import { TASK_STATUS_ORDER, TaskStatus, type TaskDto } from '@ablespace/shared';
import { STATUS_LABELS } from '@/components/ui/badge';
import { TaskCard } from './task-card';

/**
 * The Kanban board.
 *
 * Columns are derived from TASK_STATUS_ORDER, the same constant the API uses,
 * so a new status appears here without touching this file.
 */
export function BoardView({ tasks }: { tasks: TaskDto[] }) {
  const byStatus = new Map<TaskStatus, TaskDto[]>(
    TASK_STATUS_ORDER.map((status) => [status, []]),
  );

  for (const task of tasks) {
    byStatus.get(task.status)?.push(task);
  }

  return (
    // Scrolls inside this container rather than moving the page: horizontal
    // page scroll on a phone is the failure this avoids.
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {TASK_STATUS_ORDER.map((status) => {
          const columnTasks = byStatus.get(status) ?? [];

          return (
            <section
              key={status}
              aria-label={STATUS_LABELS[status]}
              className="flex w-[280px] shrink-0 flex-col rounded-lg bg-muted/50"
            >
              <header className="flex items-center justify-between gap-2 px-3 py-2.5">
                <h2 className="text-xs font-semibold text-foreground">{STATUS_LABELS[status]}</h2>
                <span className="rounded-full bg-card px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                  {columnTasks.length}
                </span>
              </header>

              <div className="scrollbar-thin flex max-h-[calc(100vh-16rem)] flex-col gap-2 overflow-y-auto px-2 pb-2">
                {columnTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-2xs text-muted-foreground">
                    No tasks
                  </p>
                ) : (
                  columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
