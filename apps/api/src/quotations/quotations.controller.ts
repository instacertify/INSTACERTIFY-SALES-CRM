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
import { QuotationsService } from './quotations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.quotationsService.list({ status, customerId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.quotationsService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      customerName: string;
      company: string;
      email: string;
      phone: string;
      country: string;
      state?: string;
      serviceName: string;
      description: string;
      validityDate: string;
      consultingPrice?: number;
      testingPrice?: number;
      otherCommercials?: number;
      otherCommercialsNote?: string;
      governmentFees?: number;
      bodyHtml?: string;
      bankSnapshot?: string;
      leadId?: string;
      customerId?: string;
      opportunityId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotationsService.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      customerName?: string;
      company?: string;
      email?: string;
      phone?: string;
      country?: string;
      state?: string | null;
      serviceName?: string;
      description?: string;
      validityDate?: string;
      consultingPrice?: number;
      testingPrice?: number;
      otherCommercials?: number;
      otherCommercialsNote?: string | null;
      governmentFees?: number;
      bodyHtml?: string;
      bankSnapshot?: string;
      customerRemark?: string | null;
      revisionMessage?: string | null;
    },
  ) {
    return this.quotationsService.update(id, body);
  }

  @Patch(':id/share')
  share(@Param('id') id: string) {
    return this.quotationsService.share(id);
  }

  @Patch(':id/revision')
  revision(
    @Param('id') id: string,
    @Body() body: { message?: string },
  ) {
    return this.quotationsService.requestRevision(
      id,
      body.message || 'Customer requested revision',
    );
  }

  @Patch(':id/revised')
  revised(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.quotationsService.markRevised(id, body.note);
  }

  @Patch(':id/testing-opted')
  testingOpted(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.quotationsService.optTesting(id, body.note);
  }

  @Post(':id/line-items')
  addLine(
    @Param('id') id: string,
    @Body()
    body: {
      kind?: string;
      title: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      purchasePrice?: number;
      catalogItemId?: string;
    },
  ) {
    return this.quotationsService.addLineItem(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}
