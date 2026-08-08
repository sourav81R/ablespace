import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityType, CommentDto } from '@ablespace/shared';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Task } from '../tasks/schemas/task.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthContext } from '../common/types/request-context';
import { AppException } from '../common/exceptions/app.exception';
import { serialiseComment } from '../common/serializers/entity.serializer';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';
import { buildPaginationMeta, skipFor } from '../common/dto/pagination.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    private readonly activityService: ActivityService,
  ) {}

  async findForTask(
    workspaceId: Types.ObjectId,
    taskId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CommentDto>> {
    await this.requireParentTask(workspaceId, taskId);

    const filter = { taskId: new Types.ObjectId(taskId), workspaceId };

    const [comments, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .populate('authorId')
        .sort({ createdAt: -1 })
        .skip(skipFor(page, limit))
        .limit(limit)
        .exec(),
      this.commentModel.countDocuments(filter).exec(),
    ]);

    return new PaginatedResult(
      comments.map(serialiseComment),
      buildPaginationMeta(page, limit, total),
    );
  }

  async create(auth: AuthContext, taskId: string, dto: CreateCommentDto): Promise<CommentDto> {
    const workspaceId = auth.workspace._id;
    const task = await this.requireParentTask(workspaceId, taskId);

    const comment = await this.commentModel.create({
      taskId: task._id,
      workspaceId,
      authorId: auth.user._id,
      body: dto.body,
    });

    await this.activityService.record([
      {
        taskId: task._id,
        workspaceId,
        actorId: auth.user._id,
        type: ActivityType.COMMENT_ADDED,
        metadata: {},
      },
    ]);

    await comment.populate('authorId');
    return serialiseComment(comment);
  }

  /**
   * Deletes a comment.
   *
   * Beyond the workspace check, this requires the caller to be the author —
   * being in the workspace is not enough to delete someone else's words.
   */
  async remove(auth: AuthContext, commentId: string): Promise<void> {
    const comment = await this.requireComment(auth.workspace._id, commentId);

    if (!comment.authorId.equals(auth.user._id)) {
      throw AppException.forbidden('You can only delete your own comments');
    }

    await this.commentModel.deleteOne({ _id: comment._id }).exec();
  }

  private async requireParentTask(workspaceId: Types.ObjectId, taskId: string) {
    const task = await this.taskModel.findOne({ _id: taskId, workspaceId }).select('_id').exec();

    if (!task) {
      throw AppException.notFound('Task');
    }

    return task;
  }

  private async requireComment(
    workspaceId: Types.ObjectId,
    commentId: string,
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findOne({ _id: commentId, workspaceId }).exec();

    if (!comment) {
      throw AppException.notFound('Comment');
    }

    return comment;
  }
}
