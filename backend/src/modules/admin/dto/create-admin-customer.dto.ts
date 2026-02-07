import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdminCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  firstName: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^@?[A-Za-z0-9][A-Za-z0-9_.-]*$/, {
    message:
      'loginUsername may start with "@", and contain only letters, numbers, ".", "_", or "-"',
  })
  loginUsername?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
