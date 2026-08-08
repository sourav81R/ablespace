import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Priority } from '@ablespace/shared';

export type ProjectDocument = HydratedDocument<Project>;

/**
 * A project groups tasks within a workspace. The Projects screen lists these
 * with name, priority, lead and due date (PRD §14).
 */
@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ type: String, default: null, maxlength: 2000 })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(Priority),
    required: true,
    default: Priority.NONE,
  })
  priority: Priority;

  /** The user accountable for the project. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  leadId: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  dueDate: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// The Projects list is always workspace-scoped and usually sorted by recency.
ProjectSchema.index({ workspaceId: 1, createdAt: -1 });
