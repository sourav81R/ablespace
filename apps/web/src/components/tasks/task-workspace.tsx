'use client';

import { useState } from 'react';
import { ListTodo, Plus, SearchX } from 'lucide-react';
import { TaskStatus, type TaskDto } from '@ablespace/shared';
import { useTasks } from '@/lib/api/use-tasks';
import { useTaskFilters } from '@/lib/tasks/use-task-filters';
import { DataState, EmptyState, Skeleton } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { TaskToolbar } from './task-toolbar';
import { BoardView } from './board-view';
import { ListView } from './list-view';
import { TaskFormDialog } from './task-form-dialog';

/**
 * The tasks screen: toolbar plus whichever view is selected.
 *
 * Filtering happens on the server — the hook passes the URL's filters straight
 * to the API — so the browser never holds the whole workspace in memory to
 * filter it.
 */
export function TaskWorkspace() {
  const { filters, view, setParams, setView, reset, hasFilters } = useTaskFilters();
  const tasks = useTasks(filters);

  // One dialog serves create and edit: `editing` decides which, and
  // `defaultStatus` carries the column an Add button belongs to.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDto | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus | undefined>();

  const openCreate = (status?: TaskStatus) => {
    setEditing(undefined);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (task: TaskDto) => {
    setEditing(task);
    setDefaultStatus(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 sm:p-6">
      <TaskToolbar
        filters={filters}
        view={view}
        hasFilters={hasFilters}
        onParamsChange={setParams}
        onViewChange={setView}
        onReset={reset}
        action={
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        }
      />

      <DataState
        isLoading={tasks.isLoading}
        error={tasks.error}
        data={tasks.data}
        isEmpty={(page) => page.data.length === 0}
        onRetry={() => tasks.refetch()}
        loadingFallback={<BoardSkeleton />}
        emptyFallback={
          // A filtered empty result is a different situation from an empty
          // workspace, and the way out differs too.
          hasFilters ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
              title="No tasks match these filters"
              description="Try removing a filter or clearing your search."
            />
          ) : (
            <EmptyState
              icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
              title="No tasks yet"
              description="Create your first task, or run `pnpm seed` to load the demo board."
              action={
                <Button size="sm" onClick={() => openCreate()}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Task
                </Button>
              }
            />
          )
        }
      >
        {(page) =>
          view === 'board' ? (
            <BoardView tasks={page.data} onAddTask={openCreate} onEditTask={openEdit} />
          ) : (
            <ListView tasks={page.data} onAddTask={openCreate} onEditTask={openEdit} />
          )
        }
      </DataState>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={editing}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}

/** Mirrors the board's column layout so the page does not jump on load. */
function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" role="status" aria-label="Loading tasks">
      {Array.from({ length: 4 }).map((_, column) => (
        <div key={column} className="w-[280px] shrink-0 space-y-2 rounded-lg bg-muted/50 p-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}
