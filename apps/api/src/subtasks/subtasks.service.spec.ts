import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ActivityType, Priority, TaskStatus } from '@ablespace/shared';
import { SubtasksService } from './subtasks.service';
import { Subtask } from './schemas/subtask.schema';
import { Task } from '../tasks/schemas/task.schema';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../activity/activity.service';
import {
  authContextFor,
  documentStub,
  ModelStub,
  modelStub,
  queryStub,
} from '../../test/mongoose-mocks';

describe('SubtasksService', () => {
  const workspaceId = new Types.ObjectId();
  const otherWorkspaceId = new Types.ObjectId();
  const auth = authContextFor(workspaceId);
  const userId = auth.user._id;
  const taskId = new Types.ObjectId();

  let service: SubtasksService;
  let subtaskModel: ModelStub;
  let taskModel: ModelStub;
  let activityService: { record: jest.Mock };

  function subtask(overrides: Record<string, unknown> = {}) {
    return documentStub({
      taskId,
      workspaceId,
      title: 'Verify ID tokens',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      memberId: null,
      dueDate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  }

  beforeEach(async () => {
    subtaskModel = modelStub();
    taskModel = modelStub();
    activityService = { record: jest.fn() };

    // The parent task exists in this workspace unless a test says otherwise.
    taskModel.findOne.mockReturnValue(queryStub({ _id: taskId }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubtasksService,
        { provide: getModelToken(Subtask.name), useValue: subtaskModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        {
          provide: UsersService,
          useValue: { assertMembersInWorkspace: jest.fn(async () => [userId]) },
        },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = moduleRef.get(SubtasksService);
  });

  describe('read', () => {
    it('verifies the parent task before listing children', async () => {
      await service.findForTask(workspaceId, taskId.toString());

      // Resolving the task is the authorization check for its subtasks.
      expect(taskModel.findOne).toHaveBeenCalledWith({
        _id: taskId.toString(),
        workspaceId,
      });
      expect(subtaskModel.find).toHaveBeenCalledWith({ taskId: taskId.toString(), workspaceId });
    });

    it('refuses to list subtasks of a task in another workspace', async () => {
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(service.findForTask(otherWorkspaceId, taskId.toString())).rejects.toThrow(
        'Task not found',
      );
      expect(subtaskModel.find).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    beforeEach(() => {
      subtaskModel.create.mockResolvedValue(subtask());
    });

    it('denormalises the workspace from the parent task', async () => {
      await service.create(auth, taskId.toString(), { title: 'S' });

      // Stored on the child so later authorization is one indexed query.
      expect(subtaskModel.create.mock.calls[0][0].workspaceId).toBe(workspaceId);
    });

    it('appends to the end of the list when no order is given', async () => {
      subtaskModel.findOne.mockReturnValue(queryStub({ order: 4 }));

      await service.create(auth, taskId.toString(), { title: 'S' });

      expect(subtaskModel.create.mock.calls[0][0].order).toBe(5);
    });

    it('starts at zero for the first subtask', async () => {
      subtaskModel.findOne.mockReturnValue(queryStub(null));

      await service.create(auth, taskId.toString(), { title: 'S' });

      expect(subtaskModel.create.mock.calls[0][0].order).toBe(0);
    });

    it('records a SUBTASK_ADDED activity', async () => {
      await service.create(auth, taskId.toString(), { title: 'S' });

      expect(activityService.record).toHaveBeenCalledWith([
        expect.objectContaining({ type: ActivityType.SUBTASK_ADDED, actorId: userId }),
      ]);
    });

    it('refuses to add a subtask to a task in another workspace', async () => {
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.create(authContextFor(otherWorkspaceId), taskId.toString(), { title: 'S' }),
      ).rejects.toThrow('Task not found');
      expect(subtaskModel.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('persists changed fields', async () => {
      const existing = subtask();
      subtaskModel.findOne.mockReturnValue(queryStub(existing));

      await service.update(auth, existing._id.toString(), {
        title: 'Renamed',
        priority: Priority.URGENT,
      });

      expect(existing.title).toBe('Renamed');
      expect(existing.priority).toBe(Priority.URGENT);
      expect(existing.save).toHaveBeenCalled();
    });

    it('records activity when the status changes', async () => {
      const existing = subtask({ status: TaskStatus.TODO });
      subtaskModel.findOne.mockReturnValue(queryStub(existing));

      await service.update(auth, existing._id.toString(), { status: TaskStatus.COMPLETED });

      expect(activityService.record).toHaveBeenCalledWith([
        expect.objectContaining({
          type: ActivityType.STATUS_CHANGED,
          metadata: expect.objectContaining({ from: TaskStatus.TODO, to: TaskStatus.COMPLETED }),
        }),
      ]);
    });

    it('records nothing when the status is unchanged', async () => {
      // Renaming a subtask is noise on the parent task's timeline.
      const existing = subtask({ status: TaskStatus.TODO });
      subtaskModel.findOne.mockReturnValue(queryStub(existing));

      await service.update(auth, existing._id.toString(), { title: 'Renamed' });

      expect(activityService.record).not.toHaveBeenCalled();
    });

    it('refuses to update a subtask in another workspace', async () => {
      subtaskModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.update(authContextFor(otherWorkspaceId), new Types.ObjectId().toString(), {
          title: 'X',
        }),
      ).rejects.toThrow('Subtask not found');
    });
  });

  describe('delete', () => {
    it('deletes a subtask in the caller workspace', async () => {
      const existing = subtask();
      subtaskModel.findOne.mockReturnValue(queryStub(existing));

      await service.remove(auth, existing._id.toString());

      expect(subtaskModel.deleteOne).toHaveBeenCalledWith({ _id: existing._id });
    });

    it('records no activity, since no event type represents it', async () => {
      const existing = subtask();
      subtaskModel.findOne.mockReturnValue(queryStub(existing));

      await service.remove(auth, existing._id.toString());

      expect(activityService.record).not.toHaveBeenCalled();
    });

    it('refuses to delete a subtask in another workspace', async () => {
      subtaskModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.remove(authContextFor(otherWorkspaceId), new Types.ObjectId().toString()),
      ).rejects.toThrow('Subtask not found');
      expect(subtaskModel.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('scopes every subtask lookup by workspace', async () => {
      const id = new Types.ObjectId().toString();

      await service.update(auth, id, { title: 'X' }).catch(() => undefined);
      await service.remove(auth, id).catch(() => undefined);

      for (const call of subtaskModel.findOne.mock.calls) {
        expect(call[0]).toHaveProperty('workspaceId');
      }
    });
  });
});
