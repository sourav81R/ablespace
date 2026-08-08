import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { Types } from 'mongoose';
import { Priority, TaskStatus } from '@ablespace/shared';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { QueryTasksDto } from '../tasks/dto/query-tasks.dto';
import { CreateProjectDto } from '../projects/dto/create-project.dto';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { CreateSubtaskDto } from '../subtasks/dto/create-subtask.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { ParseObjectIdPipe } from './pipes/parse-object-id.pipe';

/**
 * The trust boundary, exercised through the same validation the running app
 * applies.
 *
 * These assertions are the difference between "ownership fields are not in the
 * DTO" as a convention and as an enforced property: `forbidNonWhitelisted`
 * turns an attempt to supply one into a 400 rather than a silently ignored
 * field.
 */

/** Mirrors the global ValidationPipe configuration in main.ts. */
function validate<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): ValidationError[] {
  const dto = plainToInstance(cls, payload, { enableImplicitConversion: false });
  return validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false,
  });
}

function messagesFrom(errors: ValidationError[]): string {
  return errors.flatMap((error) => Object.values(error.constraints ?? {})).join(' ');
}

describe('authorization: ownership fields are never accepted from the client', () => {
  // Each of these is set by the server from the verified session. A client that
  // sends one must be rejected outright, not quietly ignored.
  const forbidden: Array<[string, Record<string, unknown>]> = [
    ['workspaceId on a task', { title: 'T', workspaceId: new Types.ObjectId().toString() }],
    ['reporterId on a task', { title: 'T', reporterId: new Types.ObjectId().toString() }],
    ['userId on a task', { title: 'T', userId: new Types.ObjectId().toString() }],
    ['id on a task', { title: 'T', id: new Types.ObjectId().toString() }],
    ['completedAt on a task', { title: 'T', completedAt: new Date().toISOString() }],
  ];

  it.each(forbidden)('rejects %s', (_label, payload) => {
    const errors = validate(CreateTaskDto, payload);

    expect(errors.length).toBeGreaterThan(0);
    expect(messagesFrom(errors)).toMatch(/should not exist/i);
  });

  it('rejects workspaceId on a project', () => {
    const errors = validate(CreateProjectDto, {
      name: 'P',
      workspaceId: new Types.ObjectId().toString(),
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects authorId on a comment', () => {
    // Otherwise a client could post a comment attributed to someone else.
    const errors = validate(CreateCommentDto, {
      body: 'hello',
      authorId: new Types.ObjectId().toString(),
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects isAnonymous and email on a profile update', () => {
    // Both come from the verified token; letting a client set them would let it
    // rewrite its own identity.
    expect(validate(UpdateProfileDto, { isAnonymous: false }).length).toBeGreaterThan(0);
    expect(validate(UpdateProfileDto, { email: 'a@b.com' }).length).toBeGreaterThan(0);
  });

  it('accepts a payload containing only legitimate fields', () => {
    expect(validate(CreateTaskDto, { title: 'A real task' })).toEqual([]);
  });
});

describe('validation: malformed requests are rejected', () => {
  describe('required fields', () => {
    it('rejects a task with no title', () => {
      expect(messagesFrom(validate(CreateTaskDto, {}))).toContain('required');
    });

    it('rejects an empty title', () => {
      expect(validate(CreateTaskDto, { title: '' }).length).toBeGreaterThan(0);
    });

    it('rejects a whitespace-only title', () => {
      // @Transform trims first, so "   " becomes "" and fails @IsNotEmpty.
      expect(validate(CreateTaskDto, { title: '   ' }).length).toBeGreaterThan(0);
    });

    it('rejects an empty comment body', () => {
      expect(validate(CreateCommentDto, { body: '' }).length).toBeGreaterThan(0);
    });
  });

  describe('string lengths', () => {
    it('rejects a title over 200 characters', () => {
      expect(validate(CreateTaskDto, { title: 'x'.repeat(201) }).length).toBeGreaterThan(0);
    });

    it('accepts a title at exactly the limit', () => {
      expect(validate(CreateTaskDto, { title: 'x'.repeat(200) })).toEqual([]);
    });

    it('rejects a comment over 5000 characters', () => {
      const errors = validate(CreateCommentDto, { body: 'x'.repeat(5001) });
      expect(messagesFrom(errors)).toContain('5000');
    });
  });

  describe('enum values', () => {
    it('rejects an unknown status', () => {
      expect(validate(CreateTaskDto, { title: 'T', status: 'ARCHIVED' }).length).toBeGreaterThan(0);
    });

    it('rejects an unknown priority', () => {
      expect(validate(CreateTaskDto, { title: 'T', priority: 'CRITICAL' }).length).toBeGreaterThan(
        0,
      );
    });

    it('accepts every declared status', () => {
      for (const status of Object.values(TaskStatus)) {
        expect(validate(CreateTaskDto, { title: 'T', status })).toEqual([]);
      }
    });

    it('accepts every declared priority', () => {
      for (const priority of Object.values(Priority)) {
        expect(validate(CreateTaskDto, { title: 'T', priority })).toEqual([]);
      }
    });
  });

  describe('MongoDB ids', () => {
    it('rejects a malformed projectId', () => {
      expect(
        validate(CreateTaskDto, { title: 'T', projectId: 'not-an-id' }).length,
      ).toBeGreaterThan(0);
    });

    it('rejects a malformed id inside memberIds', () => {
      expect(validate(CreateTaskDto, { title: 'T', memberIds: ['nope'] }).length).toBeGreaterThan(
        0,
      );
    });

    it('accepts a well-formed project reference', () => {
      const projectId = new Types.ObjectId().toString();
      expect(validate(CreateTaskDto, { title: 'T', projectId })).toEqual([]);
    });

    it('rejects a malformed route parameter before it reaches the database', () => {
      const pipe = new ParseObjectIdPipe();

      expect(() => pipe.transform('not-an-object-id')).toThrow('not found');
      // A valid id passes through untouched.
      const valid = new Types.ObjectId().toString();
      expect(pipe.transform(valid)).toBe(valid);
    });
  });

  describe('dates', () => {
    it('rejects a non-date dueDate', () => {
      expect(validate(CreateTaskDto, { title: 'T', dueDate: 'tomorrow' }).length).toBeGreaterThan(
        0,
      );
    });

    it('accepts an ISO date string', () => {
      expect(validate(CreateTaskDto, { title: 'T', dueDate: '2026-06-01T00:00:00.000Z' })).toEqual(
        [],
      );
    });

    it('rejects a malformed dueFrom filter', () => {
      expect(validate(QueryTasksDto, { dueFrom: 'yesterday' }).length).toBeGreaterThan(0);
    });
  });

  describe('arrays', () => {
    it('rejects a non-array where an array is expected', () => {
      expect(
        validate(CreateTaskDto, { title: 'T', memberIds: 'single-value' }).length,
      ).toBeGreaterThan(0);
    });

    it('rejects more members than the cap allows', () => {
      const tooMany = Array.from({ length: 21 }, () => new Types.ObjectId().toString());
      expect(validate(CreateTaskDto, { title: 'T', memberIds: tooMany }).length).toBeGreaterThan(0);
    });

    it('validates nested resource objects', () => {
      // A resource needs both a label and a valid absolute URL.
      expect(
        validate(CreateTaskDto, { title: 'T', resources: [{ label: 'Doc' }] }).length,
      ).toBeGreaterThan(0);
      expect(
        validate(CreateTaskDto, {
          title: 'T',
          resources: [{ label: 'Doc', url: 'not a url' }],
        }).length,
      ).toBeGreaterThan(0);
      expect(
        validate(CreateTaskDto, {
          title: 'T',
          resources: [{ label: 'Doc', url: 'https://example.com/doc' }],
        }),
      ).toEqual([]);
    });
  });

  describe('subtasks', () => {
    it('rejects a subtask with no title', () => {
      expect(validate(CreateSubtaskDto, {}).length).toBeGreaterThan(0);
    });

    it('rejects a taskId supplied in the body', () => {
      // The parent comes from the route, not the payload.
      expect(
        validate(CreateSubtaskDto, { title: 'S', taskId: new Types.ObjectId().toString() }).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('query filters', () => {
    it('rejects an unknown status filter', () => {
      expect(validate(QueryTasksDto, { status: 'NOPE' }).length).toBeGreaterThan(0);
    });

    it('accepts a comma-separated status list', () => {
      expect(validate(QueryTasksDto, { status: 'TODO,DOING' })).toEqual([]);
    });

    it('rejects a malformed memberId filter', () => {
      expect(validate(QueryTasksDto, { memberId: 'abc' }).length).toBeGreaterThan(0);
    });

    it('rejects an unknown query parameter', () => {
      expect(validate(QueryTasksDto, { sortBy: 'title' }).length).toBeGreaterThan(0);
    });
  });
});
