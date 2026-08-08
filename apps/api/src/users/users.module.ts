import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * The User and WorkspaceMember models are registered by the global AuthModule,
 * which re-exports MongooseModule — so they are injectable here without being
 * registered twice.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
