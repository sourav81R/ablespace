import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

/** Alert before the process approaches a typical container memory limit. */
const HEAP_LIMIT_BYTES = 300 * 1024 * 1024;

/**
 * Liveness and readiness endpoint for the hosting platform, and the quickest
 * way to confirm a deployment is actually working.
 *
 * Public by necessity — a platform health probe carries no Firebase token —
 * which is also why it reports only status and uptime, never configuration
 * values, connection strings or credentials.
 */
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // An API that cannot reach MongoDB is not healthy, even though the
      // process is running — so a failed ping fails the whole check.
      () => this.mongoose.pingCheck('database', { timeout: 3000 }),

      () => this.memory.checkHeap('memory', HEAP_LIMIT_BYTES),

      // Reported rather than checked: these never fail the probe, they just
      // make a misconfigured deployment obvious at a glance.
      () => this.apiInfo(),
    ]);
  }

  /**
   * Non-failing API metadata.
   *
   * `auth` surfaces whether Firebase credentials are configured, which is the
   * single most common deployment mistake — without it the API boots fine and
   * then rejects every authenticated request with a 503.
   */
  private async apiInfo(): Promise<HealthIndicatorResult> {
    return {
      api: {
        status: 'up',
        environment: this.config.get<string>('nodeEnv') ?? 'unknown',
        uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
        auth: this.config.get<boolean>('firebase.isConfigured') ? 'configured' : 'not-configured',
      },
    };
  }
}
