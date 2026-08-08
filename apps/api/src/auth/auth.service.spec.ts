import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AuthProvider, WorkspaceRole } from '@ablespace/shared';
import { AuthService } from './auth.service';
import { FirebaseUser } from './types/firebase-user';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Workspace } from '../workspaces/schemas/workspace.schema';
import { WorkspaceMember } from '../workspaces/schemas/workspace-member.schema';
import { LabelsService } from '../labels/labels.service';

/**
 * Provisioning is where Firebase identity becomes application state, so both
 * sign-in paths are covered here: anonymous (guest login) and Google.
 */
describe('AuthService', () => {
  const userId = new Types.ObjectId();
  const workspaceId = new Types.ObjectId();

  /** Claims as they arrive from an anonymous (guest) token. */
  const guestClaims: FirebaseUser = {
    uid: 'anon-uid-1',
    email: null,
    emailVerified: false,
    name: null,
    picture: null,
    signInProvider: 'anonymous',
    provider: AuthProvider.ANONYMOUS,
    isAnonymous: true,
    issuedAt: 1_700_000_000,
    expiresAt: 1_700_003_600,
  };

  /** Claims as they arrive from a Google token. */
  const googleClaims: FirebaseUser = {
    uid: 'google-uid-1',
    email: 'demo@example.com',
    emailVerified: true,
    name: 'Demo User',
    picture: 'https://example.com/photo.png',
    signInProvider: 'google.com',
    provider: AuthProvider.GOOGLE,
    isAnonymous: false,
    issuedAt: 1_700_000_000,
    expiresAt: 1_700_003_600,
  };

  function queryStub(result: unknown) {
    const stub: Record<string, jest.Mock> = {};
    for (const method of ['sort', 'select', 'populate']) {
      stub[method] = jest.fn(() => stub);
    }
    stub.exec = jest.fn(async () => result);
    return stub;
  }

  /** A minimal Mongoose-like user document. */
  function userDoc(overrides: Partial<User> = {}): UserDocument {
    return {
      _id: userId,
      firebaseUid: 'anon-uid-1',
      email: null,
      displayName: 'Guest ANON',
      avatarUrl: null,
      title: null,
      username: 'guest-anon-u',
      isAnonymous: true,
      provider: AuthProvider.ANONYMOUS,
      save: jest.fn(async function (this: unknown) {
        return this;
      }),
      ...overrides,
    } as unknown as UserDocument;
  }

  let service: AuthService;
  let userModel: { findOne: jest.Mock; create: jest.Mock };
  let workspaceModel: { findById: jest.Mock; create: jest.Mock; deleteOne: jest.Mock };
  let memberModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    deleteOne: jest.Mock;
    countDocuments: jest.Mock;
  };
  let labelsService: { createDefaultLabels: jest.Mock };

  beforeEach(async () => {
    userModel = { findOne: jest.fn(() => queryStub(null)), create: jest.fn() };
    workspaceModel = {
      findById: jest.fn(() => queryStub(null)),
      create: jest.fn(async () => ({ _id: workspaceId, name: 'Demo Workspace' })),
      deleteOne: jest.fn(() => queryStub({ deletedCount: 1 })),
    };
    memberModel = {
      findOne: jest.fn(() => queryStub(null)),
      create: jest.fn(async () => ({ _id: new Types.ObjectId(), role: WorkspaceRole.OWNER })),
      deleteOne: jest.fn(() => queryStub({ deletedCount: 1 })),
      countDocuments: jest.fn(() => queryStub(0)),
    };
    labelsService = { createDefaultLabels: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Workspace.name), useValue: workspaceModel },
        { provide: getModelToken(WorkspaceMember.name), useValue: memberModel },
        { provide: getConnectionToken(), useValue: { collection: () => ({}) } },
        { provide: LabelsService, useValue: labelsService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('guest login (Firebase Anonymous)', () => {
    it('creates user, workspace and membership on first request', async () => {
      userModel.create.mockResolvedValue(userDoc());

      const context = await service.resolveSession(guestClaims);

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: 'anon-uid-1',
          isAnonymous: true,
          provider: AuthProvider.ANONYMOUS,
        }),
      );
      expect(workspaceModel.create).toHaveBeenCalled();
      expect(memberModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, role: WorkspaceRole.OWNER }),
      );
      expect(context.firebaseUid).toBe('anon-uid-1');
    });

    it('seeds starter labels for the new workspace', async () => {
      userModel.create.mockResolvedValue(userDoc());

      await service.resolveSession(guestClaims);

      expect(labelsService.createDefaultLabels).toHaveBeenCalledWith(workspaceId);
    });

    it('gives the guest a readable display name', async () => {
      userModel.create.mockResolvedValue(userDoc());

      await service.resolveSession(guestClaims);

      const created = userModel.create.mock.calls[0][0];
      expect(created.displayName).toMatch(/^Guest /);
      expect(created.username).toBe('guest-anon-u');
    });

    it('reuses the existing user and workspace on later requests', async () => {
      const existing = userDoc();
      userModel.findOne.mockReturnValue(queryStub(existing));
      memberModel.findOne.mockReturnValue(
        queryStub({ _id: new Types.ObjectId(), workspaceId, role: WorkspaceRole.OWNER }),
      );
      workspaceModel.findById.mockReturnValue(queryStub({ _id: workspaceId }));

      await service.resolveSession(guestClaims);

      // Provisioning is idempotent: nothing is created a second time.
      expect(userModel.create).not.toHaveBeenCalled();
      expect(workspaceModel.create).not.toHaveBeenCalled();
      expect(memberModel.create).not.toHaveBeenCalled();
    });

    it('does not overwrite a guest profile with empty provider claims', async () => {
      const existing = userDoc();
      userModel.findOne.mockReturnValue(queryStub(existing));
      memberModel.findOne.mockReturnValue(
        queryStub({ _id: new Types.ObjectId(), workspaceId, role: WorkspaceRole.OWNER }),
      );
      workspaceModel.findById.mockReturnValue(queryStub({ _id: workspaceId }));

      await service.resolveSession(guestClaims);

      expect(existing.save).not.toHaveBeenCalled();
      expect(existing.displayName).toBe('Guest ANON');
    });
  });

  describe('Google login', () => {
    it('creates a non-guest user preserving uid, email, name and avatar', async () => {
      userModel.create.mockResolvedValue(userDoc({ isAnonymous: false }));

      await service.resolveSession(googleClaims);

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: 'google-uid-1',
          email: 'demo@example.com',
          displayName: 'Demo User',
          avatarUrl: 'https://example.com/photo.png',
          isAnonymous: false,
          provider: AuthProvider.GOOGLE,
        }),
      );
    });

    it('adopts a changed Google display name', async () => {
      const existing = userDoc({
        firebaseUid: 'google-uid-1',
        isAnonymous: false,
        provider: AuthProvider.GOOGLE,
        email: 'demo@example.com',
        displayName: 'User',
      });
      userModel.findOne.mockReturnValue(queryStub(existing));
      memberModel.findOne.mockReturnValue(
        queryStub({ _id: new Types.ObjectId(), workspaceId, role: WorkspaceRole.OWNER }),
      );
      workspaceModel.findById.mockReturnValue(queryStub({ _id: workspaceId }));

      await service.resolveSession(googleClaims);

      expect(existing.displayName).toBe('Demo User');
      expect(existing.save).toHaveBeenCalled();
    });

    it('does not overwrite a name the user set themselves', async () => {
      const existing = userDoc({
        firebaseUid: 'google-uid-1',
        isAnonymous: false,
        provider: AuthProvider.GOOGLE,
        email: 'demo@example.com',
        displayName: 'My Chosen Name',
        avatarUrl: 'https://example.com/mine.png',
      });
      userModel.findOne.mockReturnValue(queryStub(existing));
      memberModel.findOne.mockReturnValue(
        queryStub({ _id: new Types.ObjectId(), workspaceId, role: WorkspaceRole.OWNER }),
      );
      workspaceModel.findById.mockReturnValue(queryStub({ _id: workspaceId }));

      await service.resolveSession(googleClaims);

      expect(existing.displayName).toBe('My Chosen Name');
      expect(existing.avatarUrl).toBe('https://example.com/mine.png');
    });

    it('upgrades an anonymous account linked to Google, keeping the workspace', async () => {
      // Firebase linkWithCredential keeps the same UID, so the record — and all
      // the work done as a guest — must survive the upgrade.
      const existing = userDoc({ firebaseUid: 'google-uid-1' });
      userModel.findOne.mockReturnValue(queryStub(existing));
      memberModel.findOne.mockReturnValue(
        queryStub({ _id: new Types.ObjectId(), workspaceId, role: WorkspaceRole.OWNER }),
      );
      workspaceModel.findById.mockReturnValue(queryStub({ _id: workspaceId }));

      const context = await service.resolveSession(googleClaims);

      expect(existing.isAnonymous).toBe(false);
      expect(existing.provider).toBe(AuthProvider.GOOGLE);
      expect(existing.email).toBe('demo@example.com');
      expect(existing.displayName).toBe('Demo User');
      expect(existing.avatarUrl).toBe('https://example.com/photo.png');
      expect(existing.save).toHaveBeenCalled();
      // Same workspace, not a new one.
      expect(workspaceModel.create).not.toHaveBeenCalled();
      expect(context.workspace).toMatchObject({ _id: workspaceId });
    });

    it('makes no write when nothing changed', async () => {
      const existing = userDoc({
        firebaseUid: 'google-uid-1',
        isAnonymous: false,
        provider: AuthProvider.GOOGLE,
        email: 'demo@example.com',
        displayName: 'Demo User',
        avatarUrl: 'https://example.com/photo.png',
      });
      userModel.findOne.mockReturnValue(queryStub(existing));
      memberModel.findOne.mockReturnValue(
        queryStub({ _id: new Types.ObjectId(), workspaceId, role: WorkspaceRole.OWNER }),
      );
      workspaceModel.findById.mockReturnValue(queryStub({ _id: workspaceId }));

      await service.resolveSession(googleClaims);

      // Avoids a pointless database write on every single request.
      expect(existing.save).not.toHaveBeenCalled();
    });
  });

  describe('identity source', () => {
    it('derives the user only from verified claims', async () => {
      userModel.create.mockResolvedValue(userDoc({ isAnonymous: false }));

      await service.resolveSession(googleClaims);

      // firebaseUid comes from the token's uid, never from a client-supplied id.
      expect(userModel.findOne).toHaveBeenCalledWith({ firebaseUid: 'google-uid-1' });
      expect(userModel.create.mock.calls[0][0].firebaseUid).toBe('google-uid-1');
    });
  });
});
