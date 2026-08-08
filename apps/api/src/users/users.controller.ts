import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserDto } from '@ablespace/shared';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { serialiseUser } from '../common/serializers/entity.serializer';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** The current profile. Already loaded by the guard, so no extra query. */
  @Get('me')
  getMe(@CurrentUser() auth: AuthContext): UserDto {
    return serialiseUser(auth.user);
  }

  @Patch('me')
  updateMe(@CurrentUser() auth: AuthContext, @Body() dto: UpdateProfileDto): Promise<UserDto> {
    return this.usersService.updateProfile(auth.user, dto);
  }

  /** Assignable users — the members of the caller's workspace. */
  @Get()
  findWorkspaceMembers(@CurrentUser() auth: AuthContext): Promise<UserDto[]> {
    return this.usersService.findWorkspaceMembers(auth.workspace._id);
  }
}
