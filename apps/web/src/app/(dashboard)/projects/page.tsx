'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderKanban, MoreHorizontal, Pencil, Plus, SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import type { ProjectDto } from '@ablespace/shared';
import { useDeleteProject, useProjects } from '@/lib/api/use-projects';
import { DataState, EmptyState, Skeleton } from '@/components/ui/states';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { PriorityBadge } from '@/components/ui/badge';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';

export default function ProjectsPage() {
  const projects = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDto | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Group related work and track it to a due date.
          </p>
        </div>

        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Add Project</span>
        </Button>
      </header>

      <DataState
        isLoading={projects.isLoading}
        error={projects.error}
        data={projects.data}
        isEmpty={(page) => page.data.length === 0}
        onRetry={() => projects.refetch()}
        loadingFallback={
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        }
        emptyFallback={
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
            title="No projects yet"
            description="Projects group tasks together."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Project
              </Button>
            }
          />
        }
      >
        {(page) => (
          // Scrolls inside this container so the page body never gains a
          // horizontal scrollbar on a narrow screen.
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-muted/50 text-left">
                <tr className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5">Project</th>
                  <th scope="col" className="w-28 px-4 py-2.5">Priority</th>
                  <th scope="col" className="w-40 px-4 py-2.5">Lead</th>
                  <th scope="col" className="w-32 px-4 py-2.5">Due Date</th>
                  <th scope="col" className="w-16 px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.data.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onEdit={() => {
                      setEditing(project);
                      setDialogOpen(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>

      <ProjectFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        project={editing}
      />
    </div>
  );
}

function ProjectRow({ project, onEdit }: { project: ProjectDto; onEdit: () => void }) {
  const router = useRouter();
  const deleteProject = useDeleteProject();
  const { notify } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <Link
          href={`/projects/${project.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {project.name}
        </Link>
        {project.taskCount !== undefined && (
          <span className="ml-2 text-2xs text-muted-foreground">
            {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </td>

      <td className="px-4 py-2.5">
        <PriorityBadge priority={project.priority} />
      </td>

      <td className="px-4 py-2.5">
        {project.lead ? (
          <span className="flex items-center gap-1.5 text-xs text-foreground">
            <Avatar name={project.lead.displayName} src={project.lead.avatarUrl} size="xs" />
            <span className="truncate">{project.lead.displayName}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}
      </td>

      <td className="px-4 py-2.5 text-right">
        <Dropdown
          align="end"
          className="w-[170px]"
          trigger={({ open, toggle, id }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? id : undefined}
              aria-label={`Actions for ${project.name}`}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  router.push(`/projects/${project.id}`);
                }}
              >
                Open project
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
            deleteProject.mutate(project.id, {
              onSuccess: () => {
                setConfirmOpen(false);
                notify('Project deleted');
              },
              onError: (error) => notify(error.message, 'error'),
            })
          }
          title="Delete this project?"
          description={`"${project.name}" will be removed. Its tasks are kept and become unassigned.`}
          loading={deleteProject.isPending}
        />
      </td>
    </tr>
  );
}
