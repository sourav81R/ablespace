import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Nest's own logger, with debug output suppressed in production.
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('port');
  const apiPrefix = config.getOrThrow<string>('apiPrefix');
  const corsOrigins = config.getOrThrow<string[]>('corsOrigins');
  const isProduction = config.getOrThrow<boolean>('isProduction');

  app.setGlobalPrefix(apiPrefix);

  app.use(helmet());

  // Explicit origin allowlist rather than a wildcard (PRD §23).
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties with no matching DTO decorator...
      whitelist: true,
      // ...and reject the request outright if any were sent. This is what makes
      // "the client cannot supply workspaceId or reporterId" enforceable rather
      // than merely conventional.
      forbidNonWhitelisted: true,
      // Enables @Type() conversion so query strings become numbers/dates.
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // Never echo the rejected value back — it may contain sensitive input.
      validationError: { target: false, value: false },
    }),
  );

  // Ensures Mongo connections close cleanly on SIGTERM during a redeploy.
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.log(`API listening on port ${port} (prefix: /${apiPrefix})`);
  logger.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  logger.log(`CORS origins: ${corsOrigins.join(', ') || '(none configured)'}`);
}

bootstrap().catch((error) => {
  // A boot failure must be loud and must exit non-zero so the platform knows
  // the deploy failed rather than leaving a half-started process running.
  new Logger('Bootstrap').error(
    `Failed to start API: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
