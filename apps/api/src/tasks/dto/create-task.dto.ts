import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Priority, TaskStatus } from '@ablespace/shared';

/** A link in the task's Resources section. */
export class ResourceLinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @IsUrl({ require_protocol: true }, { message: 'Resource url must be a valid URL' })
  @MaxLength(2000)
  url: string;
}

/**
 * Fields absent by design: `workspaceId` and `reporterId`. Both are set from
 * the authenticated session. With `forbidNonWhitelisted` enabled, a client that
 * tries to send them gets a 400 rather than silently having them ignored.
 */
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Task title is required' })
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus, {
    message: `status must be one of: ${Object.values(TaskStatus)}`,
  })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority, { message: `priority must be one of: ${Object.values(Priority)}` })
  priority?: Priority;

  @IsOptional()
  @IsMongoId({ message: 'projectId must be a valid id' })
  projectId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true, message: 'Each member id must be valid' })
  memberIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true, message: 'Each label id must be valid' })
  labelIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  teams?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dueDate must be a valid ISO date' })
  dueDate?: Date | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ResourceLinkDto)
  resources?: ResourceLinkDto[];
}
