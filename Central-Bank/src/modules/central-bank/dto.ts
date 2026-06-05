import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReversalDto {
  @IsNotEmpty()
  original_transaction_id!: string;

  @IsNotEmpty()
  reason_code!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
