import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DecodedIdToken } from 'firebase-admin/auth';
import { AuthProvider } from '@ablespace/shared';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseService } from '../firebase.service';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../../common/types/request-context';
import { ErrorCode } from '../../common/types/error-codes';
import { AppException } from '../../common/exceptions/app.exception';

/**
 * The guard is the boundary between an anonymous HTTP request and a trusted
 * identity, so its rejection paths matter as much as its success path.
 */
describe('FirebaseAuthGuard', () => {
  const decodedToken = {
    uid: 'firebase-uid-123',
    email: 'demo@example.com',
    email_verified: true,
    name: 'Demo User',
    picture: 'https://example.com/avatar.png',
    firebase: { sign_in_provider: 'google.com', identities: {} },
    iat: 1_700_000_000,
    exp: 1_700_003_600,
    aud: 'ablespace',
    iss: 'https://securetoken.google.com/ablespace',
    sub: 'firebase-uid-123',
    auth_time: 1_700_000_000,
  } as unknown as DecodedIdToken;

  let guard: FirebaseAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let firebase: { verifyIdToken: jest.Mock };
  let authService: { resolveSession: jest.Mock };
  let request: AuthenticatedRequest;

  /** Minimal ExecutionContext exposing the request under test. */
  function contextFor(req: AuthenticatedRequest): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn(() => false) };
    firebase = { verifyIdToken: jest.fn(async () => decodedToken) };
    authService = {
      resolveSession: jest.fn(async () => ({
        firebaseUid: decodedToken.uid,
        user: {},
        workspace: {},
        role: 'OWNER',
      })),
    };

    request = { headers: {} } as AuthenticatedRequest;

    guard = new FirebaseAuthGuard(
      reflector as unknown as Reflector,
      firebase as unknown as FirebaseService,
      authService as unknown as AuthService,
    );
  });

  describe('public routes', () => {
    it('allows a route marked @Public() without a token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
      expect(firebase.verifyIdToken).not.toHaveBeenCalled();
    });
  });

  describe('Authorization header parsing', () => {
    it('rejects a request with no Authorization header', async () => {
      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'Missing Authorization header',
      );
    });

    it('rejects a non-Bearer scheme', async () => {
      request.headers.authorization = 'Basic dXNlcjpwYXNz';

      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'must use the "Bearer" scheme',
      );
    });

    it('rejects a bare token with no scheme', async () => {
      request.headers.authorization = 'sometokenvalue';

      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'must be in the form "Bearer <token>"',
      );
    });

    it('rejects a scheme with no token', async () => {
      request.headers.authorization = 'Bearer';

      await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
        'must be in the form "Bearer <token>"',
      );
    });

    it('accepts the scheme case-insensitively', async () => {
      // Some HTTP clients normalise header casing; RFC 7235 is case-insensitive.
      request.headers.authorization = 'bearer valid-token';

      await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
      expect(firebase.verifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    it('tolerates extra whitespace between scheme and token', async () => {
      request.headers.authorization = '  Bearer   valid-token  ';

      await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
      expect(firebase.verifyIdToken).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('token verification', () => {
    it('propagates an expired-token error', async () => {
      request.headers.authorization = 'Bearer expired-token';
      firebase.verifyIdToken.mockRejectedValue(
        AppException.unauthenticated('expired', ErrorCode.TOKEN_EXPIRED),
      );

      await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
        code: ErrorCode.TOKEN_EXPIRED,
      });
    });

    it('propagates an invalid-token error', async () => {
      request.headers.authorization = 'Bearer forged-token';
      firebase.verifyIdToken.mockRejectedValue(
        AppException.unauthenticated('invalid', ErrorCode.TOKEN_INVALID),
      );

      await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
    });

    it('does not resolve a session when verification fails', async () => {
      request.headers.authorization = 'Bearer forged-token';
      firebase.verifyIdToken.mockRejectedValue(new Error('boom'));

      await expect(guard.canActivate(contextFor(request))).rejects.toThrow();
      expect(authService.resolveSession).not.toHaveBeenCalled();
    });
  });

  describe('claim extraction', () => {
    beforeEach(() => {
      request.headers.authorization = 'Bearer valid-token';
    });

    it('attaches the verified claims to the request', async () => {
      await guard.canActivate(contextFor(request));

      expect(request.firebaseUser).toEqual({
        uid: 'firebase-uid-123',
        email: 'demo@example.com',
        emailVerified: true,
        name: 'Demo User',
        picture: 'https://example.com/avatar.png',
        signInProvider: 'google.com',
        provider: AuthProvider.GOOGLE,
        isAnonymous: false,
        issuedAt: 1_700_000_000,
        expiresAt: 1_700_003_600,
      });
    });

    it('marks an anonymous sign-in as a guest', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        ...decodedToken,
        email: undefined,
        name: undefined,
        picture: undefined,
        firebase: { sign_in_provider: 'anonymous', identities: {} },
      } as unknown as DecodedIdToken);

      await guard.canActivate(contextFor(request));

      expect(request.firebaseUser).toMatchObject({
        isAnonymous: true,
        provider: AuthProvider.ANONYMOUS,
        email: null,
        name: null,
        picture: null,
      });
    });

    it('attaches the resolved application session', async () => {
      await guard.canActivate(contextFor(request));

      expect(request.auth).toMatchObject({ firebaseUid: 'firebase-uid-123' });
    });
  });

  describe('trust boundary', () => {
    it('ignores identity fields supplied in the request body', async () => {
      // The whole point of the guard: a client claiming to be someone else in
      // the payload must have no effect on the resolved identity.
      request.headers.authorization = 'Bearer valid-token';
      request.body = { uid: 'attacker-uid', email: 'attacker@example.com' };

      await guard.canActivate(contextFor(request));

      expect(request.firebaseUser?.uid).toBe('firebase-uid-123');
      expect(request.firebaseUser?.email).toBe('demo@example.com');
      // The session is resolved from the verified token, not the body.
      expect(authService.resolveSession).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'firebase-uid-123' }),
      );
    });

    it('ignores a spoofed user-id header', async () => {
      request.headers.authorization = 'Bearer valid-token';
      request.headers['x-user-id'] = 'attacker-uid';

      await guard.canActivate(contextFor(request));

      expect(request.firebaseUser?.uid).toBe('firebase-uid-123');
    });
  });
});
