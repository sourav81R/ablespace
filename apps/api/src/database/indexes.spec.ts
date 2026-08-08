import { Schema } from 'mongoose';
import { UserSchema } from '../users/schemas/user.schema';
import { WorkspaceMemberSchema } from '../workspaces/schemas/workspace-member.schema';
import { ProjectSchema } from '../projects/schemas/project.schema';
import { TaskSchema } from '../tasks/schemas/task.schema';
import { CommentSchema } from '../comments/schemas/comment.schema';
import { ActivitySchema } from '../activity/schemas/activity.schema';
import { SubtaskSchema } from '../subtasks/schemas/subtask.schema';
import { LabelSchema } from '../labels/schemas/label.schema';

/**
 * Indexes are easy to drop by accident during a refactor and the loss is
 * invisible until a collection grows. These assert that every field the
 * application actually queries on is indexed.
 */
describe('database indexes', () => {
  /**
   * Every field covered by an index on the schema.
   *
   * Includes both `@Prop({ index: true })` declarations and explicit
   * `schema.index()` calls, and counts a compound index as covering its
   * leading field — which is how MongoDB uses it.
   */
  function indexedFields(schema: Schema): Set<string> {
    const fields = new Set<string>();

    for (const [definition] of schema.indexes()) {
      for (const key of Object.keys(definition)) {
        fields.add(key);
      }
    }

    // Single-field indexes declared inline on the path.
    schema.eachPath((path, type) => {
      const options = (type as { options?: { index?: boolean; unique?: boolean } }).options;
      if (options?.index || options?.unique) {
        fields.add(path);
      }
    });

    return fields;
  }

  const required: Array<[string, Schema, string[]]> = [
    ['users', UserSchema, ['firebaseUid']],
    ['workspaceMembers', WorkspaceMemberSchema, ['workspaceId', 'userId']],
    ['projects', ProjectSchema, ['workspaceId']],
    ['tasks', TaskSchema, ['workspaceId', 'projectId', 'status', 'dueDate', 'updatedAt']],
    ['comments', CommentSchema, ['taskId']],
    ['activities', ActivitySchema, ['taskId']],
  ];

  it.each(required)('%s indexes the fields it is queried by', (_name, schema, fields) => {
    const indexed = indexedFields(schema);

    for (const field of fields) {
      expect(indexed).toContain(field);
    }
  });

  it('enforces one user per Firebase UID', () => {
    // The unique constraint is what makes just-in-time provisioning safe
    // against two concurrent first requests.
    const uid = UserSchema.path('firebaseUid') as unknown as {
      options: { unique?: boolean };
    };

    expect(uid.options.unique).toBe(true);
  });

  it('enforces one membership per user per workspace', () => {
    const compound = WorkspaceMemberSchema.indexes().find(
      ([definition]) => 'workspaceId' in definition && 'userId' in definition,
    );

    expect(compound).toBeDefined();
    expect(compound?.[1]).toMatchObject({ unique: true });
  });

  it('enforces unique label names within a workspace', () => {
    const compound = LabelSchema.indexes().find(
      ([definition]) => 'workspaceId' in definition && 'name' in definition,
    );

    expect(compound?.[1]).toMatchObject({ unique: true });
  });

  it('leads every task index with workspaceId', () => {
    // No query crosses a workspace, so the tenant key belongs first in each
    // compound index for MongoDB to use it.
    const compound = TaskSchema.indexes().filter(
      ([definition]) => Object.keys(definition).length > 1 && !('title' in definition),
    );

    expect(compound.length).toBeGreaterThan(0);
    for (const [definition] of compound) {
      expect(Object.keys(definition)[0]).toBe('workspaceId');
    }
  });

  it('supports text search over task title and description', () => {
    const text = TaskSchema.indexes().find(([definition]) =>
      Object.values(definition).includes('text'),
    );

    expect(text).toBeDefined();
    expect(Object.keys(text?.[0] ?? {})).toEqual(expect.arrayContaining(['title', 'description']));
  });

  it('orders subtasks and comments by their parent', () => {
    expect(indexedFields(SubtaskSchema)).toContain('taskId');
    expect(indexedFields(CommentSchema)).toContain('taskId');
  });
});
