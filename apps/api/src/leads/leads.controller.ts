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
import { LeadsService } from './leads.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.leadsService.list({ status, assignedToId, search });
  }

  @Get('sources')
  sources() {
    return this.leadsService.listSources();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.leadsService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      customerName: string;
      company: string;
      companySize?: string;
      email: string;
      phone: string;
      country: string;
      state?: string;
      product?: string;
      serviceName?: string;
      expectedValue?: number;
      expectedClose?: string;
      status?: string;
      followUpAt?: string;
      notes?: string;
      leadSourceId: string;
      assignedToId?: string;
      customerId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.createFromBody(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      customerName?: string;
      company?: string;
      companySize?: string;
      email?: string;
      phone?: string;
      country?: string;
      state?: string | null;
      product?: string | null;
      serviceName?: string | null;
      expectedValue?: number;
      expectedClose?: string | null;
      status?: string;
      followUpAt?: string | null;
      notes?: string | null;
      assignedToId?: string | null;
      customerId?: string | null;
      leadSourceId?: string;
    },
  ) {
    return this.leadsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
