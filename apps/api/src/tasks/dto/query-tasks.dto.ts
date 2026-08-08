import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Priority, SortOrder, TaskSortField, TaskStatus } from '@ablespace/shared';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

/**
 * Normalises a query parameter that may arrive as `?status=A&status=B` (array)
 * or `?status=A,B` (comma-separated). Express gives us either shape depending
 * on how the client serialises it, so we accept both.
 */
function toArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Filters backing the Fields menu (PRD §10): priority, members, due date,
 * labels, status and reporter — plus free-text search.
 *
 * Filtering happens server-side so the client never downloads the whole
 * collection to filter it in the browser.
 */
export class QueryTasksDto extends PaginationQueryDto {
  /** Matches task title, description, and label names. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(TaskStatus, { each: true, message: 'Invalid status filter' })
  status?: TaskStatus[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(Priority, { each: true, message: 'Invalid priority filter' })
  priority?: Priority[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsMongoId({ each: true, message: 'Invalid member filter' })
  memberId?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsMongoId({ each: true, message: 'Invalid label filter' })
  labelId?: string[];

  @IsOptional()
  @IsMongoId({ message: 'Invalid reporter filter' })
  reporterId?: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid project filter' })
  projectId?: string;

  /** Inclusive lower bound on dueDate. */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dueFrom must be a valid ISO date' })
  dueFrom?: Date;

  /** Inclusive upper bound on dueDate. */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dueTo must be a valid ISO date' })
  dueTo?: Date;

  @IsOptional()
  @IsEnum(TaskSortField)
  sort?: TaskSortField = TaskSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
