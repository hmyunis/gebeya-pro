import { IsBoolean } from 'class-validator';

export class SetCustomerBanStatusDto {
  @IsBoolean()
  banned: boolean;
}
