import { Priority, TaskStatus } from '@ablespace/shared';

/**
 * The demo dataset, kept separate from the seeding routine so it can be
 * inspected and tested without connecting to a database.
 *
 * Everything here is fixed data — no randomness, no wall-clock reads — so two
 * runs on the same day produce identical documents.
 */

/** One seeded task, before ids and dates are resolved. */
export interface TaskSeed {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  /** Project name; resolved to an id at insert time. */
  project: string;
  /** Label names; resolved to ids at insert time. */
  labels: string[];
  /** Due date relative to the seed epoch, or null for no due date. */
  dueInDays: number | null;
}

export const LABEL_SEEDS: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Design', color: '#8B5CF6' },
  { name: 'Development', color: '#3B82F6' },
  { name: 'Research', color: '#F59E0B' },
  { name: 'Bug', color: '#EF4444' },
  { name: 'Documentation', color: '#10B981' },
];

export const PROJECT_SEEDS: ReadonlyArray<{
  name: string;
  description: string;
  priority: Priority;
  dueInDays: number | null;
}> = [
  {
    name: 'Website Redesign',
    description: 'Refresh the marketing site and design system.',
    priority: Priority.HIGH,
    dueInDays: 21,
  },
  {
    name: 'Mobile App',
    description: 'Ship the first release of the companion app.',
    priority: Priority.MEDIUM,
    dueInDays: 45,
  },
  {
    name: 'Internal Tools',
    description: 'Improve the team dashboard and reporting.',
    priority: Priority.LOW,
    dueInDays: null,
  },
];

/**
 * The task the detail screen's subtasks, comments and activity hang off.
 *
 * Pinned by title rather than by position or status, so reordering TASK_SEEDS
 * cannot silently move them to a different task.
 */
export const FEATURED_TASK_TITLE = 'Develop Login Feature';

/** Realistic demo tasks spread across all four board columns. */
export const TASK_SEEDS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Write API Documentation',
    description:
      'Document every endpoint, the request and response envelopes, and the error codes.',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    project: 'Internal Tools',
    labels: ['Documentation'],
    dueInDays: 5,
  },
  {
    title: 'Design Homepage',
    description: 'Hero, feature grid and pricing section for the refreshed marketing site.',
    status: TaskStatus.TODO,
    priority: Priority.HIGH,
    project: 'Website Redesign',
    labels: ['Design'],
    dueInDays: 3,
  },
  {
    title: 'Security Audit Scheduled',
    description: 'Book the external review of authentication and workspace authorization.',
    status: TaskStatus.TODO,
    priority: Priority.URGENT,
    project: 'Internal Tools',
    labels: ['Research'],
    dueInDays: 12,
  },
  {
    title: 'Develop Login Feature',
    description: 'Anonymous and Google sign-in, with token verification on the server.',
    status: TaskStatus.DOING,
    priority: Priority.URGENT,
    project: 'Mobile App',
    labels: ['Development'],
    dueInDays: 2,
  },
  {
    title: 'Test Payment Gateway',
    description: 'Cover the success, decline and timeout paths against the sandbox.',
    status: TaskStatus.DOING,
    priority: Priority.HIGH,
    project: 'Mobile App',
    labels: ['Development', 'Bug'],
    dueInDays: 6,
  },
  {
    title: 'Performance Optimization',
    description: 'Profile the board query and remove the remaining N+1 lookups.',
    status: TaskStatus.DOING,
    priority: Priority.MEDIUM,
    project: 'Internal Tools',
    labels: ['Development'],
    dueInDays: 9,
  },
  {
    title: 'Code Review Completed',
    description: 'Task API and authorization guard reviewed and approved.',
    status: TaskStatus.COMPLETED,
    priority: Priority.MEDIUM,
    project: 'Internal Tools',
    labels: ['Development'],
    dueInDays: -3,
  },
  {
    title: 'Feature Testing Passed',
    description: 'Board, list and task detail verified across desktop, tablet and mobile.',
    status: TaskStatus.COMPLETED,
    priority: Priority.HIGH,
    project: 'Mobile App',
    labels: ['Development'],
    dueInDays: -5,
  },
  {
    title: 'UI Design Updated',
    description: 'Colour tokens and spacing scale aligned with the latest design file.',
    status: TaskStatus.COMPLETED,
    priority: Priority.LOW,
    project: 'Website Redesign',
    labels: ['Design'],
    dueInDays: -8,
  },
  {
    title: 'Deploy to Production',
    description: 'Blocked until the security audit signs off.',
    status: TaskStatus.ON_HOLD,
    priority: Priority.HIGH,
    project: 'Internal Tools',
    labels: ['Development'],
    dueInDays: 20,
  },
  {
    title: 'User Feedback',
    description: 'Collate responses from the first round of guest sessions.',
    status: TaskStatus.ON_HOLD,
    priority: Priority.NONE,
    project: 'Website Redesign',
    labels: ['Research'],
    dueInDays: null,
  },
];

/** Subtasks attached to the featured task. */
export const SUBTASK_SEEDS: ReadonlyArray<{
  title: string;
  status: TaskStatus;
  priority: Priority;
  assigned: boolean;
  dueInDays: number;
  order: number;
}> = [
  {
    title: 'Enable anonymous sign-in in the Firebase console',
    status: TaskStatus.COMPLETED,
    priority: Priority.HIGH,
    assigned: true,
    dueInDays: -1,
    order: 0,
  },
  {
    title: 'Verify ID tokens with the Admin SDK',
    status: TaskStatus.DOING,
    priority: Priority.URGENT,
    assigned: true,
    dueInDays: 1,
    order: 1,
  },
  {
    title: 'Handle token refresh on the client',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    assigned: false,
    dueInDays: 3,
    order: 2,
  },
];

/** Comments on the featured task. */
export const COMMENT_SEEDS: ReadonlyArray<string> = [
  'Anonymous sign-in is enabled. Moving on to server-side verification.',
  'Remember that ID tokens expire after an hour — the client needs to refresh.',
];
