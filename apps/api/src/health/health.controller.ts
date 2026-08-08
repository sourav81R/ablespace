import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Liveness endpoint for the hosting platform and for verifying a deployment.
 *
 * Public by necessity — a platform health probe has no Firebase token — and it
 * deliberately reports only up/down, never configuration details.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    // Includes the database: an API that cannot reach MongoDB is not healthy,
    // even though the process is running.
    return this.health.check([() => this.mongoose.pingCheck('mongodb', { timeout: 3000 })]);
  }
}
