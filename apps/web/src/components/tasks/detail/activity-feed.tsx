'use client';

import { ActivityType, type ActivityDto } from '@ablespace/shared';
import { useActivity } from '@/lib/api/use-tasks';
import { DataState, EmptyState } from '@/components/ui/states';
import { Avatar } from '@/components/ui/avatar';
import { formatRelative } from './comment-section';

/**
 * The task's history.
 *
 * Every entry is a row the API wrote when a real mutation happened. Nothing is
 * synthesised here — an event the backend did not record does not appear.
 */
export function ActivityFeed({ taskId }: { taskId: string }) {
  const activity = useActivity(taskId);

  return (
    <DataState
      isLoading={activity.isLoading}
      error={activity.error}
      data={activity.data}
      isEmpty={(page) => page.data.length === 0}
      onRetry={() => activity.refetch()}
      emptyFallback={<EmptyState title="No activity yet" />}
    >
      {(page) => (
        <ol className="space-y-3">
          {page.data.map((event) => (
            <li key={event.id} className="flex gap-2.5">
              <Avatar
                name={event.actor?.displayName ?? 'Unknown'}
                src={event.actor?.avatarUrl}
                size="xs"
                className="mt-0.5"
              />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {event.actor?.displayName ?? 'Someone'}
                </span>{' '}
                {describe(event)}{' '}
                <time dateTime={event.createdAt} className="whitespace-nowrap">
                  · {formatRelative(event.createdAt)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </DataState>
  );
}

/**
 * Turns a stored event into a sentence.
 *
 * The wording is derived from the event's own type and metadata, so it always
 * describes what the server actually recorded.
 */
function describe(event: ActivityDto): string {
  const { type, metadata } = event;
  const from = format(metadata.from);
  const to = format(metadata.to);

  switch (type) {
    case ActivityType.TASK_CREATED:
      return 'created this task';

    case ActivityType.TASK_UPDATED:
      // Title, description and project share this type; the field says which.
      return metadata.field ? `updated the ${label(metadata.field)}` : 'updated this task';

    case ActivityType.STATUS_CHANGED:
      // Subtask status changes reuse this type, tagged with the subtask title.
      if (typeof metadata.subtask === 'string') {
        return `moved "${metadata.subtask}" to ${label(to)}`;
      }
      return from ? `moved this from ${label(from)} to ${label(to)}` : `set the status to ${label(to)}`;

    case ActivityType.PRIORITY_CHANGED:
      return from ? `changed priority from ${label(from)} to ${label(to)}` : `set priority to ${label(to)}`;

    case ActivityType.MEMBER_CHANGED:
      return 'changed the assigned members';

    case ActivityType.DUE_DATE_CHANGED:
      if (!to) return 'cleared the due date';
      return `set the due date to ${new Date(to).toLocaleDateString()}`;

    case ActivityType.LABEL_CHANGED:
      return 'changed the labels';

    case ActivityType.COMMENT_ADDED:
      return 'added a comment';

    case ActivityType.SUBTASK_ADDED:
      return metadata.title ? `added the subtask "${metadata.title}"` : 'added a subtask';

    default:
      // A type added to the API before this switch knows about it still reads
      // sensibly rather than rendering a raw enum.
      return String(type).replaceAll('_', ' ').toLowerCase();
  }
}

/** Metadata values may be arrays or null; only a single string is displayable. */
function format(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** "ON_HOLD" reads as "on hold". */
function label(value: string | null): string {
  return value ? value.replaceAll('_', ' ').toLowerCase() : 'none';
}
