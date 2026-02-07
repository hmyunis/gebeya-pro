import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry).trim())
          .filter((entry) => entry.length > 0);
      }
    } catch {
      return trimmed
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }
  }

  return [];
}

export class CreateMerchantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNumber: string;

  @Transform(({ value }) => normalizeStringList(value))
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemTypes: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  address: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  loginUsername?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telegramId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramUsername?: string;
}
