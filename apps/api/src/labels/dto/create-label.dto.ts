import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Note what is *absent*: no `workspaceId`. Ownership is derived from the
 * authenticated session, and `forbidNonWhitelisted` rejects any request that
 * tries to supply it.
 */
export class CreateLabelDto {
  @IsString()
  @IsNotEmpty({ message: 'Label name is required' })
  @MaxLength(40)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsHexColor({ message: 'color must be a hex colour such as #22C55E' })
  color?: string;
}
