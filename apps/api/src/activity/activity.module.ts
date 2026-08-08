import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { ActivityService } from './activity.service';

/**
 * No controller: the activity feed is exposed as a nested route on tasks
 * (`GET /tasks/:taskId/activity`) so it can reuse the parent task's
 * authorization check.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Activity.name, schema: ActivitySchema }])],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
