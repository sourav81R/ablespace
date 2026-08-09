'use client';

import { Button } from '@/components/ui/button';
import type { TaskFilters } from '@/lib/api/use-tasks';
import type { TaskView } from '@/lib/tasks/use-task-filters';
import { SearchInput } from './search-input';
import { FieldsMenu } from './fields-menu';
import { ViewSwitcher } from './view-switcher';

export function TaskToolbar({
  filters,
  view,
  hasFilters,
  onParamsChange,
  onViewChange,
  onReset,
  action,
}: {
  filters: TaskFilters;
  view: TaskView;
  hasFilters: boolean;
  onParamsChange: (updates: Record<string, string | string[] | undefined>) => void;
  onViewChange: (view: TaskView) => void;
  onReset: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchInput
        value={filters.search ?? ''}
        onChange={(search) => onParamsChange({ search: search || undefined })}
      />

      <FieldsMenu
        filters={filters}
        onChange={onParamsChange}
        onReset={onReset}
        hasFilters={hasFilters}
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ViewSwitcher view={view} onChange={onViewChange} />
        {action}
      </div>
    </div>
  );
}

