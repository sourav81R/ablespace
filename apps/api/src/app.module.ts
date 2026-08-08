import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { loadConfiguration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { SubtasksModule } from './subtasks/subtasks.module';
import { CommentsModule } from './comments/comments.module';
import { LabelsModule } from './labels/labels.module';
import { ActivityModule } from './activity/activity.module';
import { HealthModule } from './health/health.module';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfiguration],
      // Validated at boot by loadConfiguration, so a bad environment fails
      // immediately rather than on the first request that needs the value.
      cache: true,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('throttle.ttlSeconds') * 1000,
          limit: config.getOrThrow<number>('throttle.limit'),
        },
      ],
    }),

    DatabaseModule,

    // Feature modules.
    AuthModule,
    UsersModule,
    WorkspacesModule,
    LabelsModule,
    ProjectsModule,
    TasksModule,
    SubtasksModule,
    CommentsModule,
    ActivityModule,
    HealthModule,
  ],
  providers: [
    // Rate limiting runs first so an unauthenticated flood is rejected before
    // it reaches Firebase token verification.
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Registered globally: every route is authenticated unless it opts out with
    // @Public(). Forgetting the decorator leaves a route protected, which is the
    // safe direction to fail.
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },

    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
