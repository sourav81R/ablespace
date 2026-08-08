import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';
import {
  ActivityType,
  PRIORITY_WEIGHT,
  Priority,
  SortOrder,
  TaskDto,
  TaskSortField,
  TaskStatus,
} from '@ablespace/shared';
import { Task, TaskDocument } from './schemas/task.schema';
import { Subtask } from '../subtasks/schemas/subtask.schema';
import { Comment } from '../comments/schemas/comment.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { AuthContext } from '../common/types/request-context';
import { AppException } from '../common/exceptions/app.exception';
import { serialiseTask, TaskCounts } from '../common/serializers/entity.serializer';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';
import { buildPaginationMeta, skipFor } from '../common/dto/pagination.dto';
import { escapeRegex } from '../common/utils/regex.util';
import { UsersService } from '../users/users.service';
import { LabelsService } from '../labels/labels.service';
import { ProjectsService } from '../projects/projects.service';
import { ActivityService } from '../activity/activity.service';
import { diffTaskSnapshots, snapshotTask } from '../activity/activity-diff';

/** Reference fields populated whenever a task is returned to the client. */
const TASK_POPULATE = ['reporterId', 'memberIds', 'labelIds', 'projectId'] as const;

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Subtask.name) private readonly subtaskModel: Model<Subtask>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    private readonly usersService: UsersService,
    private readonly labelsService: LabelsService,
    private readonly projectsService: ProjectsService,
    private readonly activityService: ActivityService,
  ) {}

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findAll(
    workspaceId: Types.ObjectId,
    query: QueryTasksDto,
  ): Promise<PaginatedResult<TaskDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const filter = await this.buildFilter(workspaceId, query);

    // Priority is a string enum, so lexical sorting would be meaningless
    // ("HIGH" < "LOW"). Sorting by it needs an aggregation that maps each value
    // onto its weight; every other sort is a plain indexed query.
    if (query.sort === TaskSortField.PRIORITY) {
      return this.findAllSortedByPriority(filter, query, page, limit);
    }

    const sortField = query.sort ?? TaskSortField.CREATED_AT;
    const direction = query.order === SortOrder.ASC ? 1 : -1;

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate([...TASK_POPULATE])
        .sort({ [sortField]: direction, _id: direction })
        .skip(skipFor(page, limit))
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    return this.toPaginatedResult(tasks, page, limit, total);
  }

  /** Priority-ordered listing, using a computed weight for correct ordering. */
  private async findAllSortedByPriority(
    filter: FilterQuery<Task>,
    query: QueryTasksDto,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<TaskDto>> {
    const direction = query.order === SortOrder.ASC ? 1 : -1;

    const branches = Object.entries(PRIORITY_WEIGHT).map(([priority, weight]) => ({
      case: { $eq: ['$priority', priority] },
      then: weight,
    }));

    const pipeline: PipelineStage[] = [
      { $match: filter },
      { $addFields: { priorityWeight: { $switch: { branches, default: 99 } } } },
      { $sort: { priorityWeight: direction, _id: direction } },
      { $skip: skipFor(page, limit) },
      { $limit: limit },
      { $project: { priorityWeight: 0 } },
    ];

    const [rows, total] = await Promise.all([
      this.taskModel.aggregate<Task & { _id: Types.ObjectId }>(pipeline).exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    // Aggregation returns plain objects, so rehydrate them to reuse the same
    // populate + serialise path as every other query.
    const tasks = await this.taskModel
      .find({ _id: { $in: rows.map((row) => row._id) } })
      .populate([...TASK_POPULATE])
      .exec();

    const order = new Map(rows.map((row, index) => [row._id.toString(), index]));
    tasks.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));

    return this.toPaginatedResult(tasks, page, limit, total);
  }

  async findOne(workspaceId: Types.ObjectId, taskId: string): Promise<TaskDto> {
    const task = await this.requireTask(workspaceId, taskId, true);
    const counts = await this.countChildren([task._id]);

    return serialiseTask(task, counts.get(task._id.toString()));
  }

  /**
   * Translates query parameters into a MongoDB filter.
   *
   * Every filter is added on top of the mandatory `workspaceId` scope. That
   * scope is never optional and never derived from user input — it comes from
   * the verified session, which is what makes cross-tenant access impossible.
   */
  private async buildFilter(
    workspaceId: Types.ObjectId,
    query: QueryTasksDto,
  ): Promise<FilterQuery<Task>> {
    const filter: FilterQuery<Task> = { workspaceId };

    if (query.status?.length) {
      filter.status = { $in: query.status };
    }

    if (query.priority?.length) {
      filter.priority = { $in: query.priority };
    }

    if (query.memberId?.length) {
      filter.memberIds = { $in: query.memberId.map((id) => new Types.ObjectId(id)) };
    }

    if (query.labelId?.length) {
      filter.labelIds = { $in: query.labelId.map((id) => new Types.ObjectId(id)) };
    }

    if (query.reporterId) {
      filter.reporterId = new Types.ObjectId(query.reporterId);
    }

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }

    if (query.dueFrom || query.dueTo) {
      const range: Record<string, Date> = {};
      if (query.dueFrom) {
        range.$gte = query.dueFrom;
      }
      if (query.dueTo) {
        range.$lte = query.dueTo;
      }
      filter.dueDate = range;
    }

    if (query.search) {
      Object.assign(filter, await this.buildSearchFilter(workspaceId, query.search));
    }

    return filter;
  }

  /**
   * Search across title, description and label names (PRD §10).
   *
   * A regex is used rather than the `$text` index because the UI expects
   * substring matching as the user types ("api" should match "rapid"), which
   * `$text` — being word-and-stem based — does not do. Input is escaped before
   * it reaches the pattern.
   *
   * Labels are stored as ids, so matching label names means resolving them to
   * ids first and OR-ing that into the query.
   */
  private async buildSearchFilter(
    workspaceId: Types.ObjectId,
    search: string,
  ): Promise<FilterQuery<Task>> {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    const labelIds = await this.labelsService.findIdsByName(workspaceId, search);

    const clauses: FilterQuery<Task>[] = [{ title: pattern }, { description: pattern }];

    if (labelIds.length > 0) {
      clauses.push({ labelIds: { $in: labelIds } });
    }

    return { $or: clauses };
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async create(auth: AuthContext, dto: CreateTaskDto): Promise<TaskDto> {
    const workspaceId = auth.workspace._id;

    // Every referenced id is validated against this workspace before use, so a
    // client cannot attach a label or assignee belonging to someone else.
    const [memberIds, labelIds, projectId] = await Promise.all([
      this.usersService.assertMembersInWorkspace(workspaceId, dto.memberIds ?? []),
      this.labelsService.assertLabelsExist(workspaceId, dto.labelIds ?? []),
      dto.projectId
        ? this.projectsService.assertProjectExists(workspaceId, dto.projectId)
        : Promise.resolve(null),
    ]);

    const status = dto.status ?? TaskStatus.TODO;

    const task = await this.taskModel.create({
      workspaceId,
      // Reporter is always the authenticated user — never taken from the body.
      reporterId: auth.user._id,
      projectId,
      title: dto.title,
      description: dto.description ?? null,
      status,
      priority: dto.priority ?? Priority.NONE,
      memberIds,
      labelIds,
      teams: dto.teams ?? [],
      dueDate: dto.dueDate ?? null,
      resources: dto.resources ?? [],
      completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
    });

    await this.activityService.record([
      {
        taskId: task._id,
        workspaceId,
        actorId: auth.user._id,
        type: ActivityType.TASK_CREATED,
        metadata: { title: task.title },
      },
    ]);

    await task.populate([...TASK_POPULATE]);
    return serialiseTask(task, { subtaskCount: 0, commentCount: 0 });
  }

  async update(auth: AuthContext, taskId: string, dto: UpdateTaskDto): Promise<TaskDto> {
    const workspaceId = auth.workspace._id;
    const task = await this.requireTask(workspaceId, taskId);

    // Capture state before mutating so the activity diff has something to
    // compare against.
    const before = snapshotTask(task);

    if (dto.title !== undefined) {
      task.title = dto.title;
    }

    if (dto.description !== undefined) {
      task.description = dto.description === '' ? null : dto.description;
    }

    if (dto.priority !== undefined) {
      task.priority = dto.priority;
    }

    if (dto.teams !== undefined) {
      task.teams = dto.teams;
    }

    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate;
    }

    if (dto.resources !== undefined) {
      task.resources = dto.resources;
    }

    if (dto.status !== undefined) {
      this.applyStatus(task, dto.status);
    }

    if (dto.memberIds !== undefined) {
      task.memberIds = await this.usersService.assertMembersInWorkspace(workspaceId, dto.memberIds);
    }

    if (dto.labelIds !== undefined) {
      task.labelIds = await this.labelsService.assertLabelsExist(workspaceId, dto.labelIds);
    }

    if (dto.projectId !== undefined) {
      task.projectId = dto.projectId
        ? await this.projectsService.assertProjectExists(workspaceId, dto.projectId)
        : null;
    }

    await task.save();

    const events = diffTaskSnapshots(before, snapshotTask(task), {
      taskId: task._id,
      workspaceId,
      actorId: auth.user._id,
    });
    await this.activityService.record(events);

    await task.populate([...TASK_POPULATE]);
    const counts = await this.countChildren([task._id]);

    return serialiseTask(task, counts.get(task._id.toString()));
  }

  /**
   * Applies a status change, maintaining `completedAt`.
   *
   * The timestamp is set when a task first reaches COMPLETED and cleared if it
   * moves back out, so "when was this finished?" always has a truthful answer.
   */
  private applyStatus(task: TaskDocument, status: TaskStatus): void {
    if (task.status === status) {
      return;
    }

    task.status = status;

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }
  }

  /**
   * Deletes a task and everything hanging off it.
   *
   * Subtasks, comments and activity are meaningless without their parent, so
   * they are removed rather than orphaned — unlike a project's tasks, which
   * carry independent value and are merely detached.
   */
  async remove(auth: AuthContext, taskId: string): Promise<void> {
    const task = await this.requireTask(auth.workspace._id, taskId);

    await Promise.all([
      this.subtaskModel.deleteMany({ taskId: task._id }).exec(),
      this.commentModel.deleteMany({ taskId: task._id }).exec(),
      this.activityService.deleteForTask(task._id),
    ]);

    await this.taskModel.deleteOne({ _id: task._id }).exec();
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  /**
   * Loads a task scoped to the workspace.
   *
   * The workspace is part of the query, not a follow-up `if`, so a task from
   * another workspace is simply not found. Responding 404 rather than 403 also
   * avoids confirming that the id exists at all.
   */
  async requireTask(
    workspaceId: Types.ObjectId,
    taskId: string,
    populate = false,
  ): Promise<TaskDocument> {
    const query = this.taskModel.findOne({ _id: taskId, workspaceId });

    if (populate) {
      query.populate([...TASK_POPULATE]);
    }

    const task = await query.exec();

    if (!task) {
      throw AppException.notFound('Task');
    }

    return task;
  }

  /**
   * Counts subtasks and comments for many tasks in two aggregations.
   *
   * Two round-trips regardless of page size — the alternative (a count per
   * task) is the N+1 pattern the PRD warns against.
   */
  private async countChildren(taskIds: Types.ObjectId[]): Promise<Map<string, TaskCounts>> {
    const counts = new Map<string, TaskCounts>();

    if (taskIds.length === 0) {
      return counts;
    }

    const group: PipelineStage[] = [
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } },
    ];

    const [subtaskRows, commentRows] = await Promise.all([
      this.subtaskModel.aggregate<{ _id: Types.ObjectId; count: number }>(group).exec(),
      this.commentModel.aggregate<{ _id: Types.ObjectId; count: number }>(group).exec(),
    ]);

    for (const id of taskIds) {
      counts.set(id.toString(), { subtaskCount: 0, commentCount: 0 });
    }

    for (const row of subtaskRows) {
      const entry = counts.get(row._id.toString());
      if (entry) {
        entry.subtaskCount = row.count;
      }
    }

    for (const row of commentRows) {
      const entry = counts.get(row._id.toString());
      if (entry) {
        entry.commentCount = row.count;
      }
    }

    return counts;
  }

  private async toPaginatedResult(
    tasks: TaskDocument[],
    page: number,
    limit: number,
    total: number,
  ): Promise<PaginatedResult<TaskDto>> {
    const counts = await this.countChildren(tasks.map((task) => task._id));

    return new PaginatedResult(
      tasks.map((task) => serialiseTask(task, counts.get(task._id.toString()))),
      buildPaginationMeta(page, limit, total),
    );
  }
}
