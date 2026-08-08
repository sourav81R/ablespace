import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WorkspaceDocument = HydratedDocument<Workspace>;

/**
 * A tenant boundary. Every project, task, label, comment and activity record
 * belongs to exactly one workspace, and all authorization is ultimately a
 * question of "does this user belong to this workspace?".
 *
 * Each guest gets their own workspace, which is what keeps one guest's data
 * invisible to another (PRD §4.1).
 */
@Schema({ timestamps: true, collection: 'workspaces' })
export class Workspace {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
