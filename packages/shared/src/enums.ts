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

/**
 * Role within a workspace.
 *
 * Deliberately two values: everything the product does today is either "manage
 * the workspace itself" or "work inside it". Adding a role later means adding
 * an enum member and a capability entry below — no call site changes, because
 * permission checks ask {@link roleAllows} rather than comparing roles.
 */
export enum WorkspaceRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

/**
 * Things a role may be permitted to do.
 *
 * Checking a capability rather than a role is what keeps the system
 * extensible: `roleAllows(role, Capability.DELETE_WORKSPACE)` stays correct
 * when a third role appears, whereas `role === OWNER` scattered through the
 * codebase would all need revisiting.
 */
export enum Capability {
  /** Create, edit and delete tasks, projects, labels, comments, subtasks. */
  MANAGE_CONTENT = 'MANAGE_CONTENT',
  /** Rename the workspace and change its settings. */
  MANAGE_WORKSPACE = 'MANAGE_WORKSPACE',
  /** Invite or remove other members. */
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  /** Delete the workspace outright. */
  DELETE_WORKSPACE = 'DELETE_WORKSPACE',
}

/** Which capabilities each role carries. */
const ROLE_CAPABILITIES: Record<WorkspaceRole, ReadonlySet<Capability>> = {
  [WorkspaceRole.OWNER]: new Set([
    Capability.MANAGE_CONTENT,
    Capability.MANAGE_WORKSPACE,
    Capability.MANAGE_MEMBERS,
    Capability.DELETE_WORKSPACE,
  ]),
  [WorkspaceRole.MEMBER]: new Set([Capability.MANAGE_CONTENT]),
};

/** True when the role carries the capability. */
export function roleAllows(role: WorkspaceRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.has(capability) ?? false;
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
  /**
   * A field changed that has no dedicated event of its own — currently the
   * title, description or project. The `metadata.field` value says which.
   */
  TASK_UPDATED = 'TASK_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  MEMBER_CHANGED = 'MEMBER_CHANGED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  LABEL_CHANGED = 'LABEL_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  SUBTASK_ADDED = 'SUBTASK_ADDED',
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
