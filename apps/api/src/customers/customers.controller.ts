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
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Query('status') status?: string, @Query('search') search?: string) {
    return this.customersService.list({ status, search });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.customersService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      company: string;
      legalName?: string;
      email: string;
      phone?: string;
      country?: string;
      state?: string;
      city?: string;
      address?: string;
      gstin?: string;
      status?: string;
      notes?: string;
    },
  ) {
    return this.customersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      company?: string;
      legalName?: string | null;
      email?: string;
      phone?: string | null;
      country?: string;
      state?: string | null;
      city?: string | null;
      address?: string | null;
      gstin?: string | null;
      status?: string;
      notes?: string | null;
      lifetimeValue?: number;
    },
  ) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Get(':id/contacts')
  listContacts(@Param('id') id: string) {
    return this.customersService.listContacts(id);
  }

  @Post(':id/contacts')
  addContact(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      email?: string;
      phone?: string;
      title?: string;
      isPrimary?: boolean;
      notes?: string;
    },
  ) {
    return this.customersService.addContact(id, body);
  }

  @Patch(':id/contacts/:contactId')
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body()
    body: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      title?: string | null;
      isPrimary?: boolean;
      notes?: string | null;
    },
  ) {
    return this.customersService.updateContact(id, contactId, body);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.customersService.removeContact(id, contactId);
  }
}
