import { Controller, Get } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { Public } from '../../common/public.decorator';

@Controller('v1')
export class ExchangeRatesController {
  constructor(private exchangeRates: ExchangeRatesService) {}

  @Public()
  @Get('exchange-rates')
  getRates() {
    return this.exchangeRates.getRates();
  }
}
