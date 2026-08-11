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
import { CertificationService } from './certification.service';

@Controller('certification')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.certificationService.list({ status, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.certificationService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      projectId: string;
      certificateNo?: string;
      authority?: string;
      status?: string;
      issuedAt?: string;
      expiresAt?: string;
      renewalDate?: string;
      notes?: string;
    },
  ) {
    return this.certificationService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      certificateNo?: string | null;
      authority?: string | null;
      status?: string;
      issuedAt?: string | null;
      expiresAt?: string | null;
      renewalDate?: string | null;
      notes?: string | null;
    },
  ) {
    return this.certificationService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.certificationService.remove(id);
  }
}
