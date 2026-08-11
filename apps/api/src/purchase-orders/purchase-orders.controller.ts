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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.purchaseOrdersService.list({ status, vendorId, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.purchaseOrdersService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      description: string;
      amount?: number;
      taxAmount?: number;
      total?: number;
      currency?: string;
      status?: string;
      dueDate?: string;
      notes?: string;
      vendorId?: string;
      partnerLabId?: string;
      projectId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      description: string;
      amount: number;
      taxAmount: number;
      total: number;
      status: string;
      dueDate: string | null;
      billedAt: string | null;
      notes: string | null;
      vendorId: string | null;
      partnerLabId: string | null;
      projectId: string | null;
    }>,
  ) {
    return this.purchaseOrdersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(id);
  }
}
