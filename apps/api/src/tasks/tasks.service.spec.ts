import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ActivityType, Priority, TaskStatus } from '@ablespace/shared';
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

  /**
   * A saveable task document, as `findOne` returns.
   *
   * Carries real timestamps because the service serialises the result, and
   * `save`/`populate` resolve to the document so the service can keep using it.
   */
  function updatableTask(overrides: Record<string, unknown> = {}) {
    const doc = {
      _id: new Types.ObjectId(),
      workspaceId,
      projectId: null,
      title: 'Original',
      description: null,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      reporterId: userId,
      memberIds: [],
      labelIds: [],
      teamIds: [],
      dueDate: null,
      resources: [],
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(),
      populate: jest.fn(),
      ...overrides,
    };
    doc.save.mockResolvedValue(doc);
    doc.populate.mockResolvedValue(doc);
    return doc;
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
  let labelsService: { assertLabelsExist: jest.Mock; findIdsByName: jest.Mock };
  let activityService: { record: jest.Mock; deleteForTask: jest.Mock };
  let usersService: { assertMembersInWorkspace: jest.Mock };
  let subtaskModel: { aggregate: jest.Mock; deleteMany: jest.Mock };
  let commentModel: { aggregate: jest.Mock; deleteMany: jest.Mock };

  beforeEach(async () => {
    taskModel = {
      find: jest.fn(() => queryStub([])),
      findOne: jest.fn(() => queryStub(null)),
      create: jest.fn(),
      countDocuments: jest.fn(() => queryStub(0)),
      deleteOne: jest.fn(() => queryStub({ deletedCount: 1 })),
      aggregate: jest.fn(() => queryStub([])),
    };

    // Separate stubs so a deleteMany assertion can tell the two apart.
    subtaskModel = {
      aggregate: jest.fn(() => queryStub([])),
      deleteMany: jest.fn(() => queryStub({ deletedCount: 0 })),
    };
    commentModel = {
      aggregate: jest.fn(() => queryStub([])),
      deleteMany: jest.fn(() => queryStub({ deletedCount: 0 })),
    };

    labelsService = {
      assertLabelsExist: jest.fn(async () => []),
      findIdsByName: jest.fn(async () => []),
    };

    activityService = { record: jest.fn(), deleteForTask: jest.fn() };
    usersService = { assertMembersInWorkspace: jest.fn(async () => []) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(Subtask.name), useValue: subtaskModel },
        { provide: getModelToken(Comment.name), useValue: commentModel },
        { provide: UsersService, useValue: usersService },
        { provide: LabelsService, useValue: labelsService },
        { provide: ProjectsService, useValue: { assertProjectExists: jest.fn() } },
        { provide: ActivityService, useValue: activityService },
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
        teamIds: [],
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
        teamIds: [],
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

    it('includes a label clause when the term matches a label name', async () => {
      // Labels are stored as ids, so a name search resolves to ids first and
      // ORs them into the same query rather than post-filtering.
      const labelId = new Types.ObjectId();
      labelsService.findIdsByName.mockResolvedValue([labelId]);

      await service.findAll(workspaceId, { search: 'Design' });

      const filter = taskModel.find.mock.calls[0][0];
      expect(filter.$or).toEqual(expect.arrayContaining([{ labelIds: { $in: [labelId] } }]));
    });

    it('resolves search entirely in the database query', async () => {
      // The whole result set must never be pulled into memory to be filtered:
      // the search term belongs in the query, and paging is applied by Mongo.
      await service.findAll(workspaceId, { search: 'landing', page: 2, limit: 10 });

      const query = taskModel.find.mock.results[0].value;
      expect(query.skip).toHaveBeenCalledWith(10);
      expect(query.limit).toHaveBeenCalledWith(10);

      // The count is a database count, not `results.length`.
      expect(taskModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId }),
      );
    });
  });

  describe('update', () => {
    it('persists changed fields', async () => {
      const task = updatableTask();
      taskModel.findOne.mockReturnValue(queryStub(task));

      await service.update(auth, task._id.toString(), { title: 'Renamed' });

      expect(task.title).toBe('Renamed');
      expect(task.save).toHaveBeenCalled();
    });

    it('stamps completedAt when a task becomes completed', async () => {
      const task = updatableTask({ status: TaskStatus.DOING });
      taskModel.findOne.mockReturnValue(queryStub(task));

      await service.update(auth, task._id.toString(), { status: TaskStatus.COMPLETED });

      expect(task.completedAt).toBeInstanceOf(Date);
    });

    it('clears completedAt when a task moves back out of completed', async () => {
      // "When was this finished?" must always have a truthful answer.
      const task = updatableTask({ status: TaskStatus.COMPLETED, completedAt: new Date() });
      taskModel.findOne.mockReturnValue(queryStub(task));

      await service.update(auth, task._id.toString(), { status: TaskStatus.DOING });

      expect(task.completedAt).toBeNull();
    });

    it('validates members against the workspace before assigning them', async () => {
      const task = updatableTask();
      taskModel.findOne.mockReturnValue(queryStub(task));
      const memberId = new Types.ObjectId().toString();

      await service.update(auth, task._id.toString(), { memberIds: [memberId] });

      expect(usersService.assertMembersInWorkspace).toHaveBeenCalledWith(workspaceId, [memberId]);
    });

    it('refuses to update a task in another workspace', async () => {
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.update(auth, new Types.ObjectId().toString(), { title: 'X' }),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('delete', () => {
    it('removes the task and everything hanging off it', async () => {
      // Subtasks, comments and history are meaningless without their parent.
      const task = { _id: new Types.ObjectId(), workspaceId };
      taskModel.findOne.mockReturnValue(queryStub(task));

      await service.remove(auth, task._id.toString());

      expect(subtaskModel.deleteMany).toHaveBeenCalledWith({ taskId: task._id });
      expect(commentModel.deleteMany).toHaveBeenCalledWith({ taskId: task._id });
      expect(activityService.deleteForTask).toHaveBeenCalledWith(task._id);
      expect(taskModel.deleteOne).toHaveBeenCalledWith({ _id: task._id });
    });

    it('refuses to delete a task in another workspace', async () => {
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(service.remove(auth, new Types.ObjectId().toString())).rejects.toThrow(
        'Task not found',
      );
      expect(taskModel.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('activity', () => {
    it('records TASK_CREATED on create', async () => {
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
        teamIds: [],
        dueDate: null,
        resources: [],
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(auth, { title: 'New task' });

      expect(activityService.record).toHaveBeenCalledWith([
        expect.objectContaining({ type: ActivityType.TASK_CREATED, actorId: userId }),
      ]);
    });

    it('records a STATUS_CHANGED event with before and after values', async () => {
      const task = updatableTask({ status: TaskStatus.TODO });
      taskModel.findOne.mockReturnValue(queryStub(task));

      await service.update(auth, task._id.toString(), { status: TaskStatus.DOING });

      const events = activityService.record.mock.calls.at(-1)?.[0] as Array<{
        type: ActivityType;
        metadata?: { from?: unknown; to?: unknown };
      }>;
      const statusEvent = events.find((e) => e.type === ActivityType.STATUS_CHANGED);

      expect(statusEvent?.metadata).toMatchObject({
        from: TaskStatus.TODO,
        to: TaskStatus.DOING,
      });
    });

    it('records no events when an update changes nothing', async () => {
      const task = updatableTask({ title: 'Same' });
      taskModel.findOne.mockReturnValue(queryStub(task));

      await service.update(auth, task._id.toString(), { title: 'Same' });

      expect(activityService.record).toHaveBeenCalledWith([]);
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
