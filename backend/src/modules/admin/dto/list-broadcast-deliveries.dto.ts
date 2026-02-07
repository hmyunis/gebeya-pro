import { IsEnum, IsOptional } from 'class-validator';

export enum BroadcastDeliveryFilter {
  ALL = 'ALL',
  SENT = 'SENT',
  NOT_SENT = 'NOT_SENT',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
  PENDING = 'PENDING',
}

export class ListBroadcastDeliveriesDto {
  @IsOptional()
  @IsEnum(BroadcastDeliveryFilter)
  status?: BroadcastDeliveryFilter;
}
