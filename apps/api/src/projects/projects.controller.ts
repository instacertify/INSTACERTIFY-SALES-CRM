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
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('ownerId') ownerId?: string,
    @Query('owner') owner?: string,
    @Query('waitingFor') waitingFor?: string,
    @Query('search') search?: string,
  ) {
    return this.projectsService.list({
      status,
      ownerId: ownerId ?? owner,
      waitingFor,
      search,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.projectsService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      status?: string;
      serviceName?: string;
      serviceType?: string;
      projectValue?: number;
      consultingFees?: number;
      governmentFees?: number;
      testingFees?: number;
      customerName: string;
      company: string;
      email: string;
      phone?: string;
      country?: string;
      state?: string;
      scopeSummary?: string;
      waitingFor?: string;
      waitingNote?: string;
      waitingExpectedOn?: string;
      customerId?: string;
      leadId?: string;
      quotationId?: string;
      commercialOwnerId?: string;
      deliveryOwnerId?: string;
      startDate?: string;
      expectedCompletion?: string;
    },
  ) {
    return this.projectsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      status?: string;
      serviceName?: string | null;
      serviceType?: string | null;
      projectValue?: number;
      consultingFees?: number;
      governmentFees?: number;
      testingFees?: number;
      paymentStatus?: string;
      commercialOwnerId?: string | null;
      deliveryOwnerId?: string | null;
      waitingFor?: string | null;
      waitingNote?: string | null;
      waitingExpectedOn?: string | null;
      scopeSummary?: string | null;
      startDate?: string | null;
      expectedCompletion?: string | null;
      renewalDate?: string | null;
      customerName?: string;
      company?: string;
      email?: string;
      phone?: string | null;
      country?: string | null;
      state?: string | null;
    },
  ) {
    return this.projectsService.update(id, body);
  }

  @Post(':id/remarks')
  addRemark(
    @Param('id') id: string,
    @Body() body: { stage?: string; remark: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.addRemark(id, body, user.id);
  }

  @Post(':id/tasks')
  addTask(
    @Param('id') id: string,
    @Body()
    body: {
      title: string;
      status?: string;
      waitingFor?: string;
      waitingExpectedOn?: string;
      waitingNote?: string;
      dueDate?: string;
      sequence?: number;
      notes?: string;
      assignedToId?: string;
    },
  ) {
    return this.projectsService.addTask(id, body);
  }

  @Post(':id/products')
  addProduct(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      modelNumber?: string;
      brand?: string;
      hsCode?: string;
      description?: string;
      quantity?: number;
    },
  ) {
    return this.projectsService.addProduct(id, body);
  }

  @Post(':id/manufacturers')
  addManufacturer(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      country?: string;
      address?: string;
      email?: string;
      phone?: string;
      notes?: string;
    },
  ) {
    return this.projectsService.addManufacturer(id, body);
  }

  @Post(':id/applicants')
  addApplicant(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      type?: string;
      email?: string;
      phone?: string;
      address?: string;
      gstin?: string;
      notes?: string;
    },
  ) {
    return this.projectsService.addApplicant(id, body);
  }

  @Post(':id/standards')
  addStandard(
    @Param('id') id: string,
    @Body()
    body: {
      code: string;
      name: string;
      authority?: string;
      description?: string;
    },
  ) {
    return this.projectsService.addStandard(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
