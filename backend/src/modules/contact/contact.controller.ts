import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ThrottlerBehindProxyGuard } from '../../common/guards/throttler-behind-proxy.guard';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { MarkContactMessageReadDto } from './dto/mark-contact-message-read.dto';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Public endpoint: rate limited per IP to 10/hour
  @UseGuards(ThrottlerBehindProxyGuard)
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post()
  async create(@Body() dto: CreateContactMessageDto) {
    return this.contactService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin')
  async listAdmin() {
    return this.contactService.listAdmin();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/read')
  async setReadAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() dto: MarkContactMessageReadDto,
  ) {
    return this.contactService.setReadAdmin(id, dto.isRead, req.user.userId);
  }
}

