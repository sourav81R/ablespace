import { PartialType } from '@nestjs/mapped-types';
import { CreateLabelDto } from './create-label.dto';

/** Every field of CreateLabelDto, all optional. */
export class UpdateLabelDto extends PartialType(CreateLabelDto) {}
