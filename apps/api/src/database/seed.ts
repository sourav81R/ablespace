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
import { ActivityType, AuthProvider, Priority, TaskStatus, WorkspaceRole } from '@ablespace/shared';
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

const logger = new Logger('Seed');

/** Firebase UID of the demo account, overridable with --uid=. */
const DEFAULT_DEMO_UID = 'seed-demo-user';

/** Returns a date `days` from now, normalised to midday to avoid TZ edges. */
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
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
    const labels = await labelModel.insertMany([
      { workspaceId, name: 'Design', color: '#8B5CF6' },
      { workspaceId, name: 'Development', color: '#3B82F6' },
      { workspaceId, name: 'Research', color: '#F59E0B' },
      { workspaceId, name: 'Bug', color: '#EF4444' },
      { workspaceId, name: 'Documentation', color: '#10B981' },
    ]);
    const labelBy = new Map(labels.map((label) => [label.name, label._id]));
    logger.log(`Created ${labels.length} labels`);

    // ---------------------------------------------------------------------
    // Projects
    // ---------------------------------------------------------------------
    const projects = await projectModel.insertMany([
      {
        workspaceId,
        name: 'Website Redesign',
        description: 'Refresh the marketing site and design system.',
        priority: Priority.HIGH,
        leadId: user._id,
        dueDate: daysFromNow(21),
      },
      {
        workspaceId,
        name: 'Mobile App',
        description: 'Ship the first release of the companion app.',
        priority: Priority.MEDIUM,
        leadId: user._id,
        dueDate: daysFromNow(45),
      },
      {
        workspaceId,
        name: 'Internal Tools',
        description: 'Improve the team dashboard and reporting.',
        priority: Priority.LOW,
        leadId: user._id,
        dueDate: null,
      },
    ]);
    const projectBy = new Map(projects.map((project) => [project.name, project._id]));
    logger.log(`Created ${projects.length} projects`);

    // ---------------------------------------------------------------------
    // Tasks — spread across all four board columns.
    // ---------------------------------------------------------------------
    const taskSeeds: Array<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: Priority;
      project: string;
      labels: string[];
      dueInDays: number | null;
    }> = [
      {
        title: 'Design the new landing page',
        description: 'Hero, feature grid and pricing section for the refreshed site.',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        project: 'Website Redesign',
        labels: ['Design'],
        dueInDays: 5,
      },
      {
        title: 'Audit current colour tokens',
        description: 'List every colour in use and map it onto the new palette.',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        project: 'Website Redesign',
        labels: ['Design', 'Research'],
        dueInDays: 8,
      },
      {
        title: 'Set up authentication flow',
        description: 'Anonymous and Google sign-in, with token verification server-side.',
        status: TaskStatus.DOING,
        priority: Priority.URGENT,
        project: 'Mobile App',
        labels: ['Development'],
        dueInDays: 2,
      },
      {
        title: 'Build the task board',
        description: 'Four status columns with drag-free status controls.',
        status: TaskStatus.DOING,
        priority: Priority.HIGH,
        project: 'Mobile App',
        labels: ['Development'],
        dueInDays: 6,
      },
      {
        title: 'Fix overflow on small screens',
        description: 'The board scrolls the page body instead of the column container.',
        status: TaskStatus.DOING,
        priority: Priority.HIGH,
        project: 'Website Redesign',
        labels: ['Bug', 'Development'],
        dueInDays: 1,
      },
      {
        title: 'Define the API response envelope',
        description: 'Agree on { data } and { data, meta } across every endpoint.',
        status: TaskStatus.COMPLETED,
        priority: Priority.MEDIUM,
        project: 'Internal Tools',
        labels: ['Documentation'],
        dueInDays: -3,
      },
      {
        title: 'Write the database schema',
        description: 'Users, workspaces, projects, tasks, subtasks, comments, activity.',
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
        project: 'Internal Tools',
        labels: ['Development', 'Documentation'],
        dueInDays: -6,
      },
      {
        title: 'Research competitor onboarding',
        description: 'Compare first-run experiences across three similar products.',
        status: TaskStatus.ON_HOLD,
        priority: Priority.LOW,
        project: 'Website Redesign',
        labels: ['Research'],
        dueInDays: 30,
      },
      {
        title: 'Evaluate analytics providers',
        description: 'Paused until the privacy review is complete.',
        status: TaskStatus.ON_HOLD,
        priority: Priority.NONE,
        project: 'Internal Tools',
        labels: ['Research'],
        dueInDays: null,
      },
    ];

    const createdTasks = await taskModel.insertMany(
      taskSeeds.map((seedTask) => ({
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
    // Subtasks, comments and activity on the first in-progress task, so the
    // detail screen has something real to show.
    // ---------------------------------------------------------------------
    const featured = createdTasks.find((task) => task.status === TaskStatus.DOING);

    if (featured) {
      await subtaskModel.insertMany([
        {
          taskId: featured._id,
          workspaceId,
          title: 'Enable anonymous sign-in in the Firebase console',
          status: TaskStatus.COMPLETED,
          priority: Priority.HIGH,
          memberId: user._id,
          dueDate: daysFromNow(-1),
          order: 0,
        },
        {
          taskId: featured._id,
          workspaceId,
          title: 'Verify ID tokens with the Admin SDK',
          status: TaskStatus.DOING,
          priority: Priority.URGENT,
          memberId: user._id,
          dueDate: daysFromNow(1),
          order: 1,
        },
        {
          taskId: featured._id,
          workspaceId,
          title: 'Handle token refresh on the client',
          status: TaskStatus.TODO,
          priority: Priority.MEDIUM,
          memberId: null,
          dueDate: daysFromNow(3),
          order: 2,
        },
      ]);

      await commentModel.insertMany([
        {
          taskId: featured._id,
          workspaceId,
          authorId: user._id,
          body: 'Anonymous sign-in is enabled. Moving on to server-side verification.',
        },
        {
          taskId: featured._id,
          workspaceId,
          authorId: user._id,
          body: 'Remember that ID tokens expire after an hour — the client needs to refresh.',
        },
      ]);
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
