import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

/**
 * All CreateTaskDto fields, optional.
 *
 * Moving a card between board columns is just `{ "status": "DOING" }` through
 * this DTO — the board does not need a dedicated endpoint.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
