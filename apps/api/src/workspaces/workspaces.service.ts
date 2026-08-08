import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkspaceMemberDto } from '@ablespace/shared';
import { WorkspaceMember } from './schemas/workspace-member.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { serialiseUser } from '../common/serializers/entity.serializer';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
  ) {}

  async findMembers(workspaceId: Types.ObjectId): Promise<WorkspaceMemberDto[]> {
    const memberships = await this.memberModel
      .find({ workspaceId })
      .populate<{ userId: UserDocument }>('userId')
      .sort({ createdAt: 1 })
      .exec();

    return memberships
      .filter((membership) => Boolean(membership.userId))
      .map((membership) => ({
        id: membership._id.toString(),
        workspaceId: membership.workspaceId.toString(),
        user: serialiseUser(membership.userId),
        role: membership.role,
        createdAt: membership.createdAt.toISOString(),
      }));
  }

  /**
   * Confirms a user belongs to a workspace.
   *
   * The guard already establishes this for the caller's own workspace, so this
   * exists for paths that need to re-check membership explicitly.
   */
  async isMember(workspaceId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const membership = await this.memberModel.findOne({ workspaceId, userId }).select('_id').exec();

    return membership !== null;
  }
}
