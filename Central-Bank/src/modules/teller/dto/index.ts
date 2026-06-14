import { IsString, IsNotEmpty, Matches, IsOptional, MaxLength } from 'class-validator';

export class TellerActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'Amount must be a numeric string' })
  @MaxLength(30)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  reasonCode?: string;
}

export class KycActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  reasonCode?: string;
}
