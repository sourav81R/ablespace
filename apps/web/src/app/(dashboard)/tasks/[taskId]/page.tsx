'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, ListChecks, History } from 'lucide-react';
import { useActivity, useComments, useSubtasks, useTask } from '@/lib/api/use-tasks';
import { DataState, EmptyState, Skeleton } from '@/components/ui/states';
import { Button } from '@/components/ui/button';

/**
 * Task detail.
 *
 * The full design — properties panel, inline editing, resources — lands with
 * the detail build-out. This renders the real record and its children so the
 * route, its data and its states are wired end to end.
 */
export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const taskId = params.taskId;

  const task = useTask(taskId);
  const subtasks = useSubtasks(taskId);
  const comments = useComments(taskId);
  const activity = useActivity(taskId);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground">
          Tasks
        </Link>
      </div>

      <DataState
        isLoading={task.isLoading}
        error={task.error}
        data={task.data}
        onRetry={() => task.refetch()}
        loadingFallback={
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        {(data) => (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {data.title}
              </h1>
              {data.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {data.description}
                </p>
              )}
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <Property label="Status" value={data.status.replace('_', ' ')} />
                <Property label="Priority" value={data.priority} />
                {data.project && <Property label="Project" value={data.project.name} />}
                {data.reporter && <Property label="Reporter" value={data.reporter.displayName} />}
              </dl>
            </header>

            <Section
              icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
              title={`Subtasks (${data.subtaskCount})`}
            >
              <DataState
                isLoading={subtasks.isLoading}
                error={subtasks.error}
                data={subtasks.data}
                isEmpty={(items) => items.length === 0}
                onRetry={() => subtasks.refetch()}
                emptyFallback={<EmptyState title="No subtasks yet" />}
              >
                {(items) => (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {items.map((subtask) => (
                      <li
                        key={subtask.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0 truncate text-foreground">{subtask.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {subtask.status.replace('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </Section>

            <Section
              icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
              title={`Comments (${data.commentCount})`}
            >
              <DataState
                isLoading={comments.isLoading}
                error={comments.error}
                data={comments.data}
                isEmpty={(page) => page.data.length === 0}
                onRetry={() => comments.refetch()}
                emptyFallback={<EmptyState title="No comments yet" />}
              >
                {(page) => (
                  <ul className="space-y-3">
                    {page.data.map((comment) => (
                      <li key={comment.id} className="rounded-lg border border-border p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {comment.author?.displayName ?? 'Unknown'}
                          </span>
                          <time dateTime={comment.createdAt}>
                            {new Date(comment.createdAt).toLocaleString()}
                          </time>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {comment.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </Section>

            <Section
              icon={<History className="h-4 w-4" aria-hidden="true" />}
              title="Activity"
            >
              <DataState
                isLoading={activity.isLoading}
                error={activity.error}
                data={activity.data}
                isEmpty={(page) => page.data.length === 0}
                onRetry={() => activity.refetch()}
                emptyFallback={<EmptyState title="No activity yet" />}
              >
                {(page) => (
                  <ol className="space-y-2">
                    {page.data.map((event) => (
                      <li key={event.id} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {event.actor?.displayName ?? 'Someone'}
                        </span>
                        <span>{event.type.replaceAll('_', ' ').toLowerCase()}</span>
                        <time dateTime={event.createdAt} className="ml-auto shrink-0">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </DataState>
            </Section>
          </>
        )}
      </DataState>
    </main>
  );
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-foreground">{value.toLowerCase()}</dd>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
