import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AdminOrderItemDto {
  @Type(() => Number)
  @IsNumber()
  productId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateAdminOrderDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminOrderItemDto)
  items: AdminOrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;
}
