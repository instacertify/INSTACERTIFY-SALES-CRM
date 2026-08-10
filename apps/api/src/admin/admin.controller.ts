import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get('health')
  health() {
    return this.adminService.health();
  }

  @Get('seed-status')
  @Roles('ADMIN')
  seedStatus() {
    return this.adminService.seedStatus();
  }
}
