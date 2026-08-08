import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Priority, TaskStatus } from '@ablespace/shared';

export type TaskDocument = HydratedDocument<Task>;

/**
 * A link attached to a task — the "Resources" section of the task detail
 * screen. Embedded rather than collected: resources are few, always read with
 * their task, and never queried independently.
 */
@Schema({ _id: false })
export class TaskResource {
  @Prop({ required: true, trim: true, maxlength: 120 })
  label: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  url: string;
}

const TaskResourceSchema = SchemaFactory.createForClass(TaskResource);

/**
 * The core task entity.
 *
 * Board columns map directly onto `status` (SYSTEM_ARCHITECTURE §19), so moving
 * a card between columns is a single field update.
 */
@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId: Types.ObjectId | null;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ type: String, default: null, maxlength: 10000 })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    required: true,
    default: TaskStatus.TODO,
    index: true,
  })
  status: TaskStatus;

  @Prop({
    type: String,
    enum: Object.values(Priority),
    required: true,
    default: Priority.NONE,
  })
  priority: Priority;

  /** Who filed the task. Always set from the authenticated user, never the body. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporterId: Types.ObjectId;

  /** Assignees. Rendered as the avatar group on cards and rows. */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  memberIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Label' }], default: [] })
  labelIds: Types.ObjectId[];

  /**
   * Team identifiers shown on the task details panel.
   *
   * There is no Team collection: the design surfaces "Teams" but defines no
   * team entity, so these are stored as plain string identifiers rather than
   * ObjectId references. That keeps the field usable now and leaves room to
   * introduce a Team collection later without reshaping the task.
   */
  @Prop({ type: [String], default: [] })
  teamIds: string[];

  @Prop({ type: Date, default: null, index: true })
  dueDate: Date | null;

  @Prop({ type: [TaskResourceSchema], default: [] })
  resources: TaskResource[];

  /** Stamped when status first becomes COMPLETED; cleared if it moves back. */
  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Compound indexes matching the queries the board and list views actually issue.
// Every one leads with workspaceId because no query ever crosses a workspace.
TaskSchema.index({ workspaceId: 1, status: 1 });
TaskSchema.index({ workspaceId: 1, projectId: 1 });
TaskSchema.index({ workspaceId: 1, dueDate: 1 });
TaskSchema.index({ workspaceId: 1, updatedAt: -1 });
TaskSchema.index({ workspaceId: 1, memberIds: 1 });

// Full-text search over the fields the search box targets (PRD §10). Labels are
// stored as ids, so label search is handled separately in TasksService by
// resolving names to ids first.
TaskSchema.index(
  { title: 'text', description: 'text' },
  { name: 'task_text_search', weights: { title: 10, description: 2 } },
);
