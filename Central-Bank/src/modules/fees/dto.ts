import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class FeeQuoteDto {
  @IsIn(['TRANSFER', 'MARKETPLACE', 'POS', 'SUPPLIER', 'LOGISTICS'])
  source_app!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d+$/, { message: 'amount must be a numeric string' })
  amount!: string;
}
