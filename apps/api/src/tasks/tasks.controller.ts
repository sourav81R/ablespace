import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActivityDto, CommentDto, SubtaskDto, TaskDto } from '@ablespace/shared';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { SubtasksService } from '../subtasks/subtasks.service';
import { CreateSubtaskDto } from '../subtasks/dto/create-subtask.dto';
import { CommentsService } from '../comments/comments.service';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { ActivityService } from '../activity/activity.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

/**
 * Task routes, plus the nested collections that hang off a task.
 *
 * Subtasks, comments and activity live here rather than in their own
 * controllers because their authorization is the parent task's: resolving the
 * task first is what proves the caller may see its children.
 */
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly subtasksService: SubtasksService,
    private readonly commentsService: CommentsService,
    private readonly activityService: ActivityService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() auth: AuthContext,
    @Query() query: QueryTasksDto,
  ): Promise<PaginatedResult<TaskDto>> {
    return this.tasksService.findAll(auth.workspace._id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<TaskDto> {
    return this.tasksService.findOne(auth.workspace._id, id);
  }

  @Post()
  create(@CurrentUser() auth: AuthContext, @Body() dto: CreateTaskDto): Promise<TaskDto> {
    return this.tasksService.create(auth, dto);
  }

  /** Also the board's drag-and-drop target: `{ "status": "DOING" }`. */
  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasksService.update(auth, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<void> {
    return this.tasksService.remove(auth, id);
  }

  // ---------------------------------------------------------------------------
  // Nested: subtasks
  // ---------------------------------------------------------------------------

  @Get(':taskId/subtasks')
  findSubtasks(
    @CurrentUser() auth: AuthContext,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
  ): Promise<SubtaskDto[]> {
    return this.subtasksService.findForTask(auth.workspace._id, taskId);
  }

  @Post(':taskId/subtasks')
  createSubtask(
    @CurrentUser() auth: AuthContext,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @Body() dto: CreateSubtaskDto,
  ): Promise<SubtaskDto> {
    return this.subtasksService.create(auth, taskId, dto);
  }

  // ---------------------------------------------------------------------------
  // Nested: comments
  // ---------------------------------------------------------------------------

  @Get(':taskId/comments')
  findComments(
    @CurrentUser() auth: AuthContext,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<CommentDto>> {
    return this.commentsService.findForTask(
      auth.workspace._id,
      taskId,
      query.page ?? 1,
      query.limit ?? 25,
    );
  }

  @Post(':taskId/comments')
  createComment(
    @CurrentUser() auth: AuthContext,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.commentsService.create(auth, taskId, dto);
  }

  // ---------------------------------------------------------------------------
  // Nested: activity
  // ---------------------------------------------------------------------------

  @Get(':taskId/activity')
  async findActivity(
    @CurrentUser() auth: AuthContext,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<ActivityDto>> {
    // Resolving the task first is the authorization check for its history.
    const task = await this.tasksService.requireTask(auth.workspace._id, taskId);

    return this.activityService.findForTask(
      task._id,
      auth.workspace._id,
      query.page ?? 1,
      query.limit ?? 25,
    );
  }
}
