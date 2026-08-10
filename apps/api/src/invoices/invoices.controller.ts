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
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles('ADMIN', 'FINANCE', 'SALES_OPS')
  list(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.invoicesService.list({ status, customerId, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.invoicesService.get(id);
  }

  @Post()
  @Roles('ADMIN', 'FINANCE', 'SALES_OPS')
  create(
    @Body()
    body: {
      customerId: string;
      projectId?: string;
      quotationId?: string;
      status?: string;
      currency?: string;
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      dueDate?: string;
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoicesService.create(body, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'FINANCE')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      dueDate?: string | null;
      issuedAt?: string | null;
      notes?: string | null;
    },
  ) {
    return this.invoicesService.update(id, body);
  }

  @Post(':id/payments')
  @Roles('ADMIN', 'FINANCE')
  addPayment(
    @Param('id') id: string,
    @Body()
    body: {
      amount: number;
      method?: string;
      reference?: string;
      receivedAt?: string;
      notes?: string;
    },
  ) {
    return this.invoicesService.addPayment(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'FINANCE')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
