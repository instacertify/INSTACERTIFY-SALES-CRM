import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PortalsService } from './portals.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller()
export class PortalsController {
  constructor(private readonly portalsService: PortalsService) {}

  // Employee — document checklists
  @Get('document-requests')
  listDoc(
    @Query('customerId') customerId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.portalsService.listDocRequests({ customerId, projectId });
  }

  @Post('document-requests')
  createDoc(
    @Body()
    body: {
      title?: string;
      serviceOfferingId?: string;
      customerId?: string;
      projectId?: string;
      quotationId?: string;
      teamRemark?: string;
      itemNames?: string[];
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.portalsService.createDocRequest(body, user.id);
  }

  // Public customer checklist portal
  @Public()
  @Get('public/document-requests/:token')
  getDocPublic(@Param('token') token: string) {
    return this.portalsService.getDocRequestPublic(token);
  }

  @Public()
  @Post('public/document-requests/:token/items/:itemId')
  submitDocItem(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
    @Body()
    body: { customerNote?: string; fileName?: string; storedName?: string },
  ) {
    return this.portalsService.submitDocItem(token, itemId, body);
  }

  // Employee — test request forms
  @Get('test-requests')
  listTest(
    @Query('customerId') customerId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.portalsService.listTestRequests({ customerId, projectId });
  }

  @Post('test-requests')
  createTest(
    @Body()
    body: {
      customerId?: string;
      projectId?: string;
      quotationId?: string;
      testingOrderId?: string;
      testScope?: string;
      productName?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.portalsService.createTestRequest(body, user.id);
  }

  @Get('test-requests/:id/download')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async downloadTest(@Param('id') id: string, @Res() res: Response) {
    const pack = await this.portalsService.downloadTestRequest(id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${pack.filename}"`,
    );
    res.send(pack.content);
  }

  @Patch('test-requests/:id/sent-to-lab')
  markSent(@Param('id') id: string) {
    return this.portalsService.markSentToLab(id);
  }

  // Public customer test request portal
  @Public()
  @Get('public/test-requests/:token')
  getTestPublic(@Param('token') token: string) {
    return this.portalsService.getTestRequestPublic(token);
  }

  @Public()
  @Post('public/test-requests/:token')
  submitTest(
    @Param('token') token: string,
    @Body()
    body: {
      productName?: string;
      modelNumber?: string;
      brand?: string;
      manufacturer?: string;
      sampleQuantity?: string;
      standards?: string;
      testScope?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      additionalNotes?: string;
    },
  ) {
    return this.portalsService.submitTestRequest(token, body);
  }
}
