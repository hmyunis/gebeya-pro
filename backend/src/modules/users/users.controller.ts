import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
