import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { Subtask, SubtaskSchema } from '../subtasks/schemas/subtask.schema';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { UsersModule } from '../users/users.module';
import { LabelsModule } from '../labels/labels.module';
import { ProjectsModule } from '../projects/projects.module';
import { ActivityModule } from '../activity/activity.module';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      // Subtask and Comment models are used here for cascade deletion and for
      // counting children in a single aggregation.
      { name: Subtask.name, schema: SubtaskSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
    UsersModule,
    LabelsModule,
    ProjectsModule,
    ActivityModule,
    // TasksController mounts the nested subtask and comment routes, so it needs
    // both services.
    SubtasksModule,
    CommentsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
