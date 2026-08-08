import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { DecodedIdToken } from 'firebase-admin/auth';
import { AuthProvider, WorkspaceRole } from '@ablespace/shared';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Workspace, WorkspaceDocument } from '../workspaces/schemas/workspace.schema';
import { WorkspaceMember } from '../workspaces/schemas/workspace-member.schema';
import { AuthContext } from '../common/types/request-context';
import { AppException } from '../common/exceptions/app.exception';
import { LabelsService } from '../labels/labels.service';

/** Mongo duplicate-key error number, used to detect provisioning races. */
const DUPLICATE_KEY = 11000;

/**
 * Turns a verified Firebase token into an application session.
 *
 * There is no signup endpoint: Firebase owns account creation, so the first
 * time we see a valid UID we provision the user, their workspace, membership
 * and starter labels just-in-time. The operation is idempotent — every
 * subsequent request simply finds what already exists.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Workspace.name) private readonly workspaceModel: Model<Workspace>,
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
    @InjectConnection() private readonly connection: Connection,
    private readonly labelsService: LabelsService,
  ) {}

  /**
   * Resolves (and provisions on first sight) the session for a verified token.
   */
  async resolveSession(token: DecodedIdToken): Promise<AuthContext> {
    const user = await this.findOrCreateUser(token);
    const { workspace, role } = await this.findOrCreateWorkspace(user);

    return { firebaseUid: token.uid, user, workspace, role };
  }

  private async findOrCreateUser(token: DecodedIdToken): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ firebaseUid: token.uid }).exec();
    if (existing) {
      return existing;
    }

    const profile = this.profileFromToken(token);

    try {
      const created = await this.userModel.create({
        firebaseUid: token.uid,
        ...profile,
      });
      this.logger.log(`Provisioned user for uid ${token.uid} (${profile.provider})`);
      return created;
    } catch (error) {
      // Two concurrent first requests can both miss the read above. The unique
      // index on firebaseUid makes one of them fail; re-reading resolves it.
      if (this.isDuplicateKeyError(error)) {
        const raced = await this.userModel.findOne({ firebaseUid: token.uid }).exec();
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  /**
   * Derives the profile from *verified token claims only*.
   *
   * Name, email and photo come from Firebase, never from the request body —
   * otherwise a client could claim any identity it liked.
   */
  private profileFromToken(token: DecodedIdToken): {
    email: string | null;
    name: string;
    avatarUrl: string | null;
    isGuest: boolean;
    provider: AuthProvider;
    username: string | null;
    title: string | null;
  } {
    const signInProvider = token.firebase?.sign_in_provider;
    const isAnonymous = signInProvider === 'anonymous';

    return {
      email: token.email ?? null,
      name: token.name ?? (isAnonymous ? this.guestDisplayName(token.uid) : 'User'),
      avatarUrl: token.picture ?? null,
      isGuest: isAnonymous,
      provider: isAnonymous ? AuthProvider.ANONYMOUS : AuthProvider.GOOGLE,
      username: isAnonymous ? `guest-${token.uid.slice(0, 6).toLowerCase()}` : null,
      title: null,
    };
  }

  /** A stable, human-readable name so guest avatars are not blank. */
  private guestDisplayName(uid: string): string {
    return `Guest ${uid.slice(0, 4).toUpperCase()}`;
  }

  private async findOrCreateWorkspace(
    user: UserDocument,
  ): Promise<{ workspace: WorkspaceDocument; role: WorkspaceRole }> {
    const membership = await this.memberModel
      .findOne({ userId: user._id })
      .sort({ createdAt: 1 })
      .exec();

    if (membership) {
      const workspace = await this.workspaceModel.findById(membership.workspaceId).exec();

      if (workspace) {
        return { workspace, role: membership.role };
      }

      // Membership pointing at a deleted workspace leaves the user stranded.
      // Clear it and fall through to provision a fresh workspace.
      this.logger.warn(
        `Membership ${membership._id.toString()} referenced a missing workspace; reprovisioning`,
      );
      await this.memberModel.deleteOne({ _id: membership._id }).exec();
    }

    return this.provisionWorkspace(user);
  }

  /** Creates a workspace, its owner membership, and the starter label set. */
  private async provisionWorkspace(
    user: UserDocument,
  ): Promise<{ workspace: WorkspaceDocument; role: WorkspaceRole }> {
    const workspace = await this.workspaceModel.create({
      name: this.workspaceNameFor(user),
      createdBy: user._id,
    });

    try {
      await this.memberModel.create({
        workspaceId: workspace._id,
        userId: user._id,
        role: WorkspaceRole.OWNER,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        // Another request provisioned concurrently. Drop the workspace we just
        // created and use the one that won the race.
        await this.workspaceModel.deleteOne({ _id: workspace._id }).exec();
        const winner = await this.memberModel.findOne({ userId: user._id }).exec();
        const existing = winner
          ? await this.workspaceModel.findById(winner.workspaceId).exec()
          : null;

        if (existing && winner) {
          return { workspace: existing, role: winner.role };
        }
      }
      throw error;
    }

    await this.labelsService.createDefaultLabels(workspace._id);

    this.logger.log(
      `Provisioned workspace ${workspace._id.toString()} for user ${user._id.toString()}`,
    );

    return { workspace, role: WorkspaceRole.OWNER };
  }

  private workspaceNameFor(user: UserDocument): string {
    const first = user.name.split(' ')[0]?.trim();
    return first ? `${first}'s Workspace` : 'My Workspace';
  }

  /**
   * Removes the user from their workspace ("Leave Workspace" on the profile
   * screen). If they were the last member, the workspace and everything in it
   * is removed too, so we do not leave orphaned data behind.
   */
  async leaveWorkspace(context: AuthContext): Promise<void> {
    const { user, workspace } = context;

    const membership = await this.memberModel
      .findOne({ workspaceId: workspace._id, userId: user._id })
      .exec();

    if (!membership) {
      throw AppException.notFound('Workspace membership');
    }

    await this.memberModel.deleteOne({ _id: membership._id }).exec();

    const remaining = await this.memberModel.countDocuments({ workspaceId: workspace._id }).exec();

    if (remaining === 0) {
      await this.purgeWorkspace(workspace._id.toString());
    }
  }

  /**
   * Deletes a workspace and every record scoped to it.
   *
   * Collections are cleared by name through the shared connection to avoid
   * circular module dependencies — this service would otherwise need to import
   * every feature module just to delete their documents.
   */
  private async purgeWorkspace(workspaceId: string): Promise<void> {
    const scoped = ['tasks', 'subtasks', 'comments', 'activities', 'projects', 'labels'];

    for (const collection of scoped) {
      await this.connection
        .collection(collection)
        .deleteMany({ workspaceId: new this.connection.base.Types.ObjectId(workspaceId) });
    }

    await this.workspaceModel.deleteOne({ _id: workspaceId }).exec();
    this.logger.log(`Purged empty workspace ${workspaceId}`);
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === DUPLICATE_KEY
    );
  }
}
