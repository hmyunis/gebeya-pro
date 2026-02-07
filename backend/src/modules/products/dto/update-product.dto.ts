import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) =>
    value === undefined ? value : Number.parseFloat(value),
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @Transform(({ value }) =>
    value === undefined ? value : Number.parseInt(value, 10),
  )
  @IsNumber()
  @IsOptional()
  stock?: number;

  @Transform(({ value }) =>
    value === undefined ? value : Number.parseInt(value, 10),
  )
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @Transform(({ value }) =>
    value === undefined ||
    value === null ||
    String(value).trim() === '' ||
    String(value).trim().toLowerCase() === 'null'
      ? null
      : Number.parseInt(String(value), 10),
  )
  @IsNumber()
  @IsOptional()
  merchantId?: number | null;

  @Transform(({ value }) =>
    value === undefined ||
    value === null ||
    String(value).trim() === '' ||
    String(value).trim().toLowerCase() === 'null'
      ? null
      : Number.parseInt(String(value), 10),
  )
  @IsNumber()
  @IsOptional()
  bankAccountId?: number | null;

  @Transform(({ value }) => {
    if (value === undefined) return value;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
