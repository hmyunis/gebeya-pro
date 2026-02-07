import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum CustomerAccountStateFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  ARCHIVED = 'ARCHIVED',
}

export enum CustomerOrderActivityFilter {
  ALL = 'ALL',
  NO_ORDERS = 'NO_ORDERS',
  HAS_PENDING = 'HAS_PENDING',
  HAS_APPROVED = 'HAS_APPROVED',
  HAS_SHIPPED = 'HAS_SHIPPED',
  HAS_REJECTED = 'HAS_REJECTED',
  HAS_CANCELLED = 'HAS_CANCELLED',
}

export enum CustomerListSortBy {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  MOST_ORDERS = 'MOST_ORDERS',
  HIGHEST_SPEND = 'HIGHEST_SPEND',
  LAST_ORDER = 'LAST_ORDER',
}

export class ListAdminCustomersDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(CustomerAccountStateFilter)
  accountState?: CustomerAccountStateFilter;

  @IsOptional()
  @IsEnum(CustomerAccountStateFilter)
  status?: CustomerAccountStateFilter;

  @IsOptional()
  @IsEnum(CustomerOrderActivityFilter)
  orderActivity?: CustomerOrderActivityFilter;

  @IsOptional()
  @IsEnum(CustomerListSortBy)
  sortBy?: CustomerListSortBy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
