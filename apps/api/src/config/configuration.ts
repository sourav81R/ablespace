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

  /**
   * Allowed browser origin(s). A comma-separated list is accepted so a
   * deployment can permit, say, a production domain and a preview domain.
   *
   * Deliberately has no default: an unset value means no origin is allowed
   * rather than every origin. See loadConfiguration.
   */
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // ---------------------------------------------------------------------------
  // Firebase Admin credentials.
  //
  // These are the three fields the Admin SDK needs from the service-account
  // JSON. They are server-side secrets and must never reach the browser — the
  // web client uses the separate, public Firebase web config instead.
  //
  // All three are optional so the API can still boot for local schema work
  // without them. When they are absent, authenticated routes reject every
  // request rather than failing silently — see FirebaseService.
  // ---------------------------------------------------------------------------

  @IsString()
  @IsOptional()
  FIREBASE_PROJECT_ID?: string;

  @IsString()
  @IsOptional()
  FIREBASE_CLIENT_EMAIL?: string;

  /**
   * The PEM private key.
   *
   * Most hosting providers cannot store a literal newline in an environment
   * variable, so the key is normally pasted with the newlines escaped as the
   * two characters `\` and `n`. {@link normalisePrivateKey} converts those back
   * before the key reaches the SDK.
   */
  @IsString()
  @IsOptional()
  FIREBASE_PRIVATE_KEY?: string;

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
    projectId?: string;
    clientEmail?: string;
    /** Already newline-normalised and ready to hand to the Admin SDK. */
    privateKey?: string;
    /** True only when all three credential fields are present. */
    isConfigured: boolean;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
  };
}

/**
 * Restores real newlines in a PEM private key read from an environment
 * variable.
 *
 * A service-account private key is a multi-line PEM block, but most hosting
 * providers (Render, Railway, Vercel, Docker `--env`) cannot store a literal
 * newline in an environment variable. The key is therefore pasted with its
 * newlines escaped as the two characters `\` and `n`, and must be converted
 * back before the SDK will parse it. Skipping this step produces the classic
 * `Failed to parse private key: Invalid PEM formatted message` at startup.
 *
 * Three input shapes are handled:
 *  - escaped newlines (`\n` as two characters) — the common case;
 *  - real newlines — when the platform does support them;
 *  - a key wrapped in quotes, which some dashboards add on paste.
 */
export function normalisePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip a single layer of surrounding quotes if the value was pasted as
  // "-----BEGIN...-----\n..." rather than bare.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // The substitution that matters: two-character \n sequences become real
  // newlines. Keys that already contain real newlines are unaffected.
  key = key.replace(/\\n/g, '\n');

  // Some editors convert to CRLF; the PEM parser expects LF.
  key = key.replace(/\r\n/g, '\n');

  // OpenSSL requires the final newline after the footer.
  if (!key.endsWith('\n')) {
    key += '\n';
  }

  return key;
}

/**
 * Resolves the CORS allowlist.
 *
 * Two rules:
 *
 *  - A wildcard is rejected outright in production. `*` would let any site
 *    script the API on a signed-in user's behalf, and the assessment's own
 *    brief forbids unrestricted production CORS. Failing the boot is the right
 *    response — a deployment that cannot be reached is safer than one that
 *    anyone can reach.
 *  - An unset value means *no* origin is allowed, not every origin. Outside
 *    production it falls back to localhost so development just works.
 */
export function resolveCorsOrigins(raw: string | undefined, nodeEnv: NodeEnv): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isProduction = nodeEnv === 'production';

  if (isProduction && origins.includes('*')) {
    throw new Error(
      'CORS_ORIGIN cannot be "*" in production. List the exact origins allowed ' +
        'to call this API, comma-separated.',
    );
  }

  if (origins.length === 0) {
    if (isProduction) {
      throw new Error(
        'CORS_ORIGIN is required in production. Set it to the deployed web ' +
          "application's origin, e.g. https://your-app.vercel.app",
      );
    }
    return ['http://localhost:3000'];
  }

  return origins;
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

  const projectId = validated.FIREBASE_PROJECT_ID?.trim() || undefined;
  const clientEmail = validated.FIREBASE_CLIENT_EMAIL?.trim() || undefined;
  const rawPrivateKey = validated.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? normalisePrivateKey(rawPrivateKey) : undefined;

  return {
    nodeEnv: validated.NODE_ENV,
    isProduction: validated.NODE_ENV === 'production',
    port: validated.PORT,
    apiPrefix: validated.API_PREFIX ?? 'api',
    mongodbUri: validated.MONGODB_URI,
    corsOrigins: resolveCorsOrigins(validated.CORS_ORIGIN, validated.NODE_ENV),
    firebase: {
      projectId,
      clientEmail,
      privateKey,
      // All three are required together — a partial credential set cannot
      // verify a token, so it counts as unconfigured rather than half-working.
      isConfigured: Boolean(projectId && clientEmail && privateKey),
    },
    throttle: {
      ttlSeconds: validated.THROTTLE_TTL_SECONDS,
      limit: validated.THROTTLE_LIMIT,
    },
  };
}
