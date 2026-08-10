import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /** Employee search: lab scope + purchase/sales testing prices */
  @Get('testing')
  searchTesting(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('labId') labId?: string,
    @Query('active') active?: string,
  ) {
    return this.catalogService.searchTesting({ q, category, labId, active });
  }

  @Post('testing')
  @Roles('ADMIN', 'SALES_OPS')
  createTesting(
    @Body()
    body: {
      name: string;
      category?: string;
      scope?: string;
      standardCode?: string;
      purchasePrice?: number;
      salesPrice?: number;
      turnaroundDays?: number;
      partnerLabId?: string;
      notes?: string;
    },
  ) {
    return this.catalogService.createTestingItem(body);
  }

  @Patch('testing/:id')
  @Roles('ADMIN', 'SALES_OPS')
  updateTesting(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      category: string;
      scope: string;
      standardCode: string | null;
      purchasePrice: number;
      salesPrice: number;
      turnaroundDays: number;
      partnerLabId: string | null;
      notes: string | null;
      active: boolean;
    }>,
  ) {
    return this.catalogService.updateTestingItem(id, body);
  }

  @Get('labs')
  searchLabs(@Query('q') q?: string, @Query('active') active?: string) {
    return this.catalogService.searchLabs({ q, active });
  }

  @Post('labs')
  @Roles('ADMIN', 'SALES_OPS')
  upsertLab(
    @Body()
    body: {
      id?: string;
      name: string;
      scope?: string;
      country?: string;
      city?: string;
      email?: string;
      phone?: string;
      nabl?: boolean;
      accreditation?: string;
      notes?: string;
      active?: boolean;
    },
  ) {
    return this.catalogService.upsertLab(body);
  }

  @Get('services')
  listServices() {
    return this.catalogService.listServices();
  }

  @Post('services')
  @Roles('ADMIN')
  createService(
    @Body()
    body: {
      name: string;
      serviceType?: string;
      description?: string;
      checklist?: Array<{
        name: string;
        description?: string;
        required?: boolean;
      }>;
    },
  ) {
    return this.catalogService.createService(body);
  }
}
