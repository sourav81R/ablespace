import { ArgumentsHost, BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ApiErrorResponse } from '@ablespace/shared';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { PaginatedResult, TransformInterceptor } from './interceptors/transform.interceptor';
import { buildPaginationMeta } from './dto/pagination.dto';
import { AppException } from './exceptions/app.exception';
import { ErrorCode } from './types/error-codes';

/**
 * The response contract, exercised through the interceptor and filter that
 * actually produce it. The client relies on exactly one shape per outcome, so
 * these lock it against drift.
 */
describe('response envelope', () => {
  const interceptor = new TransformInterceptor();

  /** Minimal ExecutionContext; the interceptor does not read from it. */
  const context = {} as ExecutionContext;

  function handlerReturning(value: unknown): CallHandler {
    return { handle: () => of(value) } as CallHandler;
  }

  it('wraps a single resource in { data }', (done) => {
    const task = { id: '1', title: 'A task' };

    interceptor.intercept(context, handlerReturning(task)).subscribe((result) => {
      expect(result).toEqual({ data: task });
      // No meta on a single resource.
      expect('meta' in result).toBe(false);
      done();
    });
  });

  it('wraps a collection in { data, meta }', (done) => {
    const items = [{ id: '1' }, { id: '2' }];
    const paginated = new PaginatedResult(items, buildPaginationMeta(1, 25, 2));

    interceptor.intercept(context, handlerReturning(paginated)).subscribe((result) => {
      expect(result.data).toEqual(items);
      expect(result.meta).toMatchObject({ page: 1, limit: 25, total: 2 });
      done();
    });
  });

  it('reports an empty collection as data: [] with a real total', (done) => {
    const paginated = new PaginatedResult([], buildPaginationMeta(1, 25, 0));

    interceptor.intercept(context, handlerReturning(paginated)).subscribe((result) => {
      expect(result.data).toEqual([]);
      expect(result.meta).toMatchObject({ page: 1, limit: 25, total: 0 });
      done();
    });
  });

  it('preserves null rather than dropping the data key', (done) => {
    interceptor.intercept(context, handlerReturning(null)).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });
});

describe('error envelope', () => {
  const filter = new GlobalExceptionFilter();

  /** Captures the JSON body and status the filter writes. */
  function capture(): {
    host: ArgumentsHost;
    body: () => ApiErrorResponse;
    status: () => number;
  } {
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
        getRequest: () => ({ url: '/api/tasks', method: 'POST' }),
      }),
    } as unknown as ArgumentsHost;

    return {
      host,
      body: () => sent as ApiErrorResponse,
      status: () => code,
    };
  }

  it('emits every contract field for a validation failure', () => {
    const captured = capture();
    // Shaped exactly as NestJS ValidationPipe throws it.
    filter.catch(
      new BadRequestException({
        message: ['title should not be empty'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      captured.host,
    );

    const body = captured.body();
    expect(captured.status()).toBe(HttpStatus.BAD_REQUEST);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('Validation failed');
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.details).toEqual(['title should not be empty']);
  });

  it('always includes details, as an empty array when there are none', () => {
    const captured = capture();
    filter.catch(new NotFoundException('Task not found'), captured.host);

    const body = captured.body();
    // Present unconditionally so the client never has to check for the key.
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details).toEqual([]);
  });

  it('carries the machine-readable code for a domain exception', () => {
    const captured = capture();
    filter.catch(AppException.notFound('Task'), captured.host);

    const body = captured.body();
    expect(captured.status()).toBe(HttpStatus.NOT_FOUND);
    expect(body.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.message).toBe('Task not found');
  });

  it('never leaks internals from an unexpected error', () => {
    const captured = capture();
    filter.catch(new Error('connection string user:password@host failed'), captured.host);

    const body = captured.body();
    expect(captured.status()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.code).toBe(ErrorCode.INTERNAL_ERROR);
    // The raw message and any stack stay in the server log, not the response.
    expect(body.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(body)).not.toContain('password');
  });

  it('uses the same field set for every error', () => {
    const captured = capture();
    filter.catch(AppException.forbidden(), captured.host);

    expect(Object.keys(captured.body()).sort()).toEqual([
      'code',
      'details',
      'message',
      'path',
      'statusCode',
      'timestamp',
    ]);
  });
});
