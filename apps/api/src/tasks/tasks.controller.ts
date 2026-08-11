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
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.list({ status, assignedToId, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tasksService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      projectId: string;
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
    return this.tasksService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      status?: string;
      waitingFor?: string | null;
      waitingExpectedOn?: string | null;
      waitingNote?: string | null;
      dueDate?: string | null;
      sequence?: number;
      notes?: string | null;
      assignedToId?: string | null;
    },
  ) {
    return this.tasksService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
