import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'SALES_OPS', 'DELIVERY', 'FINANCE')
  list() {
    return this.usersService.list();
  }

  @Get('employees')
  @Roles('ADMIN', 'SALES_OPS', 'DELIVERY', 'FINANCE')
  employees() {
    return this.usersService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.usersService.get(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      role?: string;
      phone?: string;
      skills?: string;
      department?: string;
      title?: string;
    },
  ) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      role?: string;
      active?: boolean;
      phone?: string | null;
      skills?: string;
      password?: string;
      department?: string;
      title?: string;
    },
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
