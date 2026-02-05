import { IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { IsEmailOrPhone } from '../../../common/validators/is-email-or-phone.validator';
import { NoHttpUrl } from '../../../common/validators/no-http-url.validator';

export class CreateContactMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/, { message: 'name must not be blank' })
  @NoHttpUrl()
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @IsEmailOrPhone()
  @NoHttpUrl()
  contact: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/, { message: 'message must not be blank' })
  @NoHttpUrl({
    message: 'message must not contain URLs starting with http',
  })
  message: string;
}
