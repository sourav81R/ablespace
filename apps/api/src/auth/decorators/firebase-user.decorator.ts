import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request-context';
import { AppException } from '../../common/exceptions/app.exception';
import { FirebaseUser } from '../types/firebase-user';

/**
 * Injects the verified Firebase claims into a controller method.
 *
 * Use this when the raw identity is what matters — provider, email
 * verification, token lifetime. For the application user and workspace, use
 * `@CurrentUser()` instead.
 */
export const CurrentFirebaseUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FirebaseUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.firebaseUser) {
      // Reaching here means the handler used this decorator on a route the
      // guard did not protect — a programming error, not a client error.
      throw AppException.unauthenticated('Firebase user is missing for this route');
    }

    return request.firebaseUser;
  },
);
