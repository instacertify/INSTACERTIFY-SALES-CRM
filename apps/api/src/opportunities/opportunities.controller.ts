import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  list() {
    return this.opportunitiesService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.opportunitiesService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      customerId: string;
      leadId?: string;
      ownerId?: string;
      stage?: string;
      amount?: number;
      probability?: number;
      expectedClose?: string;
      serviceName?: string;
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunitiesService.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      stage: string;
      amount: number;
      probability: number;
      expectedClose: string | null;
      serviceName: string | null;
      notes: string | null;
      ownerId: string | null;
    }>,
  ) {
    return this.opportunitiesService.update(id, body);
  }
}
