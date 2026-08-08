/**
 * API contract types.
 *
 * These describe the JSON the API actually returns (serialised shapes — ids are
 * strings, dates are ISO strings), not the Mongoose documents. The web client
 * consumes these directly so it never has to guess at the response shape.
 */
import {
  ActivityType,
  AuthProvider,
  Priority,
  TaskStatus,
  WorkspaceRole,
} from './enums';

/** Envelope for a single resource (SYSTEM_ARCHITECTURE §14). */
export interface ApiResponse<T> {
  data: T;
}

/** Pagination metadata attached to every list response. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Envelope for a collection. */
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Shape of every error the API emits. */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  /**
   * Per-field validation messages, or an empty array when the error carries no
   * detail. Always present so callers can read it unconditionally.
   */
  details: unknown[];
  path: string;
  timestamp: string;
  /**
   * The underlying error and its stack.
   *
   * Present only outside production, and only for unexpected errors. Never
   * emitted by a deployed server.
   */
  debug?: {
    name: string;
    message: string;
    stack?: string[];
  };
}

export interface UserDto {
  /** The application's internal identity (MongoDB `_id`). */
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  username: string | null;
  /** True for Firebase Anonymous Authentication (guest login). */
  isAnonymous: boolean;
  provider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberDto {
  id: string;
  workspaceId: string;
  user: UserDto;
  role: WorkspaceRole;
  createdAt: string;
}

/** Returned by GET /auth/me — everything the client needs to boot. */
export interface SessionDto {
  user: UserDto;
  workspace: WorkspaceDto;
  role: WorkspaceRole;
}

export interface LabelDto {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  priority: Priority;
  lead: UserDto | null;
  dueDate: string | null;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** A link attached to a task ("Resources" in the design). */
export interface ResourceLink {
  label: string;
  url: string;
}

export interface TaskDto {
  id: string;
  workspaceId: string;
  project: Pick<ProjectDto, 'id' | 'name'> | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  reporter: UserDto | null;
  members: UserDto[];
  labels: LabelDto[];
  teamIds: string[];
  dueDate: string | null;
  resources: ResourceLink[];
  subtaskCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface SubtaskDto {
  id: string;
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  member: UserDto | null;
  dueDate: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDto {
  id: string;
  taskId: string;
  author: UserDto | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDto {
  id: string;
  taskId: string;
  actor: UserDto | null;
  type: ActivityType;
  metadata: ActivityMetadata;
  createdAt: string;
}

/**
 * Free-form-ish payload describing what changed. Kept as a narrow record rather
 * than `any` so the UI can render "X changed from A to B" safely.
 */
export interface ActivityMetadata {
  field?: string;
  from?: string | string[] | null;
  to?: string | string[] | null;
  title?: string;
  [key: string]: unknown;
}
