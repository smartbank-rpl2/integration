import { IsString, IsNotEmpty } from 'class-validator';

export class ManagerUserActionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class ManagerLoanActionDto {
  @IsString()
  @IsNotEmpty()
  loanId: string;
}
