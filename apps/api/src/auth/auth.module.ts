import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Workspace, WorkspaceSchema } from '../workspaces/schemas/workspace.schema';
import {
  WorkspaceMember,
  WorkspaceMemberSchema,
} from '../workspaces/schemas/workspace-member.schema';
import { LabelsModule } from '../labels/labels.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

/**
 * Global because the guard is registered application-wide in AppModule and
 * therefore needs its dependencies resolvable from the root injector.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: WorkspaceMember.name, schema: WorkspaceMemberSchema },
    ]),
    LabelsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, FirebaseService, FirebaseAuthGuard],
  exports: [AuthService, FirebaseService, FirebaseAuthGuard, MongooseModule],
})
export class AuthModule {}
