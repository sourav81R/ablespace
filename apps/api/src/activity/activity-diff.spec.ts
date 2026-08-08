import { Types } from 'mongoose';
import { ActivityType } from '@ablespace/shared';
import { diffTaskSnapshots, TaskSnapshot } from './activity-diff';

/**
 * The diff decides what appears in a task's history, so it is worth testing
 * directly: it is pure, it has real edge cases (order-insensitive arrays, date
 * identity), and getting it wrong produces a misleading audit trail.
 */
describe('diffTaskSnapshots', () => {
  const scope = {
    taskId: new Types.ObjectId(),
    workspaceId: new Types.ObjectId(),
    actorId: new Types.ObjectId(),
  };

  const base: TaskSnapshot = {
    title: 'Original title',
    description: 'Original description',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date('2026-01-15T12:00:00.000Z'),
    projectId: null,
    memberIds: [],
    labelIds: [],
  };

  it('produces no events when nothing changed', () => {
    expect(diffTaskSnapshots(base, { ...base }, scope)).toEqual([]);
  });

  it('records a status change with its before and after values', () => {
    const events = diffTaskSnapshots(base, { ...base, status: 'DOING' }, scope);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ActivityType.STATUS_CHANGED);
    expect(events[0].metadata).toMatchObject({
      field: 'status',
      from: 'TODO',
      to: 'DOING',
    });
  });

  it('records one event per changed field', () => {
    const events = diffTaskSnapshots(
      base,
      { ...base, status: 'DOING', priority: 'URGENT', title: 'New title' },
      scope,
    );

    expect(events.map((event) => event.type).sort()).toEqual(
      [
        ActivityType.PRIORITY_CHANGED,
        ActivityType.STATUS_CHANGED,
        ActivityType.TASK_UPDATED,
      ].sort(),
    );
  });

  it('distinguishes fields that share the TASK_UPDATED type', () => {
    // Title, description and project have no dedicated event, so metadata.field
    // is the only thing separating them.
    const events = diffTaskSnapshots(
      base,
      { ...base, title: 'New title', projectId: 'project-1' },
      scope,
    );

    expect(events).toHaveLength(2);
    expect(events.every((event) => event.type === ActivityType.TASK_UPDATED)).toBe(true);
    expect(events.map((event) => event.metadata?.field).sort()).toEqual(['project', 'title']);
  });

  it('does not include the description body in its event', () => {
    // Descriptions can be very long; we record that it changed, not the text.
    const events = diffTaskSnapshots(
      base,
      { ...base, description: 'Something completely different' },
      scope,
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ActivityType.TASK_UPDATED);
    expect(events[0].metadata).toEqual({ field: 'description' });
  });

  it('treats equal dates as unchanged even when they are different objects', () => {
    const events = diffTaskSnapshots(
      base,
      { ...base, dueDate: new Date('2026-01-15T12:00:00.000Z') },
      scope,
    );

    expect(events).toEqual([]);
  });

  it('detects a due date being cleared', () => {
    const events = diffTaskSnapshots(base, { ...base, dueDate: null }, scope);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ActivityType.DUE_DATE_CHANGED);
    expect(events[0].metadata?.to).toBeNull();
  });

  it('ignores member reordering', () => {
    // Reordering assignees is not a change the user made; only membership is.
    const before = { ...base, memberIds: ['a', 'b', 'c'] };
    const after = { ...base, memberIds: ['c', 'a', 'b'] };

    expect(diffTaskSnapshots(before, after, scope)).toEqual([]);
  });

  it('detects a member being added', () => {
    const events = diffTaskSnapshots(
      { ...base, memberIds: ['a'] },
      { ...base, memberIds: ['a', 'b'] },
      scope,
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ActivityType.MEMBER_CHANGED);
    expect(events[0].metadata?.to).toEqual(['a', 'b']);
  });

  it('detects label changes independently of members', () => {
    const events = diffTaskSnapshots(base, { ...base, labelIds: ['x'] }, scope);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ActivityType.LABEL_CHANGED);
  });

  it('attaches the scope to every event', () => {
    const events = diffTaskSnapshots(base, { ...base, status: 'DOING', priority: 'LOW' }, scope);

    for (const event of events) {
      expect(event.taskId).toBe(scope.taskId);
      expect(event.workspaceId).toBe(scope.workspaceId);
      expect(event.actorId).toBe(scope.actorId);
    }
  });
});
