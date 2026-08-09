'use client';

import { useEffect, useState } from 'react';
import { Priority, TaskStatus, type TaskDto } from '@ablespace/shared';
import { useCreateTask, useUpdateTask, type TaskInput } from '@/lib/api/use-tasks';
import { useLabels, useMembers, useProjects } from '@/lib/api/use-projects';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/components/ui/badge';

/**
 * Creates or edits a task.
 *
 * One component for both: the fields are identical, and splitting them would
 * mean maintaining the same form twice.
 */
export function TaskFormDialog({
  open,
  onClose,
  task,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating. */
  task?: TaskDto;
  /** Pre-selects the column an "Add task" button belongs to. */
  defaultStatus?: TaskStatus;
}) {
  const isEditing = Boolean(task);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask(task?.id ?? '');
  const mutation = isEditing ? updateTask : createTask;

  const labels = useLabels();
  const members = useMembers();
  const projects = useProjects();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<Priority>(Priority.NONE);
  const [projectId, setProjectId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');

  // Reset whenever the dialog opens, so a cancelled edit does not leak its
  // values into the next one.
  useEffect(() => {
    if (!open) return;

    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? defaultStatus ?? TaskStatus.TODO);
    setPriority(task?.priority ?? Priority.NONE);
    setProjectId(task?.project?.id ?? '');
    setMemberIds(task?.members.map((member) => member.id) ?? []);
    setLabelIds(task?.labels.map((label) => label.id) ?? []);
    // <input type="date"> wants YYYY-MM-DD, not an ISO timestamp.
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '');
  }, [open, task, defaultStatus]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const input: TaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      projectId: projectId || null,
      memberIds,
      labelIds,
      // Midday UTC keeps the date on the intended day in every timezone.
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00.000Z`).toISOString() : null,
    };

    mutation.mutate(input, { onSuccess: onClose });
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((value) => value !== id) : [...list, id];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit task' : 'New task'}
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            required
            maxLength={200}
          />

          <div>
            <label
              htmlFor="task-description"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Add more detail…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" id="task-status">
              <select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className={SELECT_CLASS}
              >
                {Object.values(TaskStatus).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority" id="task-priority">
              <select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className={SELECT_CLASS}
              >
                {Object.values(Priority).map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Project" id="task-project">
              <select
                id="task-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">No project</option>
                {projects.data?.data.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>

            <Input
              label="Due date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          {members.data && members.data.length > 0 && (
            <Chips
              legend="Members"
              options={members.data.map((member) => ({
                id: member.id,
                label: member.displayName,
              }))}
              selected={memberIds}
              onToggle={(id) => setMemberIds((current) => toggle(current, id))}
            />
          )}

          {labels.data && labels.data.length > 0 && (
            <Chips
              legend="Labels"
              options={labels.data.map((label) => ({
                id: label.id,
                label: label.name,
                color: label.color,
              }))}
              selected={labelIds}
              onToggle={(id) => setLabelIds((current) => toggle(current, id))}
            />
          )}
        </div>

        {mutation.isError && (
          <p role="alert" className="mt-4 text-xs text-danger">
            {mutation.error.message}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!title.trim()}>
            {isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Multi-select rendered as toggleable chips. */
function Chips({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: Array<{ id: string; label: string; color?: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.color && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
