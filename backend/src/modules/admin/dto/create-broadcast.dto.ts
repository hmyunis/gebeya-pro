import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  BroadcastKind,
  BroadcastTarget,
} from '../entities/broadcast-run.entity';
import { UserRole } from '../../users/entities/user.entity';

export class CreateBroadcastDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsEnum(BroadcastKind)
  kind?: BroadcastKind;

  @IsOptional()
  @IsEnum(BroadcastTarget)
  target?: BroadcastTarget;

  @ValidateIf((dto: CreateBroadcastDto) => dto.target === BroadcastTarget.ROLE)
  @IsEnum(UserRole)
  role?: UserRole;

  @ValidateIf((dto: CreateBroadcastDto) => dto.target === BroadcastTarget.USERS)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5000)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds?: number[];
}
