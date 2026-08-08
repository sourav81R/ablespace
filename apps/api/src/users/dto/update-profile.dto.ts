import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Editable profile fields.
 *
 * `email`, `isAnonymous` and `provider` are intentionally not editable — they
 * come from the verified Firebase token, and letting a client change them would
 * let it rewrite its own identity.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Display name cannot be empty' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username may only contain letters, numbers, dots, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  username?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'avatarUrl must be a valid URL' })
  @MaxLength(2000)
  avatarUrl?: string;
}
