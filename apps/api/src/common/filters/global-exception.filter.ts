import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ApiErrorResponse } from '@ablespace/shared';
import { ErrorCode } from '../types/error-codes';
import { AppException } from '../exceptions/app.exception';

/** Mongo's duplicate-key error number. */
const MONGO_DUPLICATE_KEY = 11000;

/**
 * The shape of a MongoDB driver error we care about.
 *
 * Declared structurally rather than imported from `mongodb`, which is a
 * transitive dependency of mongoose and not a direct one — depending on it
 * directly would couple us to a package we do not install ourselves.
 */
interface MongoServerErrorLike {
  name: string;
  code: number;
}

/**
 * Coerces whatever an exception carried as `details` into an array.
 *
 * ValidationPipe supplies a string array; an AppException may carry a single
 * object or nothing. Normalising here means the response shape never varies.
 */
function toDetailsArray(details: unknown): unknown[] {
  if (details === undefined || details === null) {
    return [];
  }
  return Array.isArray(details) ? details : [details];
}

interface NormalisedError {
  status: number;
  message: string;
  code: ErrorCode;
  details?: unknown;
  /** Set when the error is genuinely unexpected and should be logged loudly. */
  isUnexpected?: boolean;
}

/**
 * Converts every thrown value into the single error shape documented in
 * SYSTEM_ARCHITECTURE §14.
 *
 * Two rules drive this filter:
 *  1. The client always receives the same JSON shape, whatever went wrong.
 *  2. Internal details (stack traces, driver messages) never reach the client
 *     in production.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalised = this.normalise(exception);

    // Unexpected errors get a full stack trace in the server log — that is where
    // stack traces belong, not in the HTTP response.
    if (normalised.isUnexpected) {
      this.logger.error(
        `Unhandled ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (normalised.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} — ${normalised.message}`);
    } else {
      this.logger.warn(
        `${request.method} ${request.url} — ${normalised.status} ${normalised.code}`,
      );
    }

    const body: ApiErrorResponse = {
      statusCode: normalised.status,
      message: normalised.message,
      code: normalised.code,
      // Always an array, so a client can read `details` unconditionally.
      details: toDetailsArray(normalised.details),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // Outside production, attach the real error and its stack so a developer
    // does not have to go hunting in the server log. This block is the only
    // place internals can reach a response, and it can never run in production.
    if (!this.isProduction && normalised.isUnexpected && exception instanceof Error) {
      body.debug = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack?.split('\n').map((line) => line.trim()),
      };
    }

    response.status(normalised.status).json(body);
  }

  /**
   * Read from the environment rather than injected config.
   *
   * The filter is constructed by Nest before ConfigService is guaranteed
   * available to it, and an error thrown during startup must still be handled
   * safely — so this deliberately has no dependency to fail on.
   */
  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        message: exception.message,
        code: exception.code,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    // Mongoose rejected the document before it reached the database.
    if (exception instanceof MongooseError.ValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        code: ErrorCode.VALIDATION_ERROR,
        details: Object.values(exception.errors).map((e) => e.message),
      };
    }

    // A malformed ObjectId reached a query. Treat as "not found" rather than 500 —
    // an unparseable id can never match a real document.
    if (exception instanceof MongooseError.CastError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        code: ErrorCode.NOT_FOUND,
      };
    }

    if (this.isMongoServerError(exception) && exception.code === MONGO_DUPLICATE_KEY) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'That record already exists',
        code: ErrorCode.CONFLICT,
      };
    }

    // The database is unreachable or the driver could not select a server.
    // A 503 tells the client this is transient and worth retrying, rather than
    // a 500 implying the request itself was at fault.
    if (this.isConnectivityError(exception)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'The service is temporarily unavailable. Please try again.',
        code: ErrorCode.SERVICE_UNAVAILABLE,
        isUnexpected: true,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      code: ErrorCode.INTERNAL_ERROR,
      isUnexpected: true,
    };
  }

  private fromHttpException(exception: HttpException): NormalisedError {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    // ValidationPipe emits `{ message: string[], error, statusCode }`.
    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      const rawMessage = record.message;

      if (Array.isArray(rawMessage)) {
        return {
          status,
          message: 'Validation failed',
          code: ErrorCode.VALIDATION_ERROR,
          details: rawMessage,
        };
      }

      return {
        status,
        message: typeof rawMessage === 'string' ? rawMessage : exception.message,
        code: this.codeForStatus(status, record.code),
        details: record.details,
      };
    }

    return {
      status,
      message: exception.message,
      code: this.codeForStatus(status),
    };
  }

  /** Maps an HTTP status to a default error code when none was supplied. */
  private codeForStatus(status: number, explicit?: unknown): ErrorCode {
    if (typeof explicit === 'string' && explicit in ErrorCode) {
      return explicit as ErrorCode;
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? ErrorCode.INTERNAL_ERROR
          : ErrorCode.VALIDATION_ERROR;
    }
  }

  /**
   * True for the driver errors that mean "the database is not reachable".
   *
   * Matched by error name rather than instanceof, because these come from the
   * `mongodb` driver — a transitive dependency we do not import directly.
   */
  private isConnectivityError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const name = (error as { name?: string }).name ?? '';

    return (
      name === 'MongoServerSelectionError' ||
      name === 'MongoNetworkError' ||
      name === 'MongoNotConnectedError' ||
      name === 'MongoTimeoutError'
    );
  }

  private isMongoServerError(error: unknown): error is MongoServerErrorLike {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { name?: string }).name === 'MongoServerError'
    );
  }
}
