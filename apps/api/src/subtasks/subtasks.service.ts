import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityType, Priority, SubtaskDto, TaskStatus } from '@ablespace/shared';
import { Subtask, SubtaskDocument } from './schemas/subtask.schema';
import { Task } from '../tasks/schemas/task.schema';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { AuthContext } from '../common/types/request-context';
import { AppException } from '../common/exceptions/app.exception';
import { serialiseSubtask } from '../common/serializers/entity.serializer';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class SubtasksService {
  constructor(
    @InjectModel(Subtask.name) private readonly subtaskModel: Model<Subtask>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    private readonly usersService: UsersService,
    private readonly activityService: ActivityService,
  ) {}

  async findForTask(workspaceId: Types.ObjectId, taskId: string): Promise<SubtaskDto[]> {
    // Confirms the parent task belongs to this workspace before exposing children.
    await this.requireParentTask(workspaceId, taskId);

    const subtasks = await this.subtaskModel
      .find({ taskId, workspaceId })
      .populate('memberId')
      .sort({ order: 1, createdAt: 1 })
      .exec();

    return subtasks.map(serialiseSubtask);
  }

  async create(auth: AuthContext, taskId: string, dto: CreateSubtaskDto): Promise<SubtaskDto> {
    const workspaceId = auth.workspace._id;
    const task = await this.requireParentTask(workspaceId, taskId);

    const memberId = await this.resolveMember(workspaceId, dto.memberId);
    const order = dto.order ?? (await this.nextOrder(task._id));

    const subtask = await this.subtaskModel.create({
      taskId: task._id,
      // Denormalised from the parent so future access checks are a single query.
      workspaceId,
      title: dto.title,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority ?? Priority.NONE,
      memberId,
      dueDate: dto.dueDate ?? null,
      order,
    });

    await this.activityService.record([
      {
        taskId: task._id,
        workspaceId,
        actorId: auth.user._id,
        type: ActivityType.SUBTASK_ADDED,
        metadata: { title: subtask.title },
      },
    ]);

    await subtask.populate('memberId');
    return serialiseSubtask(subtask);
  }

  async update(auth: AuthContext, subtaskId: string, dto: UpdateSubtaskDto): Promise<SubtaskDto> {
    const workspaceId = auth.workspace._id;
    const subtask = await this.requireSubtask(workspaceId, subtaskId);
    const previousStatus = subtask.status;

    if (dto.title !== undefined) {
      subtask.title = dto.title;
    }

    if (dto.status !== undefined) {
      subtask.status = dto.status;
    }

    if (dto.priority !== undefined) {
      subtask.priority = dto.priority;
    }

    if (dto.dueDate !== undefined) {
      subtask.dueDate = dto.dueDate;
    }

    if (dto.order !== undefined) {
      subtask.order = dto.order;
    }

    if (dto.memberId !== undefined) {
      subtask.memberId = await this.resolveMember(workspaceId, dto.memberId);
    }

    await subtask.save();

    // Only status changes are recorded: checking items off is the meaningful
    // event on the parent task's timeline; renaming a subtask is noise.
    if (dto.status !== undefined && dto.status !== previousStatus) {
      await this.activityService.record([
        {
          taskId: subtask.taskId,
          workspaceId,
          actorId: auth.user._id,
          type: ActivityType.SUBTASK_STATUS_CHANGED,
          metadata: {
            title: subtask.title,
            field: 'status',
            from: previousStatus,
            to: subtask.status,
          },
        },
      ]);
    }

    await subtask.populate('memberId');
    return serialiseSubtask(subtask);
  }

  async remove(auth: AuthContext, subtaskId: string): Promise<void> {
    const workspaceId = auth.workspace._id;
    const subtask = await this.requireSubtask(workspaceId, subtaskId);

    await this.subtaskModel.deleteOne({ _id: subtask._id }).exec();

    await this.activityService.record([
      {
        taskId: subtask.taskId,
        workspaceId,
        actorId: auth.user._id,
        type: ActivityType.SUBTASK_DELETED,
        metadata: { title: subtask.title },
      },
    ]);
  }

  /** Places a new subtask at the end of the list. */
  private async nextOrder(taskId: Types.ObjectId): Promise<number> {
    const last = await this.subtaskModel
      .findOne({ taskId })
      .sort({ order: -1 })
      .select('order')
      .exec();

    return last ? last.order + 1 : 0;
  }

  private async resolveMember(
    workspaceId: Types.ObjectId,
    memberId: string | null | undefined,
  ): Promise<Types.ObjectId | null> {
    if (!memberId) {
      return null;
    }

    const [resolved] = await this.usersService.assertMembersInWorkspace(workspaceId, [memberId]);

    return resolved ?? null;
  }

  /** Verifies the parent task is in this workspace before touching children. */
  private async requireParentTask(workspaceId: Types.ObjectId, taskId: string) {
    const task = await this.taskModel.findOne({ _id: taskId, workspaceId }).select('_id').exec();

    if (!task) {
      throw AppException.notFound('Task');
    }

    return task;
  }

  /**
   * Loads a subtask scoped by workspace.
   *
   * This is why `workspaceId` is denormalised onto the subtask: the check is
   * one indexed query rather than a lookup back through the parent task.
   */
  private async requireSubtask(
    workspaceId: Types.ObjectId,
    subtaskId: string,
  ): Promise<SubtaskDocument> {
    const subtask = await this.subtaskModel.findOne({ _id: subtaskId, workspaceId }).exec();

    if (!subtask) {
      throw AppException.notFound('Subtask');
    }

    return subtask;
  }
}
