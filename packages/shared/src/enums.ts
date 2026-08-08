/**
 * Domain enums shared by the API and the web client.
 *
 * These are the single source of truth for every status/priority value in the
 * system. Both apps import from here so the two sides cannot drift apart —
 * a mismatch between frontend and backend enums is one of the easiest bugs to
 * ship and one of the hardest to spot.
 */

/** Board columns map 1:1 onto these values (see SYSTEM_ARCHITECTURE §19). */
export enum TaskStatus {
  TODO = 'TODO',
  DOING = 'DOING',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}

export enum Priority {
  NONE = 'NONE',
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/** Role within a workspace. Kept deliberately small for the assessment scope. */
export enum WorkspaceRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

/** How the user authenticated with Firebase. */
export enum AuthProvider {
  ANONYMOUS = 'ANONYMOUS',
  GOOGLE = 'GOOGLE',
}

/**
 * Activity event types. Every meaningful mutation writes one of these so the
 * task detail screen can render a real history rather than a fabricated one
 * (PRD §13).
 */
export enum ActivityType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_TITLE_CHANGED = 'TASK_TITLE_CHANGED',
  TASK_DESCRIPTION_CHANGED = 'TASK_DESCRIPTION_CHANGED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
  TASK_MEMBERS_CHANGED = 'TASK_MEMBERS_CHANGED',
  TASK_DUE_DATE_CHANGED = 'TASK_DUE_DATE_CHANGED',
  TASK_LABELS_CHANGED = 'TASK_LABELS_CHANGED',
  TASK_PROJECT_CHANGED = 'TASK_PROJECT_CHANGED',
  TASK_DELETED = 'TASK_DELETED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  SUBTASK_ADDED = 'SUBTASK_ADDED',
  SUBTASK_STATUS_CHANGED = 'SUBTASK_STATUS_CHANGED',
  SUBTASK_DELETED = 'SUBTASK_DELETED',
}

/** Sort keys accepted by GET /tasks. */
export enum TaskSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  DUE_DATE = 'dueDate',
  PRIORITY = 'priority',
  TITLE = 'title',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/** Ordered list used to sort by priority meaningfully (URGENT first). */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  [Priority.URGENT]: 0,
  [Priority.HIGH]: 1,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 3,
  [Priority.NONE]: 4,
};

/** Board column order, left to right, exactly as the design presents it. */
export const TASK_STATUS_ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.DOING,
  TaskStatus.COMPLETED,
  TaskStatus.ON_HOLD,
];
