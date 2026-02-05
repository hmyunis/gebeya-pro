import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { BankAccountStatus } from '../entities/bank-account.entity';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(512)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  accountNumber?: string;

  @IsOptional()
  @IsEnum(BankAccountStatus)
  status?: BankAccountStatus;
}
