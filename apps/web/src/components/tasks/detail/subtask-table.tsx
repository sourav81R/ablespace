'use client';

import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Priority, TaskStatus, type SubtaskDto } from '@ablespace/shared';
import {
  useCreateSubtask,
  useDeleteSubtask,
  useSubtasks,
  useUpdateSubtask,
} from '@/lib/api/use-tasks';
import { useMembers } from '@/lib/api/use-projects';
import { DataState, EmptyState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { PRIORITY_LABELS } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * The subtask list.
 *
 * Edits are inline rather than in a dialog: a subtask has four short fields
 * and opening a modal for each one would make checking items off tedious.
 */
export function SubtaskTable({ taskId }: { taskId: string }) {
  const subtasks = useSubtasks(taskId);
  const createSubtask = useCreateSubtask(taskId);
  const { notify } = useToast();
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    createSubtask.mutate(
      { title: trimmed },
      {
        onSuccess: () => {
          setTitle('');
          setAdding(false);
          notify('Subtask added');
        },
        onError: (error) => notify(error.message, 'error'),
      },
    );
  };

  return (
    <div>
      <DataState
        isLoading={subtasks.isLoading}
        error={subtasks.error}
        data={subtasks.data}
        isEmpty={(items) => items.length === 0}
        onRetry={() => subtasks.refetch()}
        emptyFallback={
          <EmptyState title="No subtasks yet" description="Break this task into smaller steps." />
        }
      >
        {(items) => (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2">Task</th>
                  <th scope="col" className="w-28 px-3 py-2">Priority</th>
                  <th scope="col" className="w-32 px-3 py-2">Member</th>
                  <th scope="col" className="w-32 px-3 py-2">Due Date</th>
                  <th scope="col" className="w-10 px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((subtask) => (
                  <SubtaskRow key={subtask.id} taskId={taskId} subtask={subtask} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>

      {adding ? (
        <form onSubmit={handleAdd} className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Subtask title"
            maxLength={200}
            aria-label="New subtask title"
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="sm" loading={createSubtask.isPending} disabled={!title.trim()}>
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdding(false);
              setTitle('');
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add subtask
        </button>
      )}
    </div>
  );
}

/** One row, with inline title editing and per-field writes. */
function SubtaskRow({ taskId, subtask }: { taskId: string; subtask: SubtaskDto }) {
  const updateSubtask = useUpdateSubtask(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);
  const members = useMembers();
  const { notify } = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subtask.title);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = (input: Parameters<typeof updateSubtask.mutate>[0]['input']) =>
    updateSubtask.mutate(
      { subtaskId: subtask.id, input },
      { onError: (error) => notify(error.message, 'error') },
    );

  const commitTitle = () => {
    const trimmed = draft.trim();
    setEditing(false);

    // Nothing changed, or the user cleared it — leave the title alone rather
    // than writing an empty one the API would reject.
    if (!trimmed || trimmed === subtask.title) {
      setDraft(subtask.title);
      return;
    }
    save({ title: trimmed });
  };

  const done = subtask.status === TaskStatus.COMPLETED;

  return (
    <>
      <tr className="transition-colors hover:bg-muted/30">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={done ? 'Mark as to do' : 'Mark as completed'}
              onClick={() =>
                save({ status: done ? TaskStatus.TODO : TaskStatus.COMPLETED })
              }
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                done ? 'border-success bg-success text-white' : 'border-border hover:border-primary'
              }`}
            >
              {done && <Check className="h-3 w-3" aria-hidden="true" />}
            </button>

            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitTitle();
                  if (event.key === 'Escape') {
                    setDraft(subtask.title);
                    setEditing(false);
                  }
                }}
                aria-label="Subtask title"
                className="h-6 min-w-0 flex-1 rounded border border-input bg-card px-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`min-w-0 flex-1 truncate text-left ${
                  done ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              >
                {subtask.title}
              </button>
            )}
          </div>
        </td>

        <td className="px-3 py-2">
          <select
            value={subtask.priority}
            aria-label={`Priority for ${subtask.title}`}
            onChange={(event) => save({ priority: event.target.value as Priority })}
            className={CELL_SELECT}
          >
            {Object.values(Priority).map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </td>

        <td className="px-3 py-2">
          <select
            value={subtask.member?.id ?? ''}
            aria-label={`Member for ${subtask.title}`}
            onChange={(event) => save({ memberId: event.target.value || null })}
            className={CELL_SELECT}
          >
            <option value="">Unassigned</option>
            {members.data?.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </td>

        <td className="px-3 py-2">
          <input
            type="date"
            aria-label={`Due date for ${subtask.title}`}
            value={subtask.dueDate ? subtask.dueDate.slice(0, 10) : ''}
            onChange={(event) =>
              save({
                dueDate: event.target.value
                  ? new Date(`${event.target.value}T12:00:00.000Z`).toISOString()
                  : null,
              })
            }
            className={CELL_SELECT}
          />
        </td>

        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete ${subtask.title}`}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-danger-muted hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </td>
      </tr>

      {confirmOpen && (
        <tr>
          <td colSpan={5} className="p-0">
            <ConfirmDialog
              open
              onClose={() => setConfirmOpen(false)}
              onConfirm={() =>
                deleteSubtask.mutate(subtask.id, {
                  onSuccess: () => {
                    setConfirmOpen(false);
                    notify('Subtask deleted');
                  },
                  onError: (error) => notify(error.message, 'error'),
                })
              }
              title="Delete this subtask?"
              description={`"${subtask.title}" will be removed permanently.`}
              loading={deleteSubtask.isPending}
            />
          </td>
        </tr>
      )}
    </>
  );
}

const CELL_SELECT =
  'h-6 w-full rounded border border-transparent bg-transparent px-1 text-2xs text-muted-foreground transition-colors hover:border-border focus:border-input focus:outline-none focus:ring-2 focus:ring-ring';
