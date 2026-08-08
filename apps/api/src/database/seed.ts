/**
 * Seeds a demo workspace so a reviewer opening the deployed app sees a
 * populated board rather than an empty state.
 *
 * Usage:
 *   pnpm seed                       # seeds the workspace of the demo user
 *   pnpm seed -- --uid=<firebaseUid> # seeds a specific Firebase account
 *
 * Safe to re-run: it clears the target workspace's task data first, so
 * repeated runs converge on the same result rather than duplicating rows.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityType, AuthProvider, TaskStatus, WorkspaceRole } from '@ablespace/shared';
import { AppModule } from '../app.module';
import { User } from '../users/schemas/user.schema';
import { Workspace } from '../workspaces/schemas/workspace.schema';
import { WorkspaceMember } from '../workspaces/schemas/workspace-member.schema';
import { Label } from '../labels/schemas/label.schema';
import { Project } from '../projects/schemas/project.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Subtask } from '../subtasks/schemas/subtask.schema';
import { Comment } from '../comments/schemas/comment.schema';
import { Activity } from '../activity/schemas/activity.schema';
import {
  COMMENT_SEEDS,
  FEATURED_TASK_TITLE,
  LABEL_SEEDS,
  PROJECT_SEEDS,
  SUBTASK_SEEDS,
  TASK_SEEDS,
} from './seed-data';

const logger = new Logger('Seed');

/** Firebase UID of the demo account, overridable with --uid=. */
const DEFAULT_DEMO_UID = 'seed-demo-user';

/**
 * The instant every seeded date is measured from.
 *
 * Captured once per run and normalised to midday UTC, so two runs on the same
 * day produce byte-identical dates. Due dates stay relative to "now" rather
 * than being hard-coded, so a board seeded months from now still shows a
 * sensible mix of overdue and upcoming work.
 */
const SEED_EPOCH = (() => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0);
})();

/** A date `days` from the seed epoch. Midday UTC avoids timezone edge cases. */
function daysFromNow(days: number): Date {
  return new Date(SEED_EPOCH + days * 24 * 60 * 60 * 1000);
}

