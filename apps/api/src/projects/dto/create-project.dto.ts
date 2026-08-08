import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Priority } from '@ablespace/shared';

/** `workspaceId` is absent by design — it comes from the session. */
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(Priority, { message: `priority must be one of: ${Object.values(Priority)}` })
  priority?: Priority;

  /** Validated against workspace membership in the service. */
  @IsOptional()
  @IsMongoId({ message: 'leadId must be a valid id' })
  leadId?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dueDate must be a valid ISO date' })
  dueDate?: Date | null;
}
