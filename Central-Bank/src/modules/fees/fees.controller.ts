import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/public.decorator';
import { MoneyService } from '../money/money.service';
import { FeeQuoteDto } from './dto';
import { FeeQuoteService } from './fee-quote.service';

@Controller('fees')
export class FeeQuoteController {
  constructor(
    private readonly feeQuote: FeeQuoteService,
    private readonly money: MoneyService,
  ) {}

  @Public()
  @Post('quote')
  async quote(@Body() dto: FeeQuoteDto) {
    const quote = await this.feeQuote.quote({
      sourceApp: dto.source_app,
      amount: this.money.parse(dto.amount),
    });
    return {
      gross_amount: quote.grossAmount,
      fee_total: quote.feeTotal,
      tax_total: quote.taxTotal,
      total_debit: quote.totalDebit,
      components: quote.components.map((item) => ({
        type: item.type,
        amount: item.amount,
        destination_account_id: item.destinationAccountId,
      })),
    };
  }
}
