import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReversalDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  original_transaction_id!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  reason_code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
