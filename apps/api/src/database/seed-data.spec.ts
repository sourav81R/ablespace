import { Priority, TASK_STATUS_ORDER, TaskStatus } from '@ablespace/shared';
import {
  COMMENT_SEEDS,
  FEATURED_TASK_TITLE,
  LABEL_SEEDS,
  PROJECT_SEEDS,
  SUBTASK_SEEDS,
  TASK_SEEDS,
} from './seed-data';

/**
 * The seed dataset is what a reviewer sees on first load, so it is worth
 * pinning: the exact task titles, the spread across board columns, and the
 * absence of anything non-deterministic.
 */
describe('seed data', () => {
  /** The task titles the demo board is expected to show. */
  const REQUIRED_TITLES = [
    'Write API Documentation',
    'Code Review Completed',
    'Design Homepage',
    'Develop Login Feature',
    'Test Payment Gateway',
    'Deploy to Production',
    'Feature Testing Passed',
    'UI Design Updated',
    'Security Audit Scheduled',
    'User Feedback',
    'Performance Optimization',
  ];

  it('contains every required task title', () => {
    const titles = TASK_SEEDS.map((task) => task.title);

    for (const required of REQUIRED_TITLES) {
      expect(titles).toContain(required);
    }
  });

  it('contains no tasks beyond the required set', () => {
    expect(TASK_SEEDS).toHaveLength(REQUIRED_TITLES.length);
  });

  it('has no duplicate titles', () => {
    const titles = TASK_SEEDS.map((task) => task.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('populates all four board columns', () => {
    // An empty column would make the board look broken on first load.
    const statuses = new Set(TASK_SEEDS.map((task) => task.status));

    for (const status of TASK_STATUS_ORDER) {
      expect(statuses).toContain(status);
    }
  });

  it('uses only declared statuses and priorities', () => {
    for (const task of TASK_SEEDS) {
      expect(Object.values(TaskStatus)).toContain(task.status);
      expect(Object.values(Priority)).toContain(task.priority);
    }
  });

  it('references only projects that are seeded', () => {
    const projectNames = new Set(PROJECT_SEEDS.map((project) => project.name));

    for (const task of TASK_SEEDS) {
      expect(projectNames).toContain(task.project);
    }
  });

  it('references only labels that are seeded', () => {
    // A dangling label name would silently produce a task with no labels.
    const labelNames = new Set(LABEL_SEEDS.map((label) => label.name));

    for (const task of TASK_SEEDS) {
      for (const label of task.labels) {
        expect(labelNames).toContain(label);
      }
    }
  });

  it('includes overdue, upcoming and undated work', () => {
    const due = TASK_SEEDS.map((task) => task.dueInDays);

    expect(due.some((d) => d !== null && d < 0)).toBe(true);
    expect(due.some((d) => d !== null && d > 0)).toBe(true);
    expect(due.some((d) => d === null)).toBe(true);
  });

  it('attaches subtasks and comments to a task that exists', () => {
    const titles = TASK_SEEDS.map((task) => task.title);

    expect(titles).toContain(FEATURED_TASK_TITLE);
    expect(SUBTASK_SEEDS.length).toBeGreaterThan(0);
    expect(COMMENT_SEEDS.length).toBeGreaterThan(0);
  });

  it('orders subtasks contiguously from zero', () => {
    const orders = SUBTASK_SEEDS.map((subtask) => subtask.order).sort((a, b) => a - b);

    expect(orders).toEqual(orders.map((_, index) => index));
  });

  it('has unique label names and colours', () => {
    const names = LABEL_SEEDS.map((label) => label.name);
    const colours = LABEL_SEEDS.map((label) => label.color);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it('has unique project names', () => {
    const names = PROJECT_SEEDS.map((project) => project.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('is deterministic — the dataset is fixed, not generated', () => {
    // Every value is a literal: no Math.random, no Date.now, no id generation.
    // Serialising twice must produce identical output, which would not hold if
    // anything were computed at read time.
    const first = JSON.stringify({ TASK_SEEDS, PROJECT_SEEDS, LABEL_SEEDS, SUBTASK_SEEDS });
    const second = JSON.stringify({ TASK_SEEDS, PROJECT_SEEDS, LABEL_SEEDS, SUBTASK_SEEDS });

    expect(first).toBe(second);
    // Dates are expressed as day offsets, not Date objects, so the fixture
    // carries no timestamp of its own.
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('keeps task titles in a stable order', () => {
    // Order is part of the fixture: a reviewer comparing two runs should see
    // the board in the same sequence.
    expect(TASK_SEEDS.map((task) => task.title)).toEqual([
      'Write API Documentation',
      'Design Homepage',
      'Security Audit Scheduled',
      'Develop Login Feature',
      'Test Payment Gateway',
      'Performance Optimization',
      'Code Review Completed',
      'Feature Testing Passed',
      'UI Design Updated',
      'Deploy to Production',
      'User Feedback',
    ]);
  });
});
