import { Module } from '@nestjs/common';
import { MoneyModule } from '../money/money.module';
import { FeeQuoteController } from './fees.controller';
import { FeeQuoteService } from './fee-quote.service';

@Module({
  imports: [MoneyModule],
  controllers: [FeeQuoteController],
  providers: [FeeQuoteService],
  exports: [FeeQuoteService],
})
export class FeesModule {}
