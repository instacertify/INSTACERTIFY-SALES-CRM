import { Module } from '@nestjs/common';
import { WorkLibraryController } from './work-library.controller';
import { WorkLibraryService } from './work-library.service';

@Module({
  controllers: [WorkLibraryController],
  providers: [WorkLibraryService],
  exports: [WorkLibraryService],
})
export class WorkLibraryModule {}
