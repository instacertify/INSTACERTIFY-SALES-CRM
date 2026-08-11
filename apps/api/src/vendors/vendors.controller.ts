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
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  list(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    return this.vendorsService.list({ type, search, active });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.vendorsService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      type?: string;
      email?: string;
      phone?: string;
      country?: string;
      city?: string;
      gstin?: string;
      address?: string;
      notes?: string;
      partnerLabId?: string;
    },
  ) {
    return this.vendorsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      type: string;
      email: string | null;
      phone: string | null;
      country: string;
      city: string | null;
      gstin: string | null;
      address: string | null;
      notes: string | null;
      active: boolean;
      partnerLabId: string | null;
    }>,
  ) {
    return this.vendorsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }
}
