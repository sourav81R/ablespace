import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { ApiErrorResponse } from '@ablespace/shared';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ErrorCode } from './types/error-codes';

/**
 * Error handling across environments.
 *
 * The property that matters most is negative: a production server must never
 * emit a stack trace, a driver message, or anything else that describes its
 * internals.
 */
describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  /** Captures the status and JSON body the filter writes. */
  function capture(): { host: ArgumentsHost; body: () => ApiErrorResponse; status: () => number } {
    let sent: ApiErrorResponse | undefined;
    let code = 0;

    const response = {
      status(value: number) {
        code = value;
        return this;
      },
      json(payload: ApiErrorResponse) {
        sent = payload;
        return this;
      },
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/api/tasks', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;

    return { host, body: () => sent as ApiErrorResponse, status: () => code };
  }

  describe('production safety', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('never includes a stack trace', () => {
      const captured = capture();
      const error = new Error('ECONNREFUSED mongodb://user:secret@10.0.0.1:27017');

      filter.catch(error, captured.host);

      const body = captured.body();
      expect(body.debug).toBeUndefined();
      const serialised = JSON.stringify(body);
      expect(serialised).not.toContain('secret');
      expect(serialised).not.toContain('10.0.0.1');
      expect(serialised).not.toMatch(/\bat\s+\w+/);
    });

    it('replaces the raw message with a generic one', () => {
      const captured = capture();

      filter.catch(new TypeError('Cannot read properties of undefined'), captured.host);

      expect(captured.body().message).toBe('An unexpected error occurred');
      expect(captured.status()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('still reports expected errors accurately', () => {
      // Suppressing internals must not turn a 404 into a 500.
      const captured = capture();

      filter.catch(new NotFoundException('Task not found'), captured.host);

      expect(captured.status()).toBe(HttpStatus.NOT_FOUND);
      expect(captured.body().message).toBe('Task not found');
      expect(captured.body().debug).toBeUndefined();
    });
  });

  describe('development diagnostics', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('attaches the real error and stack for an unexpected failure', () => {
      const captured = capture();

      filter.catch(new TypeError('something broke'), captured.host);

      const debug = captured.body().debug;
      expect(debug?.name).toBe('TypeError');
      expect(debug?.message).toBe('something broke');
      expect(Array.isArray(debug?.stack)).toBe(true);
    });

    it('does not attach debug detail to an expected error', () => {
      // A 404 is not a bug; there is nothing to diagnose.
      const captured = capture();

      filter.catch(new NotFoundException('Task not found'), captured.host);

      expect(captured.body().debug).toBeUndefined();
    });

    it('keeps the client-facing message generic even in development', () => {
      const captured = capture();

      filter.catch(new Error('internal detail'), captured.host);

      expect(captured.body().message).toBe('An unexpected error occurred');
    });
  });

  describe('MongoDB errors', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('maps a duplicate key to 409', () => {
      const captured = capture();
      const duplicate = Object.assign(new Error('E11000 duplicate key'), {
        name: 'MongoServerError',
        code: 11000,
      });

      filter.catch(duplicate, captured.host);

      expect(captured.status()).toBe(HttpStatus.CONFLICT);
      expect(captured.body().code).toBe(ErrorCode.CONFLICT);
    });

    it('maps a malformed ObjectId to 404 rather than 500', () => {
      const captured = capture();
      const cast = new MongooseError.CastError('ObjectId', 'nonsense', '_id');

      filter.catch(cast, captured.host);

      expect(captured.status()).toBe(HttpStatus.NOT_FOUND);
      expect(captured.body().code).toBe(ErrorCode.NOT_FOUND);
    });

    it('maps a schema validation failure to 400 with field messages', () => {
      const captured = capture();
      const validation = new MongooseError.ValidationError();
      validation.errors = {
        title: { message: 'Path `title` is required.' },
      } as unknown as typeof validation.errors;

      filter.catch(validation, captured.host);

      expect(captured.status()).toBe(HttpStatus.BAD_REQUEST);
      expect(captured.body().details).toContain('Path `title` is required.');
    });

    it('maps an unreachable database to 503, not 500', () => {
      // 503 tells the client the failure is transient and worth retrying.
      const captured = capture();
      const unreachable = Object.assign(new Error('server selection timed out'), {
        name: 'MongoServerSelectionError',
      });

      filter.catch(unreachable, captured.host);

      expect(captured.status()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(captured.body().code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
    });

    it('does not leak the driver message for a connectivity failure', () => {
      process.env.NODE_ENV = 'production';
      const captured = capture();
      const unreachable = Object.assign(
        new Error('connection to cluster0.abcde.mongodb.net failed'),
        { name: 'MongoNetworkError' },
      );

      filter.catch(unreachable, captured.host);

      expect(JSON.stringify(captured.body())).not.toContain('mongodb.net');
    });
  });

  describe('unmatched routes', () => {
    it('returns the standard envelope for an unknown path', () => {
      // Nest raises NotFoundException for unmatched routes, and @Catch() with
      // no arguments picks it up — so a 404 looks like every other error.
      const captured = capture();

      filter.catch(new NotFoundException('Cannot GET /api/nope'), captured.host);

      expect(captured.status()).toBe(HttpStatus.NOT_FOUND);
      expect(Object.keys(captured.body())).toEqual(
        expect.arrayContaining(['statusCode', 'message', 'code', 'details', 'path', 'timestamp']),
      );
    });
  });
});
