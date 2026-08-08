import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../types/error-codes';

/**
 * Application exception carrying a stable {@link ErrorCode} alongside the HTTP
 * status.
 *
 * Services throw these instead of bare `HttpException`s so the exception filter
 * can emit a consistent `code` without pattern-matching on message strings.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: unknown,
  ) {
    super({ message, code, details }, status);
  }

  static notFound(resource: string): AppException {
    return new AppException(ErrorCode.NOT_FOUND, `${resource} not found`, HttpStatus.NOT_FOUND);
  }

  static forbidden(message = 'You do not have access to this resource'): AppException {
    return new AppException(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }

  static unauthenticated(
    message = 'Authentication required',
    code: ErrorCode = ErrorCode.UNAUTHENTICATED,
  ): AppException {
    return new AppException(code, message, HttpStatus.UNAUTHORIZED);
  }

  static conflict(message: string): AppException {
    return new AppException(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
  }

  static badRequest(message: string, details?: unknown): AppException {
    return new AppException(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}
