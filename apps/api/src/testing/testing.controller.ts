import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TestingService } from './testing.service';

@Controller('testing')
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  @Get('orders')
  listOrders(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.testingService.listOrders({ projectId, status });
  }

  @Post('orders')
  createOrder(
    @Body()
    body: {
      projectId: string;
      testName: string;
      partnerLabId?: string;
      purchasePrice?: number;
      salesPrice?: number;
      notes?: string;
    },
  ) {
    return this.testingService.createOrder(body);
  }

  @Patch('orders/:id')
  updateOrder(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      status: string;
      partnerLabId: string | null;
      purchasePrice: number;
      salesPrice: number;
      reportRef: string | null;
      notes: string | null;
    }>,
  ) {
    return this.testingService.updateOrder(id, body);
  }

  @Get('labs')
  listLabs(@Query('active') active?: string) {
    return this.testingService.listLabs({ active });
  }

  @Post('labs')
  createLab(
    @Body()
    body: {
      name: string;
      country?: string;
      email?: string;
      phone?: string;
      nabl?: boolean;
      notes?: string;
    },
  ) {
    return this.testingService.createLab(body);
  }
}
