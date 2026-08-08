import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDto } from '@ablespace/shared';
import { User, UserDocument } from './schemas/user.schema';
import { WorkspaceMember } from '../workspaces/schemas/workspace-member.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AppException } from '../common/exceptions/app.exception';
import { serialiseUser } from '../common/serializers/entity.serializer';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
  ) {}

  async updateProfile(user: UserDocument, dto: UpdateProfileDto): Promise<UserDto> {
    if (dto.username !== undefined) {
      await this.assertUsernameAvailable(dto.username, user._id);
      user.username = dto.username;
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    if (dto.title !== undefined) {
      // An empty string clears the field rather than storing "".
      user.title = dto.title === '' ? null : dto.title;
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    await user.save();
    return serialiseUser(user);
  }

  /**
   * Lists the people a task can be assigned to: the members of this workspace.
   *
   * The member picker needs this, and scoping it to the workspace means one
   * guest can never see another guest's account.
   */
  async findWorkspaceMembers(workspaceId: Types.ObjectId): Promise<UserDto[]> {
    const memberships = await this.memberModel
      .find({ workspaceId })
      .populate<{ userId: UserDocument }>('userId')
      .exec();

    return memberships
      .map((membership) => membership.userId)
      .filter((user): user is UserDocument => Boolean(user))
      .map(serialiseUser);
  }

  /** Verifies every supplied user id is a member of this workspace. */
  async assertMembersInWorkspace(
    workspaceId: Types.ObjectId,
    userIds: string[],
  ): Promise<Types.ObjectId[]> {
    if (userIds.length === 0) {
      return [];
    }

    const unique = [...new Set(userIds)];
    const memberships = await this.memberModel
      .find({ workspaceId, userId: { $in: unique } })
      .select('userId')
      .exec();

    if (memberships.length !== unique.length) {
      throw AppException.badRequest('One or more assignees are not members of this workspace');
    }

    return memberships.map((membership) => membership.userId);
  }

  private async assertUsernameAvailable(
    username: string,
    currentUserId: Types.ObjectId,
  ): Promise<void> {
    const taken = await this.userModel
      .findOne({ username, _id: { $ne: currentUserId } })
      .select('_id')
      .exec();

    if (taken) {
      throw AppException.conflict('That username is already taken');
    }
  }
}
