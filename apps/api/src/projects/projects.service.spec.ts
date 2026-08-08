import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Priority } from '@ablespace/shared';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';
import { Task } from '../tasks/schemas/task.schema';
import { UsersService } from '../users/users.service';
import {
  authContextFor,
  documentStub,
  ModelStub,
  modelStub,
  queryStub,
} from '../../test/mongoose-mocks';

describe('ProjectsService', () => {
  const workspaceId = new Types.ObjectId();
  const otherWorkspaceId = new Types.ObjectId();
  const auth = authContextFor(workspaceId);
  const userId = auth.user._id;

  let service: ProjectsService;
  let projectModel: ModelStub;
  let taskModel: ModelStub;
  let usersService: { assertMembersInWorkspace: jest.Mock };

  /** A project document as findOne would return it. */
  function project(overrides: Record<string, unknown> = {}) {
    return documentStub({
      workspaceId,
      name: 'Website Redesign',
      description: 'Refresh the marketing site.',
      priority: Priority.HIGH,
      leadId: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  }

  beforeEach(async () => {
    projectModel = modelStub();
    taskModel = modelStub();
    usersService = { assertMembersInWorkspace: jest.fn(async () => [userId]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  describe('read', () => {
    it('scopes the list to the caller workspace', async () => {
      await service.findAll(workspaceId, {});

      expect(projectModel.find.mock.calls[0][0]).toMatchObject({ workspaceId });
    });

    it('filters by priority on top of the workspace scope', async () => {
      await service.findAll(workspaceId, { priority: Priority.HIGH });

      const filter = projectModel.find.mock.calls[0][0];
      expect(filter.workspaceId).toBe(workspaceId);
      expect(filter.priority).toBe(Priority.HIGH);
    });

    it('escapes a search term before it becomes a regex', async () => {
      await service.findAll(workspaceId, { search: 'a.*b' });

      expect(projectModel.find.mock.calls[0][0].name.$regex).toBe('a\\.\\*b');
    });

    it('counts tasks per project in one aggregation, not one query each', async () => {
      const projects = [project(), project({ name: 'Mobile App' })];
      projectModel.find.mockReturnValue(queryStub(projects));

      await service.findAll(workspaceId, {});

      // The N+1 pattern would be one countDocuments call per project.
      expect(taskModel.aggregate).toHaveBeenCalledTimes(1);
    });

    it('includes the workspace when reading one project', async () => {
      const id = new Types.ObjectId().toString();

      await expect(service.findOne(workspaceId, id)).rejects.toThrow('Project not found');
      expect(projectModel.findOne).toHaveBeenCalledWith({ _id: id, workspaceId });
    });
  });

  describe('create', () => {
    it('takes the workspace from the session, not the request', async () => {
      projectModel.create.mockResolvedValue(project());

      await service.create(workspaceId, { name: 'New Project' });

      expect(projectModel.create.mock.calls[0][0].workspaceId).toBe(workspaceId);
    });

    it('validates the lead is a member of the workspace', async () => {
      projectModel.create.mockResolvedValue(project());
      const leadId = new Types.ObjectId().toString();

      await service.create(workspaceId, { name: 'P', leadId });

      expect(usersService.assertMembersInWorkspace).toHaveBeenCalledWith(workspaceId, [leadId]);
    });

    it('rejects a lead from another workspace', async () => {
      usersService.assertMembersInWorkspace.mockRejectedValue(new Error('not a member'));

      await expect(
        service.create(workspaceId, { name: 'P', leadId: new Types.ObjectId().toString() }),
      ).rejects.toThrow('not a member');
      expect(projectModel.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('persists changed fields', async () => {
      const existing = project();
      projectModel.findOne.mockReturnValue(queryStub(existing));

      await service.update(workspaceId, existing._id.toString(), {
        name: 'Renamed',
        priority: Priority.LOW,
      });

      expect(existing.name).toBe('Renamed');
      expect(existing.priority).toBe(Priority.LOW);
      expect(existing.save).toHaveBeenCalled();
    });

    it('clears a description set to an empty string', async () => {
      const existing = project();
      projectModel.findOne.mockReturnValue(queryStub(existing));

      await service.update(workspaceId, existing._id.toString(), { description: '' });

      expect(existing.description).toBeNull();
    });

    it('refuses to update a project in another workspace', async () => {
      projectModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.update(otherWorkspaceId, new Types.ObjectId().toString(), { name: 'X' }),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('delete', () => {
    it('detaches tasks rather than deleting them', async () => {
      // Losing a project must not silently destroy the work tracked inside it.
      const existing = project();
      projectModel.findOne.mockReturnValue(queryStub(existing));

      await service.remove(workspaceId, existing._id.toString());

      expect(taskModel.updateMany).toHaveBeenCalledWith(
        { workspaceId, projectId: existing._id },
        { $set: { projectId: null } },
      );
      expect(taskModel.deleteMany).not.toHaveBeenCalled();
      expect(projectModel.deleteOne).toHaveBeenCalledWith({ _id: existing._id });
    });

    it('refuses to delete a project in another workspace', async () => {
      projectModel.findOne.mockReturnValue(queryStub(null));

      await expect(
        service.remove(otherWorkspaceId, new Types.ObjectId().toString()),
      ).rejects.toThrow('Project not found');
      expect(projectModel.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('never reads a project without a workspace filter', async () => {
      const id = new Types.ObjectId().toString();

      await service.findOne(workspaceId, id).catch(() => undefined);
      await service.update(workspaceId, id, { name: 'X' }).catch(() => undefined);
      await service.remove(workspaceId, id).catch(() => undefined);

      for (const call of projectModel.findOne.mock.calls) {
        expect(call[0]).toHaveProperty('workspaceId');
      }
    });
  });
});
