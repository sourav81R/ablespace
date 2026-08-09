'use client';

import { Priority, TaskStatus, type TaskDto } from '@ablespace/shared';
import { useLabels, useMembers, useProjects } from '@/lib/api/use-projects';
import { useUpdateTask } from '@/lib/api/use-tasks';
import { useToast } from '@/components/ui/toast';
import { Avatar } from '@/components/ui/avatar';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/components/ui/badge';

/**
 * The editable property list.
 *
 * Each control writes straight through to the API on change — there is no
 * local draft and no save button, so what the screen shows is always what the
 * server holds.
 */
export function TaskProperties({ task }: { task: TaskDto }) {
  const updateTask = useUpdateTask(task.id);
  const { notify } = useToast();
  const members = useMembers();
  const labels = useLabels();
  const projects = useProjects();

  const save = (input: Parameters<typeof updateTask.mutate>[0], label: string) =>
    updateTask.mutate(input, {
      onSuccess: () => notify(`${label} updated`),
      onError: (error) => notify(error.message, 'error'),
    });

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((value) => value !== id) : [...list, id];

  const memberIds = task.members.map((member) => member.id);
  const labelIds = task.labels.map((label) => label.id);

  return (
    <dl className="space-y-3 text-xs">
      <Row label="Status">
        <select
          value={task.status}
          disabled={updateTask.isPending}
          aria-label="Status"
          onChange={(event) =>
            save({ status: event.target.value as TaskStatus }, 'Status')
          }
          className={SELECT}
        >
          {Object.values(TaskStatus).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Priority">
        <select
          value={task.priority}
          disabled={updateTask.isPending}
          aria-label="Priority"
          onChange={(event) =>
            save({ priority: event.target.value as Priority }, 'Priority')
          }
          className={SELECT}
        >
          {Object.values(Priority).map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Members">
        <div className="flex flex-wrap gap-1">
          {members.data?.map((member) => {
            const active = memberIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                aria-pressed={active}
                disabled={updateTask.isPending}
                onClick={() =>
                  save({ memberIds: toggle(memberIds, member.id) }, 'Members')
                }
                className={chip(active)}
              >
                <Avatar name={member.displayName} src={member.avatarUrl} size="xs" />
                {member.displayName}
              </button>
            );
          })}
          {members.data?.length === 0 && <Empty />}
        </div>
      </Row>

      <Row label="Due date">
        <input
          type="date"
          aria-label="Due date"
          disabled={updateTask.isPending}
          value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
          onChange={(event) =>
            save(
              {
                // Midday UTC keeps the date on the intended day everywhere.
                dueDate: event.target.value
                  ? new Date(`${event.target.value}T12:00:00.000Z`).toISOString()
                  : null,
              },
              'Due date',
            )
          }
          className={SELECT}
        />
      </Row>

      <Row label="Labels">
        <div className="flex flex-wrap gap-1">
          {labels.data?.map((label) => {
            const active = labelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                aria-pressed={active}
                disabled={updateTask.isPending}
                onClick={() => save({ labelIds: toggle(labelIds, label.id) }, 'Labels')}
                className={chip(active)}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </button>
            );
          })}
          {labels.data?.length === 0 && <Empty />}
        </div>
      </Row>

      <Row label="Project">
        <select
          value={task.project?.id ?? ''}
          disabled={updateTask.isPending}
          aria-label="Project"
          onChange={(event) => save({ projectId: event.target.value || null }, 'Project')}
          className={SELECT}
        >
          <option value="">No project</option>
          {projects.data?.data.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Teams">
        {/*
          Read-only: the design surfaces Teams but the product defines no team
          entity, so these are plain strings with nothing to pick from. Showing
          an editor with an empty list would imply a feature that does not exist.
        */}
        {task.teamIds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {task.teamIds.map((team) => (
              <span
                key={team}
                className="rounded-full bg-muted px-2 py-0.5 text-2xs text-muted-foreground"
              >
                {team}
              </span>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Row>

      <Row label="Reporter">
        {/* Set by the server from the verified session; not editable. */}
        {task.reporter ? (
          <span className="flex items-center gap-1.5 text-foreground">
            <Avatar name={task.reporter.displayName} src={task.reporter.avatarUrl} size="xs" />
            {task.reporter.displayName}
          </span>
        ) : (
          <Empty />
        )}
      </Row>

      <Row label="Created">
        <time dateTime={task.createdAt} className="text-muted-foreground">
          {new Date(task.createdAt).toLocaleDateString()}
        </time>
      </Row>

      {task.completedAt && (
        <Row label="Completed">
          <time dateTime={task.completedAt} className="text-muted-foreground">
            {new Date(task.completedAt).toLocaleDateString()}
          </time>
        </Row>
      )}
    </dl>
  );
}

const SELECT =
  'h-7 w-full rounded border border-input bg-card px-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';

function chip(active: boolean): string {
  return `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs transition-colors disabled:opacity-50 ${
    active
      ? 'border-primary bg-primary-muted text-primary'
      : 'border-border bg-card text-muted-foreground hover:text-foreground'
  }`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-2">
      <dt className="pt-1 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}