async function seed(): Promise<void> {
  const uidArg = process.argv.find((arg) => arg.startsWith('--uid='));
  const firebaseUid = uidArg ? uidArg.split('=')[1] : DEFAULT_DEMO_UID;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const workspaceModel = app.get<Model<Workspace>>(getModelToken(Workspace.name));
    const memberModel = app.get<Model<WorkspaceMember>>(getModelToken(WorkspaceMember.name));
    const labelModel = app.get<Model<Label>>(getModelToken(Label.name));
    const projectModel = app.get<Model<Project>>(getModelToken(Project.name));
    const taskModel = app.get<Model<Task>>(getModelToken(Task.name));
    const subtaskModel = app.get<Model<Subtask>>(getModelToken(Subtask.name));
    const commentModel = app.get<Model<Comment>>(getModelToken(Comment.name));
    const activityModel = app.get<Model<Activity>>(getModelToken(Activity.name));

    // ---------------------------------------------------------------------
    // User + workspace
    // ---------------------------------------------------------------------
    let user = await userModel.findOne({ firebaseUid }).exec();

    if (!user) {
      user = await userModel.create({
        firebaseUid,
        email: 'demo@ablespace.test',
        displayName: 'Demo User',
        avatarUrl: null,
        title: 'Product Designer',
        username: 'demo',
        isAnonymous: firebaseUid === DEFAULT_DEMO_UID,
        provider: AuthProvider.ANONYMOUS,
      });
      logger.log(`Created demo user (${firebaseUid})`);
    }

    let membership = await memberModel.findOne({ userId: user._id }).exec();
    let workspace = membership
      ? await workspaceModel.findById(membership.workspaceId).exec()
      : null;

    if (!workspace) {
      workspace = await workspaceModel.create({
        name: 'Demo Workspace',
        createdBy: user._id,
      });
      membership = await memberModel.create({
        workspaceId: workspace._id,
        userId: user._id,
        role: WorkspaceRole.OWNER,
      });
      logger.log(`Created workspace ${workspace._id.toString()}`);
    }

    const workspaceId = workspace._id;

    // ---------------------------------------------------------------------
    // Reset: clear previous seed data so re-running is idempotent.
    // ---------------------------------------------------------------------
    await Promise.all([
      taskModel.deleteMany({ workspaceId }).exec(),
      subtaskModel.deleteMany({ workspaceId }).exec(),
      commentModel.deleteMany({ workspaceId }).exec(),
      activityModel.deleteMany({ workspaceId }).exec(),
      projectModel.deleteMany({ workspaceId }).exec(),
      labelModel.deleteMany({ workspaceId }).exec(),
    ]);
    logger.log('Cleared previous workspace data');

    // ---------------------------------------------------------------------
    // Labels
    // ---------------------------------------------------------------------
    const labels = await labelModel.insertMany(
      LABEL_SEEDS.map((label) => ({ ...label, workspaceId })),
    );
    const labelBy = new Map(labels.map((label) => [label.name, label._id]));
    logger.log(`Created ${labels.length} labels`);

    // ---------------------------------------------------------------------
    // Projects
    // ---------------------------------------------------------------------
    const projects = await projectModel.insertMany(
      PROJECT_SEEDS.map((project) => ({
        workspaceId,
        name: project.name,
        description: project.description,
        priority: project.priority,
        leadId: user._id,
        dueDate: project.dueInDays === null ? null : daysFromNow(project.dueInDays),
      })),
    );
    const projectBy = new Map(projects.map((project) => [project.name, project._id]));
    logger.log(`Created ${projects.length} projects`);

    // ---------------------------------------------------------------------
    // Tasks — spread across all four board columns.
    // ---------------------------------------------------------------------
    const createdTasks = await taskModel.insertMany(
      TASK_SEEDS.map((seedTask) => ({
        workspaceId,
        projectId: projectBy.get(seedTask.project) ?? null,
        title: seedTask.title,
        description: seedTask.description,
        status: seedTask.status,
        priority: seedTask.priority,
        reporterId: user._id,
        memberIds: [user._id],
        labelIds: seedTask.labels
          .map((name) => labelBy.get(name))
          .filter((id): id is Types.ObjectId => Boolean(id)),
        teamIds: [],
        dueDate: seedTask.dueInDays === null ? null : daysFromNow(seedTask.dueInDays),
        resources: [],
        completedAt: seedTask.status === TaskStatus.COMPLETED ? daysFromNow(-2) : null,
      })),
    );
    logger.log(`Created ${createdTasks.length} tasks`);

    // ---------------------------------------------------------------------
    // Subtasks, comments and activity, so the task detail screen has something
    // real to show. Pinned to a named task rather than "the first DOING one",
    // so reordering the list above cannot silently move them elsewhere.
    // ---------------------------------------------------------------------
    const featured = createdTasks.find((task) => task.title === FEATURED_TASK_TITLE);

    if (featured) {
      await subtaskModel.insertMany(
        SUBTASK_SEEDS.map((subtask) => ({
          taskId: featured._id,
          workspaceId,
          title: subtask.title,
          status: subtask.status,
          priority: subtask.priority,
          memberId: subtask.assigned ? user._id : null,
          dueDate: daysFromNow(subtask.dueInDays),
          order: subtask.order,
        })),
      );

      await commentModel.insertMany(
        COMMENT_SEEDS.map((body) => ({
          taskId: featured._id,
          workspaceId,
          authorId: user._id,
          body,
        })),
      );
    }

    // Every task gets a creation event so the activity feed is never empty.
    await activityModel.insertMany(
      createdTasks.map((task) => ({
        taskId: task._id,
        workspaceId,
        actorId: user._id,
        type: ActivityType.TASK_CREATED,
        metadata: { title: task.title },
      })),
    );

    logger.log('Seed complete.');
    logger.log(`  workspace : ${workspaceId.toString()}`);
    logger.log(`  user      : ${user._id.toString()} (uid: ${firebaseUid})`);
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
    process.exit(1);
  });
