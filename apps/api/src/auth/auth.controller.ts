import { Controller, Get } from '@nestjs/common';
import { SessionDto } from '@ablespace/shared';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { serialiseUser, serialiseWorkspace } from '../common/serializers/entity.serializer';

/**
 * There is deliberately no `POST /auth/guest` or `POST /auth/logout` here.
 *
 * Firebase owns the session lifecycle: the browser signs in (anonymously or
 * with Google) and signs out through the Firebase SDK. The API's only job is to
 * verify the resulting token and map it onto application state, which is what
 * `GET /auth/me` does.
 */
@Controller('auth')
export class AuthController {
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
}
