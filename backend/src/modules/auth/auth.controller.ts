import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { type FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { MeResponseDto } from './dto/me-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('telegram')
  async login(
    @Body() telegramData: TelegramLoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, token } =
      await this.authService.validateAndLogin(telegramData);

    const cookieSameSite =
      (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') ?? 'lax';
    const cookieSecure =
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    // Set HttpOnly Cookie
    res.setCookie('jwt', token, {
      httpOnly: true,
      secure: cookieSecure, // Must be true when sameSite is 'none'
      sameSite: cookieSameSite, // Use 'none' for cross-site auth
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
  async getProfile(@Req() req): Promise<MeResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: req.user.userId },
    });
    if (!user) {
      return { userId: req.user.userId, role: req.user.role };
    }
    return {
      userId: user.id,
      role: user.role,
      firstName: user.firstName,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };
  }
}
