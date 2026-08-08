import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/types/error-codes';

/** Firebase error codes we translate into specific client-facing responses. */
const FIREBASE_TOKEN_EXPIRED = 'auth/id-token-expired';
const FIREBASE_TOKEN_REVOKED = 'auth/id-token-revoked';

/** Named so a watch-mode reload can find and replace its own previous instance. */
const APP_NAME = 'ablespace-admin';

/**
 * The Firebase Admin provider.
 *
 * This is the only place in the application that touches the Admin SDK or the
 * service-account credentials. Everything downstream deals in verified UIDs,
 * never in raw tokens or keys.
 *
 * These credentials are server-side secrets and must never be sent to the
 * browser. The web client authenticates with the separate Firebase *web*
 * config (apiKey, authDomain, …), which is public by design; the private key
 * held here can mint tokens for any user in the project, so it stays on the
 * server.
 */
@Injectable()
export class FirebaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('firebase.isConfigured')) {
      // A warning rather than a crash: the API should still boot so /health and
      // local schema work function. Authenticated routes reject every request
      // until credentials are supplied.
      this.logger.warn(
        'Firebase Admin is not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ' +
          'and FIREBASE_PRIVATE_KEY are all required) — authenticated routes will ' +
          'reject all requests.',
      );
      return;
    }

    this.app = this.initialiseApp();
    this.logger.log(
      `Firebase Admin initialised for project "${this.config.get<string>('firebase.projectId')}"`,
    );
  }

  /** Releases the SDK's HTTP connections so a redeploy shuts down cleanly. */
  async onModuleDestroy(): Promise<void> {
    if (this.app) {
      await deleteApp(this.app).catch(() => undefined);
      this.app = null;
    }
  }

  /** True when the SDK is ready to verify tokens. */
  get isConfigured(): boolean {
    return this.app !== null;
  }

  /**
   * Verifies a Firebase ID token and returns its decoded claims.
   *
   * `checkRevoked` is intentionally not enabled: it costs a network round-trip
   * to Firebase on every request, and client-side sign-out is sufficient here.
   * The one-hour token lifetime bounds the exposure.
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

  /**
   * Builds the Admin app from the three discrete credential variables.
   *
   * The private key has already been newline-normalised in the configuration
   * layer, so it can be handed to `cert()` as-is.
   */
  private initialiseApp(): App {
    const projectId = this.config.getOrThrow<string>('firebase.projectId');
    const clientEmail = this.config.getOrThrow<string>('firebase.clientEmail');
    const privateKey = this.config.getOrThrow<string>('firebase.privateKey');

    this.assertKeyLooksValid(privateKey);

    // Watch mode re-runs this without tearing down the process, and Firebase
    // throws on a duplicate app name — so retire any previous instance first.
    const existing = getApps().find((app) => app.name === APP_NAME);
    if (existing) {
      void deleteApp(existing).catch(() => undefined);
    }

    try {
      return initializeApp(
        { credential: cert({ projectId, clientEmail, privateKey }), projectId },
        APP_NAME,
      );
    } catch (error) {
      // Surface a message that names the likely cause, since the SDK's own
      // "Invalid PEM formatted message" gives no hint about what to fix.
      throw new Error(
        'Failed to initialise Firebase Admin. Check that FIREBASE_PRIVATE_KEY ' +
          'contains the full PEM block and that its newlines are written as \\n. ' +
          `Underlying error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Fails fast on a key that is obviously malformed.
   *
   * Without this the SDK accepts the value at startup and only fails on the
   * first verification attempt, which surfaces as a confusing 500 on a user's
   * login rather than an obvious boot error.
   */
  private assertKeyLooksValid(privateKey: string): void {
    if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
      throw new Error(
        'FIREBASE_PRIVATE_KEY does not look like a PEM block. It must include the ' +
          '"-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" lines.',
      );
    }

    // After normalisation a real key is many lines. A single line means the \n
    // sequences were not converted — the most common misconfiguration.
    if (!privateKey.includes('\n')) {
      throw new Error(
        'FIREBASE_PRIVATE_KEY contains no line breaks after normalisation. ' +
          'Ensure the value uses \\n escape sequences between PEM lines.',
      );
    }
  }

  private translateVerificationError(error: unknown): AppException {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    if (code === FIREBASE_TOKEN_EXPIRED || code === FIREBASE_TOKEN_REVOKED) {
      // Distinguished from an invalid token so the client can refresh and retry
      // silently instead of forcing the user back to the login screen.
      return AppException.unauthenticated(
        'Your session has expired. Please sign in again.',
        ErrorCode.TOKEN_EXPIRED,
      );
    }

    this.logger.warn(`Token verification failed: ${code || 'unknown error'}`);
    return AppException.unauthenticated('Invalid authentication token', ErrorCode.TOKEN_INVALID);
  }
}
