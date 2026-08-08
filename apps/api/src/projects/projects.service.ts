import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ProjectDto, SortOrder } from '@ablespace/shared';
import { Project, ProjectDocument } from './schemas/project.schema';
import { Task } from '../tasks/schemas/task.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UsersService } from '../users/users.service';
import { AppException } from '../common/exceptions/app.exception';
import { serialiseProject } from '../common/serializers/entity.serializer';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';
import { buildPaginationMeta, skipFor } from '../common/dto/pagination.dto';
import { escapeRegex } from '../common/utils/regex.util';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    workspaceId: Types.ObjectId,
    query: QueryProjectsDto,
  ): Promise<PaginatedResult<ProjectDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    // Every filter is layered on top of the workspace scope, never replacing it.
    const filter: FilterQuery<Project> = { workspaceId };

    if (query.search) {
      filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    const sortDirection = query.order === SortOrder.ASC ? 1 : -1;

    const [projects, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('leadId')
        .sort({ createdAt: sortDirection })
        .skip(skipFor(page, limit))
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    const counts = await this.countTasksByProject(
      workspaceId,
      projects.map((project) => project._id),
    );

    return new PaginatedResult(
      projects.map((project) => serialiseProject(project, counts.get(project._id.toString()) ?? 0)),
      buildPaginationMeta(page, limit, total),
    );
  }

  async findOne(workspaceId: Types.ObjectId, projectId: string): Promise<ProjectDto> {
    const project = await this.requireProject(workspaceId, projectId, true);
    const taskCount = await this.taskModel
      .countDocuments({ workspaceId, projectId: project._id })
      .exec();

    return serialiseProject(project, taskCount);
  }

  async create(workspaceId: Types.ObjectId, dto: CreateProjectDto): Promise<ProjectDto> {
    const leadId = await this.resolveLead(workspaceId, dto.leadId);

    const project = await this.projectModel.create({
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      priority: dto.priority,
      leadId,
      dueDate: dto.dueDate ?? null,
    });

    await project.populate('leadId');
    return serialiseProject(project, 0);
  }

  async update(
    workspaceId: Types.ObjectId,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const project = await this.requireProject(workspaceId, projectId);

    if (dto.name !== undefined) {
      project.name = dto.name;
    }

    if (dto.description !== undefined) {
      project.description = dto.description === '' ? null : dto.description;
    }

    if (dto.priority !== undefined) {
      project.priority = dto.priority;
    }

    if (dto.dueDate !== undefined) {
      project.dueDate = dto.dueDate;
    }

    if (dto.leadId !== undefined) {
      project.leadId = await this.resolveLead(workspaceId, dto.leadId);
    }

    await project.save();
    await project.populate('leadId');

    const taskCount = await this.taskModel
      .countDocuments({ workspaceId, projectId: project._id })
      .exec();

    return serialiseProject(project, taskCount);
  }

  /**
   * Deletes a project.
   *
   * Tasks are detached rather than deleted: losing a project should not
   * silently destroy the work tracked inside it. They become unassigned tasks,
   * which is recoverable; cascading deletion is not.
   */
  async remove(workspaceId: Types.ObjectId, projectId: string): Promise<void> {
    const project = await this.requireProject(workspaceId, projectId);

    await this.taskModel
      .updateMany({ workspaceId, projectId: project._id }, { $set: { projectId: null } })
      .exec();

    await this.projectModel.deleteOne({ _id: project._id }).exec();
  }

  /** Loads a project scoped to the workspace, 404-ing if it is not there. */
  private async requireProject(
    workspaceId: Types.ObjectId,
    projectId: string,
    populate = false,
  ): Promise<ProjectDocument> {
    const query = this.projectModel.findOne({ _id: projectId, workspaceId });

    if (populate) {
      query.populate('leadId');
    }

    const project = await query.exec();

    if (!project) {
      throw AppException.notFound('Project');
    }

    return project;
  }

  /** Validates that a project lead is a member of the workspace. */
  private async resolveLead(
    workspaceId: Types.ObjectId,
    leadId: string | null | undefined,
  ): Promise<Types.ObjectId | null> {
    if (!leadId) {
      return null;
    }

    const [resolved] = await this.usersService.assertMembersInWorkspace(workspaceId, [leadId]);

    return resolved ?? null;
  }

  /**
   * Counts tasks per project in a single aggregation.
   *
   * Deliberately not one count query per project — that is the N+1 pattern the
   * PRD calls out (§23).
   */
  private async countTasksByProject(
    workspaceId: Types.ObjectId,
    projectIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const rows = await this.taskModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { workspaceId, projectId: { $in: projectIds } } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  /** Confirms a project id belongs to this workspace, used when creating tasks. */
  async assertProjectExists(
    workspaceId: Types.ObjectId,
    projectId: string,
  ): Promise<Types.ObjectId> {
    const project = await this.projectModel
      .findOne({ _id: projectId, workspaceId })
      .select('_id')
      .exec();

    if (!project) {
      throw AppException.badRequest('The selected project does not exist');
    }

    return project._id;
  }
}
