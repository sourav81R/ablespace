import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginationMeta } from '@ablespace/shared';

/**
 * A controller may return this to supply pagination metadata; the interceptor
 * unwraps it into the `{ data, meta }` envelope.
 */
export class PaginatedResult<T> {
  constructor(
    readonly items: T[],
    readonly meta: PaginationMeta,
  ) {}
}

interface Envelope<T> {
  data: T;
  meta?: PaginationMeta;
}

/**
 * Wraps every successful controller return value in the response envelope from
 * SYSTEM_ARCHITECTURE §14.
 *
 * Doing this centrally means controllers return plain DTOs and never hand-build
 * `{ data: ... }`, so the contract cannot drift between endpoints.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T | PaginatedResult<T>,
  Envelope<T | T[]>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | PaginatedResult<T>>,
  ): Observable<Envelope<T | T[]>> {
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof PaginatedResult) {
          return { data: payload.items, meta: payload.meta };
        }
        return { data: payload };
      }),
    );
  }
}
