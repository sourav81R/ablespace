import { Types } from 'mongoose';
import { ActivityType } from '@ablespace/shared';
import { TaskDocument } from '../tasks/schemas/task.schema';
import { ActivityEvent } from './activity.service';

/** Identifies the task and actor an event belongs to. */
interface EventScope {
  taskId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;
}

/** The task fields worth recording, captured before a mutation. */
export interface TaskSnapshot {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  projectId: string | null;
  memberIds: string[];
  labelIds: string[];
}

/** Captures the current state of a task for later comparison. */
export function snapshotTask(task: TaskDocument): TaskSnapshot {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    projectId: task.projectId ? task.projectId.toString() : null,
    memberIds: (task.memberIds ?? []).map((id) => id.toString()),
    labelIds: (task.labelIds ?? []).map((id) => id.toString()),
  };
}

/**
 * Compares a before/after snapshot and produces one event per changed field.
 *
 * Keeping the diff logic here rather than inline in TasksService means the
 * "what changed" rules are testable in isolation and the service reads as a
 * sequence of intent, not bookkeeping.
 */
export function diffTaskSnapshots(
  before: TaskSnapshot,
  after: TaskSnapshot,
  scope: EventScope,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const push = (
    type: ActivityType,
    field: string,
    from: string | string[] | null,
    to: string | string[] | null,
  ): void => {
    events.push({ ...scope, type, metadata: { field, from, to } });
  };

  if (before.title !== after.title) {
    push(ActivityType.TASK_TITLE_CHANGED, 'title', before.title, after.title);
  }

  if (before.description !== after.description) {
    // Descriptions can be long; record that it changed, not the whole body.
    events.push({
      ...scope,
      type: ActivityType.TASK_DESCRIPTION_CHANGED,
      metadata: { field: 'description' },
    });
  }

  if (before.status !== after.status) {
    push(ActivityType.TASK_STATUS_CHANGED, 'status', before.status, after.status);
  }

  if (before.priority !== after.priority) {
    push(ActivityType.TASK_PRIORITY_CHANGED, 'priority', before.priority, after.priority);
  }

  if (!datesEqual(before.dueDate, after.dueDate)) {
    push(
      ActivityType.TASK_DUE_DATE_CHANGED,
      'dueDate',
      before.dueDate ? before.dueDate.toISOString() : null,
      after.dueDate ? after.dueDate.toISOString() : null,
    );
  }

  if (before.projectId !== after.projectId) {
    push(ActivityType.TASK_PROJECT_CHANGED, 'project', before.projectId, after.projectId);
  }

  if (!sameMembers(before.memberIds, after.memberIds)) {
    push(ActivityType.TASK_MEMBERS_CHANGED, 'members', before.memberIds, after.memberIds);
  }

  if (!sameMembers(before.labelIds, after.labelIds)) {
    push(ActivityType.TASK_LABELS_CHANGED, 'labels', before.labelIds, after.labelIds);
  }

  return events;
}

function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.getTime() === b.getTime();
}

/** Order-insensitive comparison — reordering assignees is not a change. */
function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}
