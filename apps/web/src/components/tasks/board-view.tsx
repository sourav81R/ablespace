'use client';

import { TASK_STATUS_ORDER, TaskStatus, type TaskDto } from '@ablespace/shared';
import { TaskColumn } from './task-column';

/**
 * The Kanban board.
 *
 * Columns come from TASK_STATUS_ORDER, the same constant the API uses, so the
 * two cannot disagree about which statuses exist or in what order.
 */
export function BoardView({
  tasks,
  onAddTask,
  onEditTask,
}: {
  tasks: TaskDto[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: TaskDto) => void;
}) {
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
        {TASK_STATUS_ORDER.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={byStatus.get(status) ?? []}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
          />
        ))}
      </div>
    </div>
  );
}
