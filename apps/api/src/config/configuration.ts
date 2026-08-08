import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export type NodeEnv = 'development' | 'production' | 'test';

/**
 * Schema for the process environment.
 *
 * Validated once at boot: a misconfigured deployment should fail immediately
 * and loudly rather than surfacing as a confusing runtime error on the first
 * request that happens to need the missing value.
 */
class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: NodeEnv = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsString()
  @IsNotEmpty({ message: 'MONGODB_URI is required' })
  MONGODB_URI: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000';

  /**
   * Optional so the API can boot for local schema work without Firebase
   * credentials. When absent, protected routes reject every request — see
   * FirebaseService.
   */
  @IsString()
  @IsOptional()
  FIREBASE_SERVICE_ACCOUNT_BASE64?: string;

  @IsString()
  @IsOptional()
  FIREBASE_PROJECT_ID?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS: number = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 120;
}

/** Strongly-typed configuration consumed via ConfigService. */
export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  apiPrefix: string;
  mongodbUri: string;
  corsOrigins: string[];
  firebase: {
    serviceAccountBase64?: string;
    projectId?: string;
    /** True when the Admin SDK has enough configuration to verify tokens. */
    isConfigured: boolean;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
  };
}

/**
 * Validates raw environment variables and projects them into {@link AppConfig}.
 *
 * Registered as the ConfigModule `load` function, so `configService.get('port')`
 * returns a typed, already-parsed value rather than a raw string.
 */
export function loadConfiguration(): AppConfig {
  const validated = plainToInstance(EnvironmentVariables, process.env, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .filter(Boolean)
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  const serviceAccountBase64 = validated.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();

  return {
    nodeEnv: validated.NODE_ENV,
    isProduction: validated.NODE_ENV === 'production',
    port: validated.PORT,
    apiPrefix: validated.API_PREFIX ?? 'api',
    mongodbUri: validated.MONGODB_URI,
    corsOrigins: (validated.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    firebase: {
      serviceAccountBase64: serviceAccountBase64 || undefined,
      projectId: validated.FIREBASE_PROJECT_ID?.trim() || undefined,
      isConfigured: Boolean(serviceAccountBase64),
    },
    throttle: {
      ttlSeconds: validated.THROTTLE_TTL_SECONDS,
      limit: validated.THROTTLE_LIMIT,
    },
  };
}
