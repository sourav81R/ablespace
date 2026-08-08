import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

/** Listing and creation are nested under the task; deletion is by id. */
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<void> {
    return this.commentsService.remove(auth, id);
  }
}
