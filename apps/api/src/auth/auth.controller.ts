import { Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { SessionDto } from '@ablespace/shared';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { serialiseUser, serialiseWorkspace } from '../common/serializers/entity.serializer';

/**
 * There is deliberately no `POST /auth/guest`.
 *
 * Firebase owns account creation and the session lifecycle: the browser signs
 * in anonymously or with Google, and the API's job is to verify the resulting
 * token and map it onto application state. `GET /auth/me` does that, and also
 * provisions the user on first sight.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  /**
   * Returns the current user, their workspace and role.
   *
   * Also the provisioning trigger: the guard creates the user, workspace,
   * membership and starter labels the first time a new token is seen, so the
   * client calls this immediately after signing in.
   */
  @Get('me')
  getSession(@CurrentUser() auth: AuthContext): SessionDto {
    return {
      user: serialiseUser(auth.user),
      workspace: serialiseWorkspace(auth.workspace),
      role: auth.role,
    };
  }

  /**
   * Acknowledges a sign-out.
   *
   * The actual sign-out happens in the browser via the Firebase SDK, which
   * discards the refresh token — there is no server-side session to destroy,
   * so this endpoint deliberately does not try to invalidate anything.
   *
   * It exists for two reasons: the client gets one endpoint to call on logout
   * without special-casing it, and the event is recorded server-side. It
   * requires a valid token, so it cannot be used to log anyone else out.
   *
   * Note that the caller's existing ID token stays valid until it expires (up
   * to an hour). Forcing immediate invalidation would mean revoking refresh
   * tokens and enabling `checkRevoked` on every request, which costs a network
   * round-trip to Firebase per call — not a trade-off this application needs.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() auth: AuthContext): void {
    this.logger.log(`User ${auth.user._id.toString()} signed out`);
  }
}
