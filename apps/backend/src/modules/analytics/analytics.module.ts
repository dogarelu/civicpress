import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { UtmPresetsController } from './utm-presets.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, UtmPresetsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
