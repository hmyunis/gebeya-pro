import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { type FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async login(
    @Body() telegramData: TelegramLoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, token } = await this.authService.validateAndLogin(telegramData);

    // Set HttpOnly Cookie
    res.setCookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in prod
      sameSite: 'lax', // Needed for cross-site auth flows usually
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return { user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie('jwt');
    return { message: 'Logged out' };
  }

  // Test Endpoint to verify Auth is working
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }
}