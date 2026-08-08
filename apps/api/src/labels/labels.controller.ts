import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { LabelDto } from '@ablespace/shared';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

/** Controllers stay thin: resolve the workspace, delegate, return. */
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  findAll(@CurrentUser() auth: AuthContext): Promise<LabelDto[]> {
    return this.labelsService.findAll(auth.workspace._id);
  }

  @Post()
  create(@CurrentUser() auth: AuthContext, @Body() dto: CreateLabelDto): Promise<LabelDto> {
    return this.labelsService.create(auth.workspace._id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateLabelDto,
  ): Promise<LabelDto> {
    return this.labelsService.update(auth.workspace._id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<void> {
    return this.labelsService.remove(auth.workspace._id, id);
  }
}
