import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

/** A comment on a task (PRD §13). */
@Schema({ timestamps: true, collection: 'comments' })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  /** Denormalised for single-query authorization — see Subtask for rationale. */
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  /** Set from the authenticated user; a user may only delete their own comment. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  body: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Comments are read chronologically for a single task.
CommentSchema.index({ taskId: 1, createdAt: -1 });
