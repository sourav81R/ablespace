import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabelDto } from '@ablespace/shared';
import { Label, LabelDocument } from './schemas/label.schema';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { AppException } from '../common/exceptions/app.exception';
import { serialiseLabel } from '../common/serializers/entity.serializer';
import { escapeRegex } from '../common/utils/regex.util';

/** Starter labels created with every new workspace, so the UI is never empty. */
const DEFAULT_LABELS: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Design', color: '#8B5CF6' },
  { name: 'Development', color: '#3B82F6' },
  { name: 'Research', color: '#F59E0B' },
  { name: 'Bug', color: '#EF4444' },
  { name: 'Documentation', color: '#10B981' },
];

@Injectable()
export class LabelsService {
  constructor(@InjectModel(Label.name) private readonly labelModel: Model<Label>) {}

  async findAll(workspaceId: Types.ObjectId): Promise<LabelDto[]> {
    const labels = await this.labelModel.find({ workspaceId }).sort({ name: 1 }).exec();

    return labels.map(serialiseLabel);
  }

  async create(workspaceId: Types.ObjectId, dto: CreateLabelDto): Promise<LabelDto> {
    const existing = await this.labelModel.findOne({ workspaceId, name: dto.name }).exec();

    if (existing) {
      throw AppException.conflict(`A label named "${dto.name}" already exists`);
    }

    const label = await this.labelModel.create({
      workspaceId,
      name: dto.name,
      color: dto.color ?? '#64748B',
    });

    return serialiseLabel(label);
  }

  async update(
    workspaceId: Types.ObjectId,
    labelId: string,
    dto: UpdateLabelDto,
  ): Promise<LabelDto> {
    const label = await this.requireLabel(workspaceId, labelId);

    if (dto.name !== undefined && dto.name !== label.name) {
      const clash = await this.labelModel
        .findOne({ workspaceId, name: dto.name, _id: { $ne: label._id } })
        .exec();

      if (clash) {
        throw AppException.conflict(`A label named "${dto.name}" already exists`);
      }
      label.name = dto.name;
    }

    if (dto.color !== undefined) {
      label.color = dto.color;
    }

    await label.save();
    return serialiseLabel(label);
  }

  async remove(workspaceId: Types.ObjectId, labelId: string): Promise<void> {
    const label = await this.requireLabel(workspaceId, labelId);
    await this.labelModel.deleteOne({ _id: label._id }).exec();

    // Tasks referencing this label are cleaned up by TasksService via the
    // detachLabel hook so we never leave dangling ids behind.
  }

  /**
   * Loads a label, scoping the query by workspace.
   *
   * The workspace filter is part of the query rather than a follow-up check —
   * that way a cross-workspace read is impossible by construction, not by
   * remembering to write an `if`.
   */
  private async requireLabel(workspaceId: Types.ObjectId, labelId: string): Promise<LabelDocument> {
    const label = await this.labelModel.findOne({ _id: labelId, workspaceId }).exec();

    if (!label) {
      throw AppException.notFound('Label');
    }

    return label;
  }

  /** Resolves label names to ids, used by task search. */
  async findIdsByName(workspaceId: Types.ObjectId, search: string): Promise<Types.ObjectId[]> {
    const labels = await this.labelModel
      .find({ workspaceId, name: { $regex: escapeRegex(search), $options: 'i' } })
      .select('_id')
      .exec();

    return labels.map((label) => label._id);
  }

  /** Verifies every supplied label id belongs to this workspace. */
  async assertLabelsExist(
    workspaceId: Types.ObjectId,
    labelIds: string[],
  ): Promise<Types.ObjectId[]> {
    if (labelIds.length === 0) {
      return [];
    }

    const found = await this.labelModel
      .find({ workspaceId, _id: { $in: labelIds } })
      .select('_id')
      .exec();

    if (found.length !== new Set(labelIds).size) {
      throw AppException.badRequest('One or more labels do not exist in this workspace');
    }

    return found.map((label) => label._id);
  }

  /** Seeds the starter label set for a brand-new workspace. */
  async createDefaultLabels(workspaceId: Types.ObjectId): Promise<void> {
    await this.labelModel.insertMany(
      DEFAULT_LABELS.map((label) => ({ ...label, workspaceId })),
      { ordered: false },
    );
  }
}
