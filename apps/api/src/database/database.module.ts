import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Owns the MongoDB connection.
 *
 * Connection settings are read from validated configuration, and lifecycle
 * events are logged so a deployment problem is obvious in the logs rather than
 * appearing as an unexplained hanging request.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('MongoDB');
        const uri = config.getOrThrow<string>('mongodbUri');

        return {
          uri,
          // Fail a request quickly if the cluster is unreachable rather than
          // letting the client hang for the driver's 30s default.
          serverSelectionTimeoutMS: 10_000,
          maxPoolSize: 10,
          retryWrites: true,
          // Indexes declared on the schemas are built at startup in
          // development. In production they are managed deliberately so a
          // deploy never triggers an unexpected index build.
          autoIndex: !config.get<boolean>('isProduction'),
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () =>
              logger.log(`Connected to database "${connection.name}"`),
            );
            connection.on('disconnected', () => logger.warn('Disconnected'));
            connection.on('error', (error: Error) =>
              logger.error(`Connection error: ${error.message}`),
            );
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
