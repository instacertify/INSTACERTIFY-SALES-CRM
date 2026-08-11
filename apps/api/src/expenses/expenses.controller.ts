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
import { ExpensesService } from './expenses.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('projectId') projectId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.expensesService.list({
      status,
      category,
      projectId,
      customerId,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.expensesService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      category?: string;
      amount?: number;
      currency?: string;
      status?: string;
      spentAt?: string;
      reference?: string;
      notes?: string;
      vendorId?: string;
      customerId?: string;
      projectId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.expensesService.create(body, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      category: string;
      amount: number;
      status: string;
      spentAt: string;
      reference: string | null;
      notes: string | null;
      vendorId: string | null;
      customerId: string | null;
      projectId: string | null;
    }>,
  ) {
    return this.expensesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
