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
import { SamplesService } from './samples.service';

@Controller('samples')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.samplesService.list({ status, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.samplesService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      projectId: string;
      trackingNumber?: string;
      carrier?: string;
      status?: string;
      partnerLabId?: string;
      dispatchedAt?: string;
      receivedAt?: string;
      notes?: string;
    },
  ) {
    return this.samplesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      trackingNumber?: string | null;
      carrier?: string | null;
      status?: string;
      partnerLabId?: string | null;
      dispatchedAt?: string | null;
      receivedAt?: string | null;
      notes?: string | null;
    },
  ) {
    return this.samplesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.samplesService.remove(id);
  }
}
