import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class ManagerUserActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  reasonCode?: string;
}

export class ManagerLoanActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  loanId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  reasonCode?: string;
}
