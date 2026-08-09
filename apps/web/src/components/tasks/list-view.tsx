'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus } from 'lucide-react';
import { TASK_STATUS_ORDER, TaskStatus, type TaskDto } from '@ablespace/shared';
import { AvatarGroup } from '@/components/ui/avatar';
import { DueDateChip, PriorityBadge, STATUS_LABELS } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { TaskActionsMenu } from './task-actions';

/**
 * Tasks grouped by status.
 *
 * Below `sm` the rows become stacked cards: a five-column table on a phone
 * either overflows its container or compresses columns past readability.
 */
export function ListView({
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
    <div className="space-y-4">
      {TASK_STATUS_ORDER.map((status) => (
        <StatusSection
          key={status}
          status={status}
          tasks={byStatus.get(status) ?? []}
          onAddTask={onAddTask}
          onEditTask={onEditTask}
        />
      ))}
    </div>
  );
}

/** One collapsible status group. */
function StatusSection({
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
  const [collapsed, setCollapsed] = useState(false);
  const sectionId = `status-section-${status}`;

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-controls={sectionId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              collapsed && '-rotate-90',
            )}
            aria-hidden="true"
          />
          <h2 className="text-xs font-semibold text-foreground">{STATUS_LABELS[status]}</h2>
          <span className="text-2xs text-muted-foreground">{tasks.length}</span>
        </button>

        <button
          type="button"
          onClick={() => onAddTask(status)}
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {!collapsed && (
        <div id={sectionId} className="overflow-hidden rounded-lg border border-border">
          {tasks.length === 0 ? (
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="w-full px-4 py-5 text-center text-2xs text-muted-foreground transition-colors hover:text-foreground"
            >
              No tasks in this group — add one
            </button>
          ) : (
            <>
              <table className="hidden w-full text-sm sm:table">
                <thead className="border-b border-border bg-muted/40 text-left">
                  <tr className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-2">Task</th>
                    <th scope="col" className="w-28 px-4 py-2">Priority</th>
                    <th scope="col" className="w-24 px-4 py-2">Members</th>
                    <th scope="col" className="w-28 px-4 py-2">Due Date</th>
                    <th scope="col" className="w-16 px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} onEdit={() => onEditTask(task)} />
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-border sm:hidden">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2 px-4 py-3">
                    <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <PriorityBadge priority={task.priority} />
                        <DueDateChip date={task.dueDate} />
                        <AvatarGroup users={task.members} max={2} size="xs" />
                      </div>
                    </Link>
                    <TaskActionsMenu task={task} onEdit={() => onEditTask(task)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** One row of the desktop table. */
function TaskRow({ task, onEdit }: { task: TaskDto; onEdit: () => void }) {
  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <Link
          href={`/tasks/${task.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {task.title}
        </Link>
        {task.project && (
          <span className="ml-2 text-2xs text-muted-foreground">{task.project.name}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-4 py-2.5">
        <AvatarGroup users={task.members} max={2} size="xs" />
      </td>
      <td className="px-4 py-2.5">
        <DueDateChip date={task.dueDate} />
      </td>
      <td className="px-4 py-2.5 text-right">
        <TaskActionsMenu task={task} onEdit={onEdit} />
      </td>
    </tr>
  );
}
