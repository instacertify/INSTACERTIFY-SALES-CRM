import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WorkLibraryService } from './work-library.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('work-library')
export class WorkLibraryController {
  constructor(private readonly workLibraryService: WorkLibraryService) {}

  @Get()
  list(
    @Query('customerId') customerId?: string,
    @Query('projectId') projectId?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.workLibraryService.list({ customerId, projectId, category, q });
  }

  @Post()
  create(
    @Body()
    body: {
      customerId: string;
      projectId?: string;
      title: string;
      category?: string;
      summary: string;
      status?: string;
      effortHours?: number;
      valueAmount?: number;
      happenedAt?: string;
      linkUrl?: string;
      tags?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.workLibraryService.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      category: string;
      summary: string;
      status: string;
      effortHours: number;
      valueAmount: number;
      happenedAt: string;
      linkUrl: string | null;
      tags: string;
      projectId: string | null;
    }>,
  ) {
    return this.workLibraryService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workLibraryService.remove(id);
  }
}
