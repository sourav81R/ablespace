'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { TASK_STATUS_ORDER, TaskStatus, type TaskDto } from '@ablespace/shared';
import { AvatarGroup } from '@/components/ui/avatar';
import { DueDateChip, PriorityBadge, STATUS_LABELS } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

/**
 * Tasks grouped by status, as a collapsible table.
 *
 * Below `sm` the rows become stacked cards: a five-column table on a phone
 * either overflows or compresses columns past readability, and cards avoid
 * both.
 */
export function ListView({ tasks }: { tasks: TaskDto[] }) {
  const [collapsed, setCollapsed] = useState<Set<TaskStatus>>(new Set());

  const byStatus = new Map<TaskStatus, TaskDto[]>(
    TASK_STATUS_ORDER.map((status) => [status, []]),
  );
  for (const task of tasks) {
    byStatus.get(task.status)?.push(task);
  }

  const toggle = (status: TaskStatus) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {TASK_STATUS_ORDER.map((status) => {
        const sectionTasks = byStatus.get(status) ?? [];
        const isCollapsed = collapsed.has(status);
        const sectionId = `status-section-${status}`;

        return (
          <section key={status}>
            <button
              type="button"
              onClick={() => toggle(status)}
              aria-expanded={!isCollapsed}
              aria-controls={sectionId}
              className="mb-1.5 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  isCollapsed && '-rotate-90',
                )}
                aria-hidden="true"
              />
              <h2 className="text-xs font-semibold text-foreground">{STATUS_LABELS[status]}</h2>
              <span className="text-2xs text-muted-foreground">{sectionTasks.length}</span>
            </button>

            {!isCollapsed && (
              <div id={sectionId} className="overflow-hidden rounded-lg border border-border">
                {sectionTasks.length === 0 ? (
                  <p className="px-4 py-5 text-center text-2xs text-muted-foreground">
                    No tasks in this group
                  </p>
                ) : (
                  <>
                    {/* Desktop: a dense table. */}
                    <table className="hidden w-full text-sm sm:table">
                      <thead className="border-b border-border bg-muted/40 text-left">
                        <tr className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                          <th scope="col" className="px-4 py-2">Task</th>
                          <th scope="col" className="px-4 py-2 w-28">Priority</th>
                          <th scope="col" className="px-4 py-2 w-24">Members</th>
                          <th scope="col" className="px-4 py-2 w-28">Due date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sectionTasks.map((task) => (
                          <tr key={task.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-4 py-2.5">
                              <Link
                                href={`/tasks/${task.id}`}
                                className="font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {task.title}
                              </Link>
                              {task.project && (
                                <span className="ml-2 text-2xs text-muted-foreground">
                                  {task.project.name}
                                </span>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile: stacked cards. */}
                    <ul className="divide-y divide-border sm:hidden">
                      {sectionTasks.map((task) => (
                        <li key={task.id}>
                          <Link href={`/tasks/${task.id}`} className="block px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            <div className="mt-2 flex items-center gap-3">
                              <PriorityBadge priority={task.priority} />
                              <DueDateChip date={task.dueDate} />
                              <span className="ml-auto">
                                <AvatarGroup users={task.members} max={2} size="xs" />
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
