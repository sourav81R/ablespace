import { DecodedIdToken } from 'firebase-admin/auth';
import { AuthProvider } from '@ablespace/shared';

/**
 * The identity claims extracted from a *verified* Firebase ID token.
 *
 * Every field here originates from a token that the Admin SDK has already
 * checked for signature, issuer, audience and expiry. Nothing in this shape
 * ever comes from a request body, query string or header other than the
 * verified bearer token itself.
 */
export interface FirebaseUser {
  /** Firebase UID — the join key to the MongoDB user record. */
  uid: string;
  email: string | null;
  /** True when Firebase has confirmed ownership of the email address. */
  emailVerified: boolean;
  name: string | null;
  /** Profile photo URL, `picture` in the raw token. */
  picture: string | null;
  /** Raw Firebase sign-in method, e.g. `anonymous`, `google.com`, `password`. */
  signInProvider: string | null;
  /** The sign-in method mapped onto the application's own provider enum. */
  provider: AuthProvider;
  /** True for Firebase Anonymous Authentication (guest login). */
  isAnonymous: boolean;
  /** Token issue and expiry times, as epoch seconds. */
  issuedAt: number;
  expiresAt: number;
}

/** Firebase's identifier for anonymous sign-in. */
const ANONYMOUS_PROVIDER = 'anonymous';

/** Firebase's identifier for Google sign-in. */
const GOOGLE_PROVIDER = 'google.com';

/**
 * Projects a decoded Firebase token onto {@link FirebaseUser}.
 *
 * Claims are optional in the SDK's type, so each is normalised to an explicit
 * `null` rather than left `undefined` — downstream code should not have to
 * distinguish "absent" from "empty".
 */
export function toFirebaseUser(token: DecodedIdToken): FirebaseUser {
  const signInProvider = token.firebase?.sign_in_provider ?? null;
  const isAnonymous = signInProvider === ANONYMOUS_PROVIDER;

  return {
    uid: token.uid,
    email: token.email ?? null,
    emailVerified: token.email_verified === true,
    name: typeof token.name === 'string' ? token.name : null,
    picture: token.picture ?? null,
    signInProvider,
    provider: resolveProvider(signInProvider),
    isAnonymous,
    issuedAt: token.iat,
    expiresAt: token.exp,
  };
}

/**
 * Maps Firebase's sign-in method onto the application's provider enum.
 *
 * Only the two methods this product enables are distinguished; anything else
 * is treated as a non-guest account, which is the conservative default — it
 * grants no extra trust and keeps the account out of the guest path.
 */
function resolveProvider(signInProvider: string | null): AuthProvider {
  switch (signInProvider) {
    case ANONYMOUS_PROVIDER:
      return AuthProvider.ANONYMOUS;
    case GOOGLE_PROVIDER:
      return AuthProvider.GOOGLE;
    default:
      return AuthProvider.GOOGLE;
  }
}
