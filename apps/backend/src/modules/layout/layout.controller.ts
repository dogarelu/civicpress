import { Controller, Get } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { Public } from '../../common/public.decorator';

@Controller('v1/layout')
export class LayoutController {
  constructor(private layout: LayoutService) {}

  @Public()
  @Get('public')
  getPublic() {
    return this.layout.getPublic();
  }
}
