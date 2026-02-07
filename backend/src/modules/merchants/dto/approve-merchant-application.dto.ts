import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveMerchantApplicationDto {
  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  reviewNote?: string;
}
