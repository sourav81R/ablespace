'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ListTodo } from 'lucide-react';
import { useProject } from '@/lib/api/use-projects';
import { useTasks } from '@/lib/api/use-tasks';
import { DataState, EmptyState, Skeleton } from '@/components/ui/states';
import { Button } from '@/components/ui/button';

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();

  const project = useProject(projectId);
  // The task list is filtered server-side rather than fetched whole and
  // filtered here, so a large workspace stays cheap.
  const tasks = useTasks({ projectId });

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">
          Projects
        </Link>
      </div>

      <DataState
        isLoading={project.isLoading}
        error={project.error}
        data={project.data}
        onRetry={() => project.refetch()}
        loadingFallback={<Skeleton className="h-8 w-1/2" />}
      >
        {(data) => (
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{data.name}</h1>
            {data.description && (
              <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>
            )}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="mt-0.5 font-medium capitalize text-foreground">
                  {data.priority.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lead</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {data.lead?.displayName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </header>
        )}
      </DataState>

      <section>
        <h2 className="mb-2.5 text-sm font-medium text-foreground">Tasks</h2>

        <DataState
          isLoading={tasks.isLoading}
          error={tasks.error}
          data={tasks.data}
          isEmpty={(page) => page.data.length === 0}
          onRetry={() => tasks.refetch()}
          emptyFallback={
            <EmptyState
              icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
              title="No tasks in this project"
            />
          }
        >
          {(page) => (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {page.data.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">{task.title}</span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">
                      {task.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </section>
    </main>
  );
}
