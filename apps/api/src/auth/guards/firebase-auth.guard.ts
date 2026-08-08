import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../../common/types/request-context';
import { AppException } from '../../common/exceptions/app.exception';
import { FirebaseService } from '../firebase.service';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { toFirebaseUser } from '../types/firebase-user';

/** The only accepted Authorization scheme, compared case-insensitively. */
const BEARER_SCHEME = 'bearer';

/**
 * The single authentication entry point for the API.
 *
 * Registered globally, so every route is protected unless explicitly marked
 * `@Public()` — a forgotten decorator leaves a route protected, which is the
 * safe direction to fail. The chain is:
 *
 *   Authorization header
 *     → Bearer <Firebase ID token>
 *     → Admin SDK verifyIdToken()
 *     → verified claims (uid, email, name, picture, provider)
 *     → MongoDB user + workspace
 *     → request.auth / request.firebaseUser
 *
 * Identity is never read from the request body, query string or a custom
 * header. The bearer token is the only accepted source, and it is trusted only
 * after the Admin SDK has verified its signature, issuer, audience and expiry.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const idToken = this.extractBearerToken(request.headers.authorization);

    // Throws AppException with TOKEN_EXPIRED or TOKEN_INVALID; the client can
    // refresh and retry on the former, and must re-authenticate on the latter.
    const decoded = await this.firebase.verifyIdToken(idToken);

    // The verified claims, normalised. Attached to the request so downstream
    // code can read the Firebase identity without re-decoding the token.
    const firebaseUser = toFirebaseUser(decoded);
    request.firebaseUser = firebaseUser;

    // Maps the verified UID onto application state, provisioning the user,
    // workspace, membership and starter labels the first time it is seen.
    request.auth = await this.authService.resolveSession(decoded);

    return true;
  }

  /**
   * Pulls the token out of an `Authorization: Bearer <token>` header.
   *
   * Split on whitespace rather than a single space so that repeated or padded
   * separators do not silently produce an empty token.
   */
  private extractBearerToken(header: string | undefined): string {
    if (!header) {
      throw AppException.unauthenticated('Missing Authorization header');
    }

    const parts = header.trim().split(/\s+/);

    if (parts.length !== 2) {
      throw AppException.unauthenticated(
        'Authorization header must be in the form "Bearer <token>"',
      );
    }

    const [scheme, token] = parts;

    if (scheme.toLowerCase() !== BEARER_SCHEME) {
      throw AppException.unauthenticated('Authorization header must use the "Bearer" scheme');
    }

    if (!token) {
      throw AppException.unauthenticated('Bearer token is empty');
    }

    return token;
  }
}
