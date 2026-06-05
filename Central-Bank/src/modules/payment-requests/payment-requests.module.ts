import { Module } from '@nestjs/common';
import { FeesModule } from '../fees/fees.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { MoneyModule } from '../money/money.module';
import { SettlementModule } from '../settlement/settlement.module';
import { PaymentRequestService } from './payment-request.service';
import { PaymentRequestsController } from './payment-requests.controller';

@Module({
  imports: [FeesModule, IdempotencyModule, MoneyModule, SettlementModule],
  controllers: [PaymentRequestsController],
  providers: [PaymentRequestService],
  exports: [PaymentRequestService],
})
export class PaymentRequestsModule {}
