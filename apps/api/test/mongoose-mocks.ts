import { Types } from 'mongoose';
import { WorkspaceRole } from '@ablespace/shared';
import { AuthContext } from '../src/common/types/request-context';
import { UserDocument } from '../src/users/schemas/user.schema';
import { WorkspaceDocument } from '../src/workspaces/schemas/workspace.schema';

/**
 * Test doubles for the Mongoose layer.
 *
 * Services are tested against these rather than a real database so the
 * assertions are about the *queries the service builds* — which is exactly
 * what the workspace-scoping guarantees depend on. A real database would
 * confirm the data came back but not that the filter was correct.
 */

/** A chainable stub mimicking Mongoose's fluent query builder. */
export type QueryStub = Record<string, jest.Mock>;

export function queryStub(result: unknown): QueryStub {
  const stub: QueryStub = {};
  for (const method of ['populate', 'sort', 'skip', 'limit', 'select', 'lean']) {
    stub[method] = jest.fn(() => stub);
  }
  stub.exec = jest.fn(async () => result);
  return stub;
}

/** The model methods the services use. */
export interface ModelStub {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  insertMany: jest.Mock;
  countDocuments: jest.Mock;
  updateMany: jest.Mock;
  deleteOne: jest.Mock;
  deleteMany: jest.Mock;
  aggregate: jest.Mock;
}

export function modelStub(): ModelStub {
  return {
    find: jest.fn(() => queryStub([])),
    findOne: jest.fn(() => queryStub(null)),
    findById: jest.fn(() => queryStub(null)),
    create: jest.fn(),
    insertMany: jest.fn(async () => []),
    countDocuments: jest.fn(() => queryStub(0)),
    updateMany: jest.fn(() => queryStub({ modifiedCount: 0 })),
    deleteOne: jest.fn(() => queryStub({ deletedCount: 1 })),
    deleteMany: jest.fn(() => queryStub({ deletedCount: 0 })),
    aggregate: jest.fn(() => queryStub([])),
  };
}

/** A document stub with the mutation methods services call on it. */
export type DocumentStub<T> = T & {
  _id: Types.ObjectId;
  save: jest.Mock;
  populate: jest.Mock;
};

/**
 * A saveable document stub, as `findOne` would return.
 *
 * `save` and `populate` resolve to the document itself, so a service that
 * awaits them and keeps using the object behaves as it would in production.
 */
export function documentStub<T extends object>(fields: T): DocumentStub<T> {
  const doc: DocumentStub<T> = {
    _id: new Types.ObjectId(),
    ...fields,
    save: jest.fn(),
    populate: jest.fn(),
  } as DocumentStub<T>;

  doc.save.mockResolvedValue(doc);
  doc.populate.mockResolvedValue(doc);

  return doc;
}

/** Builds an authenticated context for a given workspace. */
export function authContextFor(
  workspaceId: Types.ObjectId,
  userId: Types.ObjectId = new Types.ObjectId(),
): AuthContext {
  return {
    firebaseUid: `uid-${userId.toString().slice(0, 6)}`,
    user: { _id: userId, displayName: 'Test User' } as UserDocument,
    workspace: { _id: workspaceId, name: 'Test Workspace' } as WorkspaceDocument,
    role: WorkspaceRole.OWNER,
  };
}
