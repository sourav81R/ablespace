import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Priority, TaskStatus } from '@ablespace/shared';

/** `taskId` comes from the route, not the body. */
export class CreateSubtaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Subtask title is required' })
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsMongoId({ message: 'memberId must be a valid id' })
  memberId?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dueDate must be a valid ISO date' })
  dueDate?: Date | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
