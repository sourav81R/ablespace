import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../../common/types/request-context';
import { AppException } from '../../common/exceptions/app.exception';
import { FirebaseService } from '../firebase.service';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * The single authentication entry point for the API.
 *
 * Registered globally, so every route is protected unless explicitly marked
 * `@Public()`. The chain is:
 *
 *   Authorization header → Firebase ID token → Admin SDK verification
 *   → verified UID → MongoDB user + workspace → request.auth
 *
 * No identity information is ever read from the request body or query string.
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

    const decoded = await this.firebase.verifyIdToken(idToken);

    // Provisions the user/workspace on first sight; a plain lookup afterwards.
    request.auth = await this.authService.resolveSession(decoded);

    return true;
  }

  private extractBearerToken(header: string | undefined): string {
    if (!header) {
      throw AppException.unauthenticated('Missing Authorization header');
    }

    const [scheme, token] = header.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw AppException.unauthenticated(
        'Authorization header must use the "Bearer <token>" scheme',
      );
    }

    return token.trim();
  }
}
