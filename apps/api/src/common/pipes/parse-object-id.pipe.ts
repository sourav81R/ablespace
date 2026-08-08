import { Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { AppException } from '../exceptions/app.exception';

/**
 * Validates that a route parameter is a well-formed Mongo ObjectId.
 *
 * Rejecting early keeps malformed ids out of the query layer entirely. We
 * respond 404 rather than 400: an id that cannot exist is indistinguishable, to
 * the caller, from one that simply does not — and that avoids leaking whether a
 * given id format is meaningful in our system.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw AppException.notFound('Resource');
    }
    return value;
  }
}
