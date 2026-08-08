import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WorkspaceRole } from '@ablespace/shared';

export type WorkspaceMemberDocument = HydratedDocument<WorkspaceMember>;

/**
 * Join record linking a user to a workspace.
 *
 * Membership is modelled as its own collection rather than an array on either
 * side: it is the document every authorization check reads, so it deserves its
 * own index, and it leaves room for multi-member workspaces without reshaping
 * the user document.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'workspace_members' })
export class WorkspaceMember {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(WorkspaceRole),
    required: true,
    default: WorkspaceRole.MEMBER,
  })
  role: WorkspaceRole;

  createdAt: Date;
}

export const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

// A user may hold only one membership row per workspace. The unique index also
// makes the just-in-time provisioning path safe against concurrent requests:
// a duplicate insert fails loudly instead of silently creating a second row.
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
