'use client';

import { Suspense } from 'react';
import { TaskWorkspace } from '@/components/tasks/task-workspace';
import { Skeleton } from '@/components/ui/states';

/**
 * The tasks screen.
 *
 * Wrapped in Suspense because TaskWorkspace reads useSearchParams for its
 * filter state, which Next requires a boundary around.
 */
export default function TasksPage() {
  return (
    <Suspense fallback={<TasksFallback />}>
      <TaskWorkspace />
    </Suspense>
  );
}

function TasksFallback() {
  return (
    <div className="p-4 sm:p-6" role="status" aria-label="Loading">
      <Skeleton className="mb-4 h-8 w-full max-w-md" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, column) => (
          <Skeleton key={column} className="h-64 w-[280px] shrink-0" />
        ))}
      </div>
    </div>
  );
}
