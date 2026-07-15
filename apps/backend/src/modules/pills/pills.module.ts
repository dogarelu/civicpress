import { Module } from '@nestjs/common';
import { PillsController } from './pills.controller';
import { PillsService } from './pills.service';

@Module({
  controllers: [PillsController],
  providers: [PillsService],
  exports: [PillsService],
})
export class PillsModule {}
