import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ApplyLoanDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d+$/, { message: 'amount must be a numeric string' })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;
}

export class RepayLoanDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d+$/, { message: 'amount must be a numeric string' })
  amount!: string;
}
