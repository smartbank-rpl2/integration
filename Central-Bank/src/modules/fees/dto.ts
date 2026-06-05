import { IsIn, IsNotEmpty } from 'class-validator';

export class FeeQuoteDto {
  @IsIn(['TRANSFER', 'MARKETPLACE', 'POS', 'SUPPLIER', 'LOGISTICS'])
  source_app!: string;

  @IsNotEmpty()
  amount!: string;
}
