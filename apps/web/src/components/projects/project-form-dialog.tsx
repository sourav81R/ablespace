'use client';

import { useEffect, useState } from 'react';
import { Priority, type ProjectDto } from '@ablespace/shared';
import { useCreateProject, useUpdateProject, type ProjectInput } from '@/lib/api/use-projects';
import { useMembers } from '@/lib/api/use-projects';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { PRIORITY_LABELS } from '@/components/ui/badge';

/** Creates or edits a project; the fields are the same either way. */
export function ProjectFormDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: ProjectDto;
}) {
  const isEditing = Boolean(project);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(project?.id ?? '');
  const mutation = isEditing ? updateProject : createProject;
  const members = useMembers();
  const { notify } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.NONE);
  const [leadId, setLeadId] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!open) return;

    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setPriority(project?.priority ?? Priority.NONE);
    setLeadId(project?.lead?.id ?? '');
    setDueDate(project?.dueDate ? project.dueDate.slice(0, 10) : '');
  }, [open, project]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const input: ProjectInput = {
      name: name.trim(),
      description: description.trim() || null,
      priority,
      leadId: leadId || null,
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00.000Z`).toISOString() : null,
    };

    mutation.mutate(input, {
      onSuccess: () => {
        notify(isEditing ? 'Project updated' : 'Project created');
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={isEditing ? 'Edit project' : 'New project'}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Website Redesign"
            required
            maxLength={120}
          />

          <div>
            <label
              htmlFor="project-description"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="project-priority"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Priority
              </label>
              <select
                id="project-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className={SELECT}
              >
                {Object.values(Priority).map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="project-lead"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Lead
              </label>
              <select
                id="project-lead"
                value={leadId}
                onChange={(event) => setLeadId(event.target.value)}
                className={SELECT}
              >
                <option value="">No lead</option>
                {members.data?.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
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
          <Button type="submit" loading={mutation.isPending} disabled={!name.trim()}>
            {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const SELECT =
  'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
