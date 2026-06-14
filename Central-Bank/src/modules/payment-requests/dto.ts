import { IsDateString, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePaymentRequestDto {
  @IsIn(['MARKETPLACE', 'POS', 'SUPPLIER', 'LOGISTICS'])
  source_app!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  payer_wallet_id!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  payee_wallet_id!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d+$/, { message: 'gross_amount must be a numeric string' })
  gross_amount!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsDateString()
  expires_at!: string;
}
