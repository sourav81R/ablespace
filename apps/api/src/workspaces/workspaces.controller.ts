import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WorkspaceDto, WorkspaceMemberDto } from '@ablespace/shared';
import { WorkspacesService } from './workspaces.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { serialiseWorkspace } from '../common/serializers/entity.serializer';

@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly authService: AuthService,
  ) {}

  /** The caller's current workspace. */
  @Get('me')
  getMine(@CurrentUser() auth: AuthContext): WorkspaceDto {
    return serialiseWorkspace(auth.workspace);
  }

  /** Workspace access list, shown on the profile screen. */
  @Get('me/members')
  getMembers(@CurrentUser() auth: AuthContext): Promise<WorkspaceMemberDto[]> {
    return this.workspacesService.findMembers(auth.workspace._id);
  }

  /**
   * "Leave Workspace" on the profile screen. When the last member leaves, the
   * workspace and its contents are removed rather than left orphaned.
   *
   * The next request re-provisions a fresh workspace for the same Firebase
   * account, so the user is never locked out.
   */
  @Post('me/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() auth: AuthContext): Promise<void> {
    return this.authService.leaveWorkspace(auth);
  }
}
