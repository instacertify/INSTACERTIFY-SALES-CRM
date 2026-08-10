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
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(
    @Query('projectId') projectId?: string,
    @Query('customerId') customerId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.documentsService.list({
      projectId,
      customerId,
      category,
      status,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.documentsService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      category?: string;
      originalName: string;
      storedName: string;
      mimeType?: string;
      size?: number;
      storageKey?: string;
      status?: string;
      notes?: string;
      projectId?: string;
      customerId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      status?: string;
      notes?: string | null;
      storageKey?: string | null;
    },
  ) {
    return this.documentsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
