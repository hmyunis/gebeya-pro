import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { type FastifyRequest } from 'fastify';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarImageService } from './avatar-image.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarImageService: AvatarImageService,
  ) {}

  @Get('me')
  async me(@Req() req) {
    const user = await this.usersService.getMe(req.user.userId);
    return {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      avatarUrl: user.avatarUrl,
      loginUsername: user.loginUsername,
      telegramUsername: user.username,
      hasTelegram: Boolean(user.telegramId),
    };
  }

  @Patch('me')
  async updateMe(@Req() req, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateMe(req.user.userId, dto);
    return {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      avatarUrl: user.avatarUrl,
      loginUsername: user.loginUsername,
      telegramUsername: user.username,
      hasTelegram: Boolean(user.telegramId),
    };
  }

  @Post('me/avatar')
  async updateAvatar(@Req() req: FastifyRequest) {
    const avatar = await this.parseAvatarFile(req);
    const avatarUrl = await this.avatarImageService.optimizeAndSave(
      avatar.buffer,
    );
    const { user, previousAvatarUrl } = await this.usersService.updateAvatar(
      (req as any).user.userId,
      avatarUrl,
    );

    await this.avatarImageService.deleteAvatar(previousAvatarUrl);

    return {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      avatarUrl: user.avatarUrl,
      loginUsername: user.loginUsername,
      telegramUsername: user.username,
      hasTelegram: Boolean(user.telegramId),
    };
  }

  private async parseAvatarFile(
    req: FastifyRequest,
  ): Promise<{ buffer: Buffer; filename?: string }> {
    const contentType = String(req.headers['content-type'] ?? '');
    if (!contentType.includes('multipart/form-data')) {
      throw new BadRequestException('Expected multipart/form-data');
    }

    const parts = (req as any).parts?.();
    if (!parts) {
      throw new BadRequestException('Invalid multipart request');
    }

    let avatar: { buffer: Buffer; filename?: string } | undefined;
    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (part.fieldname === 'avatar' && buffer.length) {
          avatar = { buffer, filename: part.filename };
        }
      }
    }

    if (!avatar) {
      throw new BadRequestException('Avatar file is required');
    }

    return avatar;
  }
}
