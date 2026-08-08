import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext, AuthenticatedRequest } from '../../common/types/request-context';
import { AppException } from '../../common/exceptions/app.exception';

/**
 * Injects the verified {@link AuthContext} into a controller method.
 *
 * The context is populated by FirebaseAuthGuard from a verified ID token, so
 * anything read through this decorator is trustworthy — unlike anything in the
 * request body. Every service takes its user and workspace from here.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.auth) {
      // Reaching here means a handler used @CurrentUser() on a route the guard
      // did not protect — a programming error, not a client error.
      throw AppException.unauthenticated('Authentication context is missing for this route');
    }

    return request.auth;
  },
);
