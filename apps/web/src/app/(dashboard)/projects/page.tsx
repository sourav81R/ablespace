'use client';

import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { useProjects } from '@/lib/api/use-projects';
import { DataState, EmptyState, Skeleton } from '@/components/ui/states';

export default function ProjectsPage() {
  const projects = useProjects();

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Group related work and track it to a due date.
        </p>
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
            description="Projects group tasks together. Run the seed script to load demo data."
          />
        }
      >
        {(page) => (
          <div className="overflow-x-auto rounded-lg border border-border">
            {/* The table scrolls inside this container so the page body never
                gains a horizontal scrollbar on a narrow screen. */}
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-muted/50 text-left">
                <tr className="text-xs font-medium text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5">Project</th>
                  <th scope="col" className="px-4 py-2.5">Priority</th>
                  <th scope="col" className="px-4 py-2.5">Lead</th>
                  <th scope="col" className="px-4 py-2.5">Due date</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.data.map((project) => (
                  <tr key={project.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">
                      {project.priority.toLowerCase()}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {project.lead?.displayName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {project.taskCount ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </main>
  );
}
