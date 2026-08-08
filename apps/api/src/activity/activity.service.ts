import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityDto, ActivityMetadata, ActivityType } from '@ablespace/shared';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { serialiseActivity } from '../common/serializers/entity.serializer';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';
import { buildPaginationMeta, skipFor } from '../common/dto/pagination.dto';

/** One entry to append to a task's history. */
export interface ActivityEvent {
  taskId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId | null;
  type: ActivityType;
  metadata?: ActivityMetadata;
}

/**
 * Append-only task history.
 *
 * Deliberately exposes no update or delete path: an audit trail that can be
 * rewritten is not an audit trail.
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(@InjectModel(Activity.name) private readonly activityModel: Model<Activity>) {}

  /**
   * Records one or more events.
   *
   * Failures are logged and swallowed on purpose: history is valuable but
   * secondary, and a logging problem must never roll back or fail the user's
   * actual mutation. The alternative — a failed audit write returning 500 after
   * the task was already updated — is strictly worse for the user.
   */
  async record(events: ActivityEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    try {
      await this.activityModel.insertMany(
        events.map((event) => ({ ...event, metadata: event.metadata ?? {} })),
        { ordered: false },
      );
    } catch (error) {
      this.logger.error(
        `Failed to record ${events.length} activity event(s)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** The activity feed for one task, newest first. */
  async findForTask(
    taskId: Types.ObjectId,
    workspaceId: Types.ObjectId,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ActivityDto>> {
    const filter = { taskId, workspaceId };

    const [entries, total] = await Promise.all([
      // Untyped populate: the serialiser detects at runtime whether a reference
      // was populated, and the typed generic would fight that union.
      this.activityModel
        .find(filter)
        .populate('actorId')
        .sort({ createdAt: -1 })
        .skip(skipFor(page, limit))
        .limit(limit)
        .exec() as Promise<ActivityDocument[]>,
      this.activityModel.countDocuments(filter).exec(),
    ]);

    return new PaginatedResult(
      entries.map(serialiseActivity),
      buildPaginationMeta(page, limit, total),
    );
  }

  /** Removes history for a deleted task, so we do not accumulate orphans. */
  async deleteForTask(taskId: Types.ObjectId): Promise<void> {
    await this.activityModel.deleteMany({ taskId }).exec();
  }
}
