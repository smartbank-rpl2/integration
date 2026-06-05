import { IsDateString, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePaymentRequestDto {
  @IsIn(['MARKETPLACE', 'POS', 'SUPPLIER', 'LOGISTICS'])
  source_app!: string;

  @IsNotEmpty()
  payer_wallet_id!: string;

  @IsNotEmpty()
  payee_wallet_id!: string;

  @IsNotEmpty()
  gross_amount!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsDateString()
  expires_at!: string;
}
