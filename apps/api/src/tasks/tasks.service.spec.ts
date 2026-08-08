import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Priority, TaskStatus } from '@ablespace/shared';
import { TasksService } from './tasks.service';
import { Task } from './schemas/task.schema';
import { Subtask } from '../subtasks/schemas/subtask.schema';
import { Comment } from '../comments/schemas/comment.schema';
import { UsersService } from '../users/users.service';
import { LabelsService } from '../labels/labels.service';
import { ProjectsService } from '../projects/projects.service';
import { ActivityService } from '../activity/activity.service';
import { AuthContext } from '../common/types/request-context';
import { UserDocument } from '../users/schemas/user.schema';
import { WorkspaceDocument } from '../workspaces/schemas/workspace.schema';
import { WorkspaceRole } from '@ablespace/shared';

/**
 * These tests cover the two things most worth protecting in this service:
 * that every query is scoped to the caller's workspace, and that ownership
 * fields come from the session rather than the request body.
 *
 * The Mongoose models are mocked so the assertions are about the queries the
 * service builds, which is exactly what the security properties depend on.
 */
describe('TasksService', () => {
  const workspaceId = new Types.ObjectId();
  const otherWorkspaceId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  const auth = {
    firebaseUid: 'uid-123',
    user: { _id: userId, displayName: 'Demo' } as UserDocument,
    workspace: { _id: workspaceId, name: 'Demo Workspace' } as WorkspaceDocument,
    role: WorkspaceRole.OWNER,
  } as AuthContext;

  /** Chainable query stub mimicking the fluent Mongoose builder. */
  function queryStub(result: unknown) {
    const stub: Record<string, jest.Mock> = {};
    for (const method of ['populate', 'sort', 'skip', 'limit', 'select']) {
      stub[method] = jest.fn(() => stub);
    }
    stub.exec = jest.fn(async () => result);
    return stub;
  }

  let service: TasksService;
  let taskModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    countDocuments: jest.Mock;
    deleteOne: jest.Mock;
    aggregate: jest.Mock;
  };

  beforeEach(async () => {
    taskModel = {
      find: jest.fn(() => queryStub([])),
      findOne: jest.fn(() => queryStub(null)),
      create: jest.fn(),
      countDocuments: jest.fn(() => queryStub(0)),
      deleteOne: jest.fn(() => queryStub({ deletedCount: 1 })),
      aggregate: jest.fn(() => queryStub([])),
    };

    const childModel = {
      aggregate: jest.fn(() => queryStub([])),
      deleteMany: jest.fn(() => queryStub({ deletedCount: 0 })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(Subtask.name), useValue: childModel },
        { provide: getModelToken(Comment.name), useValue: childModel },
        {
          provide: UsersService,
          useValue: { assertMembersInWorkspace: jest.fn(async () => []) },
        },
        {
          provide: LabelsService,
          useValue: {
            assertLabelsExist: jest.fn(async () => []),
            findIdsByName: jest.fn(async () => []),
          },
        },
        { provide: ProjectsService, useValue: { assertProjectExists: jest.fn() } },
        {
          provide: ActivityService,
          useValue: { record: jest.fn(), deleteForTask: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  describe('workspace scoping', () => {
    it('scopes every list query to the caller workspace', async () => {
      await service.findAll(workspaceId, {});

      const filter = taskModel.find.mock.calls[0][0];
      expect(filter.workspaceId).toBe(workspaceId);
    });

    it('keeps the workspace scope when filters are applied', async () => {
      await service.findAll(workspaceId, {
        status: [TaskStatus.TODO],
        priority: [Priority.HIGH],
      });

      const filter = taskModel.find.mock.calls[0][0];
      expect(filter.workspaceId).toBe(workspaceId);
      expect(filter.status).toEqual({ $in: [TaskStatus.TODO] });
      expect(filter.priority).toEqual({ $in: [Priority.HIGH] });
    });

    it('includes the workspace in single-task lookups', async () => {
      const taskId = new Types.ObjectId().toString();

      await expect(service.findOne(workspaceId, taskId)).rejects.toThrow('Task not found');

      expect(taskModel.findOne).toHaveBeenCalledWith({ _id: taskId, workspaceId });
    });

    it('reports a task from another workspace as not found', async () => {
      // The workspace is part of the query, so a foreign task simply does not
      // match — and 404 avoids confirming that the id exists at all.
      const foreignTaskId = new Types.ObjectId().toString();
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(service.findOne(otherWorkspaceId, foreignTaskId)).rejects.toThrow(
        'Task not found',
      );
    });
  });

  describe('create', () => {
    it('sets the reporter from the session, not the request', async () => {
      taskModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        populate: jest.fn(async () => undefined),
        workspaceId,
        reporterId: userId,
        title: 'New task',
        description: null,
        status: TaskStatus.TODO,
        priority: Priority.NONE,
        memberIds: [],
        labelIds: [],
        teams: [],
        dueDate: null,
        resources: [],
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(auth, { title: 'New task' });

      const payload = taskModel.create.mock.calls[0][0];
      expect(payload.reporterId).toBe(userId);
      expect(payload.workspaceId).toBe(workspaceId);
    });

    it('stamps completedAt when a task is created already completed', async () => {
      taskModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        populate: jest.fn(async () => undefined),
        workspaceId,
        reporterId: userId,
        title: 'Done already',
        description: null,
        status: TaskStatus.COMPLETED,
        priority: Priority.NONE,
        memberIds: [],
        labelIds: [],
        teams: [],
        dueDate: null,
        resources: [],
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(auth, { title: 'Done already', status: TaskStatus.COMPLETED });

      expect(taskModel.create.mock.calls[0][0].completedAt).toBeInstanceOf(Date);
    });
  });

  describe('search', () => {
    it('matches title, description and labels', async () => {
      await service.findAll(workspaceId, { search: 'landing' });

      const filter = taskModel.find.mock.calls[0][0];
      expect(filter.workspaceId).toBe(workspaceId);
      expect(filter.$or).toEqual(
        expect.arrayContaining([
          { title: { $regex: 'landing', $options: 'i' } },
          { description: { $regex: 'landing', $options: 'i' } },
        ]),
      );
    });

    it('escapes regex metacharacters in the search term', async () => {
      await service.findAll(workspaceId, { search: '.*' });

      const filter = taskModel.find.mock.calls[0][0];
      expect(filter.$or[0].title.$regex).toBe('\\.\\*');
    });
  });

  describe('date filtering', () => {
    it('builds an inclusive range from dueFrom and dueTo', async () => {
      const dueFrom = new Date('2026-01-01T00:00:00.000Z');
      const dueTo = new Date('2026-01-31T00:00:00.000Z');

      await service.findAll(workspaceId, { dueFrom, dueTo });

      expect(taskModel.find.mock.calls[0][0].dueDate).toEqual({
        $gte: dueFrom,
        $lte: dueTo,
      });
    });
  });
});
