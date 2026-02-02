import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  price: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  stock: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsOptional()
  categoryId?: number;
}
