'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRightLeft, MoreHorizontal, Pencil, SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import { TASK_STATUS_ORDER, type TaskDto } from '@ablespace/shared';
import { useDeleteTask, useUpdateTask } from '@/lib/api/use-tasks';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownSubmenu,
} from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/dialog';
import { STATUS_LABELS } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

/**
 * The per-task actions menu, shared by the board card and the list row.
 *
 * Every action here goes through the API — status is a PATCH, delete is a
 * DELETE, and the query cache is invalidated from the mutation hooks. Nothing
 * is changed locally and left to drift from the server.
 */
export function TaskActionsMenu({
  task,
  onEdit,
  className,
}: {
  task: TaskDto;
  onEdit: () => void;
  className?: string;
}) {
  const router = useRouter();
  const updateTask = useUpdateTask(task.id);
  const deleteTask = useDeleteTask();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Dropdown
        align="end"
        className="w-[190px]"
        trigger={({ open, toggle, id }) => (
          <button
            type="button"
            // The menu often sits inside a link; without this the click
            // navigates to the task instead of opening the menu.
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggle();
            }}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? id : undefined}
            aria-label={`Actions for ${task.title}`}
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      >
        {(close) => (
          <>
            <DropdownItem
              icon={<SquareArrowOutUpRight className="h-3.5 w-3.5" />}
              onSelect={() => {
                close();
                router.push(`/tasks/${task.id}`);
              }}
            >
              Open task
            </DropdownItem>

            <DropdownItem
              icon={<Pencil className="h-3.5 w-3.5" />}
              onSelect={() => {
                close();
                onEdit();
              }}
            >
              Edit
            </DropdownItem>

            <DropdownSeparator />

            {/*
              The keyboard- and touch-accessible route to a status change.
              Drag and drop, if added later, would call the same endpoint.
            */}
            <DropdownSubmenu label="Move to" icon={<ArrowRightLeft className="h-3.5 w-3.5" />}>
              {TASK_STATUS_ORDER.map((status) => (
                <DropdownItem
                  key={status}
                  selected={task.status === status}
                  disabled={task.status === status || updateTask.isPending}
                  onSelect={() => {
                    close();
                    updateTask.mutate({ status });
                  }}
                >
                  {STATUS_LABELS[status]}
                </DropdownItem>
              ))}
            </DropdownSubmenu>

            <DropdownSeparator />

            <DropdownItem
              destructive
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onSelect={() => {
                close();
                setConfirmOpen(true);
              }}
            >
              Delete
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          deleteTask.mutate(task.id, { onSuccess: () => setConfirmOpen(false) })
        }
        title="Delete this task?"
        description={`"${task.title}" and its subtasks, comments and history will be removed permanently.`}
        loading={deleteTask.isPending}
      />
    </>
  );
}
