import { Types } from 'mongoose';
import {
  ActivityDto,
  CommentDto,
  LabelDto,
  ProjectDto,
  SubtaskDto,
  TaskDto,
  UserDto,
  WorkspaceDto,
} from '@ablespace/shared';
import { UserDocument } from '../../users/schemas/user.schema';
import { WorkspaceDocument } from '../../workspaces/schemas/workspace.schema';
import { LabelDocument } from '../../labels/schemas/label.schema';
import { ProjectDocument } from '../../projects/schemas/project.schema';
import { TaskDocument } from '../../tasks/schemas/task.schema';
import { SubtaskDocument } from '../../subtasks/schemas/subtask.schema';
import { CommentDocument } from '../../comments/schemas/comment.schema';
import { ActivityDocument } from '../../activity/schemas/activity.schema';

/**
 * Converts Mongoose documents into the API's public DTO shapes.
 *
 * Serialisation lives in one place for two reasons: the wire format stays
 * consistent across endpoints, and internal fields (`__v`, raw ObjectIds) never
 * leak into responses by accident. Ids become strings and dates become ISO
 * strings, which is what the client actually consumes.
 */

/** A reference field that may or may not have been populated by the query. */
type MaybePopulated<T> = Types.ObjectId | T | null | undefined;

function toId(value: Types.ObjectId | string): string {
  return value.toString();
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** True when a reference was populated into a full document. */
function isPopulated<T extends { _id: Types.ObjectId }>(value: MaybePopulated<T>): value is T {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Types.ObjectId) &&
    '_id' in value
  );
}

export function serialiseUser(user: UserDocument): UserDto {
  return {
    id: toId(user._id),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    title: user.title,
    username: user.username,
    isAnonymous: user.isAnonymous,
    provider: user.provider,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Serialises a reference that may not have been populated. */
function serialiseUserRef(value: MaybePopulated<UserDocument>): UserDto | null {
  return isPopulated(value) ? serialiseUser(value) : null;
}

export function serialiseWorkspace(workspace: WorkspaceDocument): WorkspaceDto {
  return {
    id: toId(workspace._id),
    name: workspace.name,
    createdBy: toId(workspace.createdBy),
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export function serialiseLabel(label: LabelDocument): LabelDto {
  return {
    id: toId(label._id),
    workspaceId: toId(label.workspaceId),
    name: label.name,
    color: label.color,
    createdAt: label.createdAt.toISOString(),
    updatedAt: label.updatedAt.toISOString(),
  };
}

export function serialiseProject(project: ProjectDocument, taskCount?: number): ProjectDto {
  return {
    id: toId(project._id),
    workspaceId: toId(project.workspaceId),
    name: project.name,
    description: project.description,
    priority: project.priority,
    lead: serialiseUserRef(project.leadId as MaybePopulated<UserDocument>),
    dueDate: toIso(project.dueDate),
    ...(taskCount !== undefined ? { taskCount } : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/** Counts are supplied by the caller, which aggregates them in one query. */
export interface TaskCounts {
  subtaskCount: number;
  commentCount: number;
}

export function serialiseTask(
  task: TaskDocument,
  counts: TaskCounts = { subtaskCount: 0, commentCount: 0 },
): TaskDto {
  const project = task.projectId as MaybePopulated<ProjectDocument>;
  const members = (task.memberIds ?? []) as MaybePopulated<UserDocument>[];
  const labels = (task.labelIds ?? []) as MaybePopulated<LabelDocument>[];

  return {
    id: toId(task._id),
    workspaceId: toId(task.workspaceId),
    project: isPopulated(project) ? { id: toId(project._id), name: project.name } : null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    reporter: serialiseUserRef(task.reporterId as MaybePopulated<UserDocument>),
    members: members.filter(isPopulated).map(serialiseUser),
    labels: labels.filter(isPopulated).map(serialiseLabel),
    teamIds: task.teamIds ?? [],
    dueDate: toIso(task.dueDate),
    resources: (task.resources ?? []).map((resource) => ({
      label: resource.label,
      url: resource.url,
    })),
    subtaskCount: counts.subtaskCount,
    commentCount: counts.commentCount,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: toIso(task.completedAt),
  };
}

export function serialiseSubtask(subtask: SubtaskDocument): SubtaskDto {
  return {
    id: toId(subtask._id),
    taskId: toId(subtask.taskId),
    title: subtask.title,
    status: subtask.status,
    priority: subtask.priority,
    member: serialiseUserRef(subtask.memberId as MaybePopulated<UserDocument>),
    dueDate: toIso(subtask.dueDate),
    order: subtask.order,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
}

export function serialiseComment(comment: CommentDocument): CommentDto {
  return {
    id: toId(comment._id),
    taskId: toId(comment.taskId),
    author: serialiseUserRef(comment.authorId as MaybePopulated<UserDocument>),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function serialiseActivity(activity: ActivityDocument): ActivityDto {
  return {
    id: toId(activity._id),
    taskId: toId(activity.taskId),
    actor: serialiseUserRef(activity.actorId as MaybePopulated<UserDocument>),
    type: activity.type,
    metadata: activity.metadata ?? {},
    createdAt: activity.createdAt.toISOString(),
  };
}
