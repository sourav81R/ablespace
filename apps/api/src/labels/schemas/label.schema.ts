import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LabelDocument = HydratedDocument<Label>;

/**
 * A workspace-scoped tag applied to tasks.
 *
 * Labels are a separate collection rather than free strings on the task so that
 * renaming or recolouring a label updates every task at once, and so the filter
 * menu can list the available labels without scanning all tasks.
 */
@Schema({ timestamps: true, collection: 'labels' })
export class Label {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 40 })
  name: string;

  /** Hex colour used by the label chip, e.g. `#22C55E`. */
  @Prop({ required: true, default: '#64748B' })
  color: string;

  createdAt: Date;
  updatedAt: Date;
}

export const LabelSchema = SchemaFactory.createForClass(Label);

// Label names are unique within a workspace (case-sensitive), which keeps the
// filter list clean and makes name-based lookup during search unambiguous.
LabelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
