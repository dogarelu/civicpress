import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from '../../common/public.decorator';

@Controller('v1/settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('public')
  getPublic() {
    return this.settings.getPublic();
  }
}
