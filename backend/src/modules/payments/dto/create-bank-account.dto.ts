import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { BankAccountStatus } from '../entities/bank-account.entity';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(512)
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  accountNumber: string;

  @IsOptional()
  @IsEnum(BankAccountStatus)
  status?: BankAccountStatus;
}
