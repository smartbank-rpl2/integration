import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ManagerUserActionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}

export class ManagerLoanActionDto {
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}
