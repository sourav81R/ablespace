import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ActivityType } from '@ablespace/shared';
import { CommentsService } from './comments.service';
import { Comment } from './schemas/comment.schema';
import { Task } from '../tasks/schemas/task.schema';
import { ActivityService } from '../activity/activity.service';
import {
  authContextFor,
  documentStub,
  ModelStub,
  modelStub,
  queryStub,
} from '../../test/mongoose-mocks';

describe('CommentsService', () => {
  const workspaceId = new Types.ObjectId();
  const otherWorkspaceId = new Types.ObjectId();
  const auth = authContextFor(workspaceId);
  const userId = auth.user._id;
  const taskId = new Types.ObjectId();

  let service: CommentsService;
  let commentModel: ModelStub;
  let taskModel: ModelStub;
  let activityService: { record: jest.Mock };

  /** `authorId` carries an `equals` method, as a real ObjectId does. */
  function comment(authorId: Types.ObjectId = userId) {
    return documentStub({
      taskId,
      workspaceId,
      authorId,
      body: 'Looks good to me.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  beforeEach(async () => {
    commentModel = modelStub();
    taskModel = modelStub();
    activityService = { record: jest.fn() };

    taskModel.findOne.mockReturnValue(queryStub({ _id: taskId }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken(Comment.name), useValue: commentModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = moduleRef.get(CommentsService);
  });

  describe('read', () => {
    it('verifies the parent task before listing comments', async () => {
      await service.findForTask(workspaceId, taskId.toString(), 1, 25);

      expect(taskModel.findOne).toHaveBeenCalledWith({
        _id: taskId.toString(),
        workspaceId,
      });
    });

    it('scopes the query to the task and workspace', async () => {
      await service.findForTask(workspaceId, taskId.toString(), 1, 25);

      expect(commentModel.find.mock.calls[0][0]).toMatchObject({ workspaceId });
    });

    it('returns newest first', async () => {
      const query = queryStub([]);
      commentModel.find.mockReturnValue(query);

      await service.findForTask(workspaceId, taskId.toString(), 1, 25);

      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('pages in the database rather than in memory', async () => {
      const query = queryStub([]);
      commentModel.find.mockReturnValue(query);

      await service.findForTask(workspaceId, taskId.toString(), 3, 10);

      expect(query.skip).toHaveBeenCalledWith(20);
      expect(query.limit).toHaveBeenCalledWith(10);
    });

    it('refuses to list comments on a task in another workspace', async () => {
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(service.findForTask(otherWorkspaceId, taskId.toString(), 1, 25)).rejects.toThrow(
        'Task not found',
      );
    });
  });

  describe('create', () => {
    beforeEach(() => {
      commentModel.create.mockResolvedValue(comment());
    });

    it('sets the author from the session, not the request', async () => {
      await service.create(auth, taskId.toString(), { body: 'Hello' });

      const payload = commentModel.create.mock.calls[0][0];
      expect(payload.authorId).toBe(userId);
      expect(payload.workspaceId).toBe(workspaceId);
    });

    it('records a COMMENT_ADDED activity', async () => {
      await service.create(auth, taskId.toString(), { body: 'Hello' });

      expect(activityService.record).toHaveBeenCalledWith([
        expect.objectContaining({ type: ActivityType.COMMENT_ADDED, actorId: userId }),
      ]);
    });

    it('refuses to comment on a task in another workspace', async () => {
      taskModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.create(authContextFor(otherWorkspaceId), taskId.toString(), { body: 'Hi' }),
      ).rejects.toThrow('Task not found');
      expect(commentModel.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the caller own comment', async () => {
      const own = comment(userId);
      commentModel.findOne.mockReturnValue(queryStub(own));

      await service.remove(auth, own._id.toString());

      expect(commentModel.deleteOne).toHaveBeenCalledWith({ _id: own._id });
    });

    it('refuses to delete another member comment', async () => {
      // Being in the workspace is not enough to delete someone else's words.
      const someoneElse = comment(new Types.ObjectId());
      commentModel.findOne.mockReturnValue(queryStub(someoneElse));

      await expect(service.remove(auth, someoneElse._id.toString())).rejects.toThrow(
        'only delete your own comments',
      );
      expect(commentModel.deleteOne).not.toHaveBeenCalled();
    });

    it('refuses to delete a comment in another workspace', async () => {
      commentModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.remove(authContextFor(otherWorkspaceId), new Types.ObjectId().toString()),
      ).rejects.toThrow('Comment not found');
    });

    it('scopes the lookup by workspace', async () => {
      const id = new Types.ObjectId().toString();

      await service.remove(auth, id).catch(() => undefined);

      expect(commentModel.findOne.mock.calls[0][0]).toHaveProperty('workspaceId');
    });
  });
});
