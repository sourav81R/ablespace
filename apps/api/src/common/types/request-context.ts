import { Request } from 'express';
import { WorkspaceRole } from '@ablespace/shared';
import { UserDocument } from '../../users/schemas/user.schema';
import { WorkspaceDocument } from '../../workspaces/schemas/workspace.schema';
import { FirebaseUser } from '../../auth/types/firebase-user';

/**
 * The authenticated context attached to a request by FirebaseAuthGuard.
 *
 * Everything here is derived from a *verified* Firebase ID token and a database
 * lookup — never from the request body or query string. Services treat this as
 * the only trustworthy source of identity and workspace ownership.
 */
export interface AuthContext {
  /** Verified Firebase UID from the decoded ID token. */
  firebaseUid: string;
  /** The MongoDB user record for that UID. */
  user: UserDocument;
  /** The workspace this user operates in. */
  workspace: WorkspaceDocument;
  /** The user's role within that workspace. */
  role: WorkspaceRole;
}

/**
 * Express request augmented with the auth context.
 *
 * `auth` is optional at the type level because the property does not exist
 * until the guard runs; the `@CurrentUser()` decorator asserts its presence.
 */
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  /**
   * The verified Firebase claims, attached alongside {@link auth}.
   *
   * Useful where the raw identity is needed (provider, email verification
   * status, token lifetime) without a database lookup.
   */
  firebaseUser?: FirebaseUser;
}
