import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class ListBroadcastUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
