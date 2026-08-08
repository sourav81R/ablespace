import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/types/error-codes';

/** Firebase error codes we translate into specific client-facing responses. */
const FIREBASE_TOKEN_EXPIRED = 'auth/id-token-expired';
const FIREBASE_TOKEN_REVOKED = 'auth/id-token-revoked';

/**
 * Wraps the Firebase Admin SDK.
 *
 * This is the only place in the application that talks to Firebase. Everything
 * downstream deals in verified UIDs, never in raw tokens.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const isConfigured = this.config.get<boolean>('firebase.isConfigured');

    if (!isConfigured) {
      // Deliberately a warning, not a crash: the API should still boot so that
      // /health and local schema work function. Protected routes will reject
      // every request until credentials are supplied.
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 is not set — authenticated routes will reject all requests.',
      );
      return;
    }

    this.app = this.initialiseApp();
    this.logger.log('Firebase Admin SDK initialised');
  }

  /** True when the SDK is ready to verify tokens. */
  get isConfigured(): boolean {
    return this.app !== null;
  }

  /**
   * Verifies a Firebase ID token and returns its decoded claims.
   *
   * `checkRevoked` is intentionally left off: it costs a network round-trip to
   * Firebase on every request, and for this application signing out on the
   * client is sufficient. Short token lifetimes (1 hour) bound the exposure.
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.app) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Authentication is not configured on this server',
        503,
      );
    }

    try {
      return await getAuth(this.app).verifyIdToken(idToken);
    } catch (error) {
      throw this.translateVerificationError(error);
    }
  }

  private initialiseApp(): App {
    const base64 = this.config.getOrThrow<string>('firebase.serviceAccountBase64');
    const serviceAccount = this.decodeServiceAccount(base64);

    // Reuse an existing named app if one survived a hot reload in watch mode.
    const existing = getApps().find((app) => app.name === 'ablespace-admin');
    if (existing) {
      void deleteApp(existing).catch(() => undefined);
    }

    return initializeApp(
      {
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
        projectId: serviceAccount.project_id,
      },
      'ablespace-admin',
    );
  }

  /**
   * Decodes the base64 service-account JSON.
   *
   * Base64 is used because the PEM private key contains newlines, which most
   * hosting providers' environment-variable editors corrupt.
   */
  private decodeServiceAccount(base64: string): ServiceAccountJson {
    let parsed: unknown;

    try {
      parsed = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64-encoded JSON. ' +
          'Re-encode the service account file downloaded from the Firebase console.',
      );
    }

    if (!this.isServiceAccountJson(parsed)) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 is missing required fields ' +
          '(project_id, client_email, private_key).',
      );
    }

    const configuredProjectId = this.config.get<string>('firebase.projectId');
    if (configuredProjectId && configuredProjectId !== parsed.project_id) {
      throw new Error(
        `FIREBASE_PROJECT_ID ("${configuredProjectId}") does not match the service ` +
          `account project ("${parsed.project_id}").`,
      );
    }

    return parsed;
  }

  private isServiceAccountJson(value: unknown): value is ServiceAccountJson {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.project_id === 'string' &&
      typeof candidate.client_email === 'string' &&
      typeof candidate.private_key === 'string'
    );
  }

  private translateVerificationError(error: unknown): AppException {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    if (code === FIREBASE_TOKEN_EXPIRED || code === FIREBASE_TOKEN_REVOKED) {
      // The client SDK can refresh and retry, so this is distinguishable from a
      // token that was never valid.
      return AppException.unauthenticated(
        'Your session has expired. Please sign in again.',
        ErrorCode.TOKEN_EXPIRED,
      );
    }

    this.logger.warn(`Token verification failed: ${code || 'unknown error'}`);
    return AppException.unauthenticated('Invalid authentication token', ErrorCode.TOKEN_INVALID);
  }
}

/** The subset of the service-account file we actually need. */
interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}
