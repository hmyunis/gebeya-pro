import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
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

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return undefined;
  const next = String(value).trim();
  if (!next) return null;
  return next;
}

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @Transform(({ value }) => normalizeStringList(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemTypes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  @MaxLength(32)
  telegramId?: string | null;

  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramUsername?: string | null;
}
