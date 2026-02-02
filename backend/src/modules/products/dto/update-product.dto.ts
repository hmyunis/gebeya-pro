import {
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
  @Min(0)
  @IsOptional()
  stock?: number;

  @Transform(({ value }) =>
    value === undefined ? value : Number.parseInt(value, 10),
  )
  @IsNumber()
  @IsOptional()
  categoryId?: number;
}
