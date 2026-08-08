import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ActivityMetadata, ActivityType } from '@ablespace/shared';

export type ActivityDocument = HydratedDocument<Activity>;

/**
 * An immutable record of something that happened to a task.
 *
 * Append-only by design: no service exposes an update or delete path. The
 * history is what makes the task detail screen's activity feed real rather than
 * decorative (PRD §13).
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'activities',
})
export class Activity {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  /** Denormalised for single-query authorization — see Subtask for rationale. */
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  /** Who performed the action. Null only for system-generated events (seeds). */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorId: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(ActivityType), required: true })
  type: ActivityType;

  /**
   * What changed, e.g. `{ field: 'status', from: 'TODO', to: 'DOING' }`.
   * Typed as a narrow record rather than `any` so the UI can render it safely.
   */
  @Prop({ type: Object, default: {} })
  metadata: ActivityMetadata;

  createdAt: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// The activity feed reads newest-first for a single task.
ActivitySchema.index({ taskId: 1, createdAt: -1 });
