import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Priority, TaskStatus } from '@ablespace/shared';

export type SubtaskDocument = HydratedDocument<Subtask>;

/**
 * A child item of a task, shown in the subtask table on the detail screen.
 *
 * Kept in its own collection rather than embedded in the task: subtasks carry
 * their own status, priority, assignee and due date and are updated
 * individually, so a separate document keeps partial updates simple and avoids
 * unbounded growth of the parent (SYSTEM_ARCHITECTURE §10).
 */
@Schema({ timestamps: true, collection: 'subtasks' })
export class Subtask {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  /**
   * Denormalised from the parent task so authorization is a single indexed
   * query rather than a lookup back through the task on every access.
   */
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    required: true,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Prop({
    type: String,
    enum: Object.values(Priority),
    required: true,
    default: Priority.NONE,
  })
  priority: Priority;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  memberId: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  dueDate: Date | null;

  /** Manual ordering within the parent task's subtask table. */
  @Prop({ type: Number, required: true, default: 0 })
  order: number;

  createdAt: Date;
  updatedAt: Date;
}

export const SubtaskSchema = SchemaFactory.createForClass(Subtask);

// Subtasks are always listed for one task, in display order.
SubtaskSchema.index({ taskId: 1, order: 1, createdAt: 1 });
