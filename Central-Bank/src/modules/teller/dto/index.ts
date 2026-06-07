import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class TellerActionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'Amount must be a numeric string' })
  amount: string;
}

export class KycActionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
