import { IsBoolean } from 'class-validator';

export class MarkContactMessageReadDto {
  @IsBoolean()
  isRead: boolean;
}
