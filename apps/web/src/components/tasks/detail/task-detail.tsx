'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  History,
  ListChecks,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import type { TaskDto } from '@ablespace/shared';
import { useDeleteTask, useTask, useUpdateTask } from '@/lib/api/use-tasks';
import { DataState, Skeleton } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { TaskProperties } from './task-properties';
import { SubtaskTable } from './subtask-table';
import { CommentSection } from './comment-section';
import { ActivityFeed } from './activity-feed';

/**
 * The task detail screen.
 *
 * Two columns above `lg`: content on the left, properties in a right rail. On
 * narrower screens the rail moves above the content as a collapsible panel,
 * which keeps it reachable without squeezing the description into a column too
 * narrow to read.
 */
export function TaskDetail({ taskId }: { taskId: string }) {
  const task = useTask(taskId);

  return (
    <DataState
      isLoading={task.isLoading}
      error={task.error}
      data={task.data}
      onRetry={() => task.refetch()}
      loadingFallback={
        <div className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      {(data) => <Loaded task={data} />}
    </DataState>
  );
}

function Loaded({ task }: { task: TaskDto }) {
  return (
    <div className="p-4 sm:p-6">
      <TaskHeader task={task} />

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-6">
          <TaskDescription task={task} />

          <Section icon={<ListChecks className="h-4 w-4" />} title={`Subtasks (${task.subtaskCount})`}>
            <SubtaskTable taskId={task.id} />
          </Section>

          {task.resources.length > 0 && (
            <Section icon={<ExternalLink className="h-4 w-4" />} title="Resources">
              <ResourceList task={task} />
            </Section>
          )}

          <Section
            icon={<MessageSquare className="h-4 w-4" />}
            title={`Comments (${task.commentCount})`}
          >
            <CommentSection taskId={task.id} />
          </Section>

          <Section icon={<History className="h-4 w-4" />} title="Activity">
            <ActivityFeed taskId={task.id} />
          </Section>
        </div>

        <TaskDetailsPanel task={task} />
      </div>
    </div>
  );
}

/** Breadcrumb, title and destructive action. */
function TaskHeader({ task }: { task: TaskDto }) {
  const router = useRouter();
  const updateTask = useUpdateTask(task.id);
  const deleteTask = useDeleteTask();
  const { notify } = useToast();

  const [title, setTitle] = useState(task.title);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Adopt a title changed elsewhere — another tab, or the edit dialog.
  useEffect(() => setTitle(task.title), [task.title]);

  const commit = () => {
    const trimmed = title.trim();
    setEditing(false);

    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }

    updateTask.mutate(
      { title: trimmed },
      {
        onSuccess: () => notify('Title updated'),
        onError: (error) => {
          setTitle(task.title);
          notify(error.message, 'error');
        },
      },
    );
  };

  return (
    <header>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Link href="/tasks" className="hover:text-foreground">
          Tasks
        </Link>
        {task.project && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/projects/${task.project.id}`} className="truncate hover:text-foreground">
              {task.project.name}
            </Link>
          </>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            maxLength={200}
            aria-label="Task title"
            className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-1 text-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <h1
            role="button"
            tabIndex={0}
            onClick={() => setEditing(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setEditing(true);
              }
            }}
            className="min-w-0 flex-1 cursor-text rounded-md px-2 py-1 text-xl font-semibold tracking-tight text-foreground hover:bg-muted/60"
          >
            {task.title}
          </h1>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete task"
          className="shrink-0 hover:bg-danger-muted hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          deleteTask.mutate(task.id, {
            onSuccess: () => {
              notify('Task deleted');
              router.replace('/tasks');
            },
            onError: (error) => notify(error.message, 'error'),
          })
        }
        title="Delete this task?"
        description={`"${task.title}" and its subtasks, comments and history will be removed permanently.`}
        loading={deleteTask.isPending}
      />
    </header>
  );
}

/** Click-to-edit description. */
function TaskDescription({ task }: { task: TaskDto }) {
  const updateTask = useUpdateTask(task.id);
  const { notify } = useToast();
  const [draft, setDraft] = useState(task.description ?? '');
  const [editing, setEditing] = useState(false);

  useEffect(() => setDraft(task.description ?? ''), [task.description]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();

    if (next === (task.description ?? '')) return;

    updateTask.mutate(
      { description: next || null },
      {
        onSuccess: () => notify('Description updated'),
        onError: (error) => {
          setDraft(task.description ?? '');
          notify(error.message, 'error');
        },
      },
    );
  };

  if (editing) {
    return (
      <div>
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          rows={5}
          maxLength={5000}
          aria-label="Task description"
          className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-2xs text-muted-foreground">Click outside to save.</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
    >
      {task.description ? (
        <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Add a description…</p>
      )}
    </button>
  );
}

/** Links attached to the task. */
function ResourceList({ task }: { task: TaskDto }) {
  return (
    <ul className="space-y-1.5">
      {task.resources.map((resource) => (
        <li key={resource.url}>
          <a
            href={resource.url}
            target="_blank"
            // noreferrer alongside noopener: the target must not learn where
            // the link came from.
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-foreground transition-colors hover:border-primary/40"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 truncate">{resource.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The properties rail. */
function TaskDetailsPanel({ task }: { task: TaskDto }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="lg:order-last">
      {/* Collapsed by default below `lg`, so the description stays at the top
          of a phone screen rather than below a long property list. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="task-properties"
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground lg:hidden"
      >
        Properties
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <div
        id="task-properties"
        className={cn(
          'mt-2 rounded-lg border border-border bg-card p-4 lg:mt-0 lg:block',
          open ? 'block' : 'hidden',
        )}
      >
        <h2 className="mb-3 text-xs font-semibold text-foreground">Properties</h2>
        <TaskProperties task={task} />
      </div>
    </aside>
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
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
