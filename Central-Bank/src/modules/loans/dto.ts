import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApplyLoanDto {
  @IsNotEmpty()
  amount!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class RepayLoanDto {
  @IsNotEmpty()
  amount!: string;
}
