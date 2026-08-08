import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subtask, SubtaskSchema } from './schemas/subtask.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { SubtasksService } from './subtasks.service';
import { SubtasksController } from './subtasks.controller';
import { UsersModule } from '../users/users.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subtask.name, schema: SubtaskSchema },
      // Needed to verify the parent task's workspace before touching children.
      { name: Task.name, schema: TaskSchema },
    ]),
    UsersModule,
    ActivityModule,
  ],
  controllers: [SubtasksController],
  providers: [SubtasksService],
  // TasksModule mounts the nested create/list routes.
  exports: [SubtasksService],
})
export class SubtasksModule {}
