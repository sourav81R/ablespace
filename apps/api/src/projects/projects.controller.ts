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
  Query,
} from '@nestjs/common';
import { ProjectDto } from '@ablespace/shared';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthContext } from '../common/types/request-context';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(
    @CurrentUser() auth: AuthContext,
    @Query() query: QueryProjectsDto,
  ): Promise<PaginatedResult<ProjectDto>> {
    return this.projectsService.findAll(auth.workspace._id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ProjectDto> {
    return this.projectsService.findOne(auth.workspace._id, id);
  }

  @Post()
  create(@CurrentUser() auth: AuthContext, @Body() dto: CreateProjectDto): Promise<ProjectDto> {
    return this.projectsService.create(auth.workspace._id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    return this.projectsService.update(auth.workspace._id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() auth: AuthContext,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<void> {
    return this.projectsService.remove(auth.workspace._id, id);
  }
}
