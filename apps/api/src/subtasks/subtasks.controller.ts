import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { SubtaskDto } from '@ablespace/shared';
import { SubtasksService } from './subtasks.service';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

/**
 * Update and delete are addressed by subtask id directly, matching the API
 * design in SYSTEM_ARCHITECTURE §13. Listing and creation are nested under the
 * parent task in TasksController.
 */
@Controller('subtasks')
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSubtaskDto,
  ): Promise<SubtaskDto> {
    return this.subtasksService.update(auth, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<void> {
    return this.subtasksService.remove(auth, id);
  }
}
