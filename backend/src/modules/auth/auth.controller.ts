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
import { PasswordLoginDto } from './dto/password-login.dto';
import { PasswordRegisterDto } from './dto/password-register.dto';
import { SetPasswordDto } from './dto/set-password.dto';
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

    return { user, token };
  }

  @Post('password')
  async loginWithPassword(
    @Body() dto: PasswordLoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, token } = await this.authService.loginWithPassword(dto);

    const cookieSameSite =
      (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') ?? 'lax';
    const cookieSecure =
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    res.setCookie('jwt', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { user, token };
  }

  @Post('register/password')
  async registerWithPassword(
    @Body() dto: PasswordRegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, token } = await this.authService.registerWithPassword(dto);

    const cookieSameSite =
      (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') ?? 'lax';
    const cookieSecure =
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    res.setCookie('jwt', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { user, token };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('password/set')
  async setPassword(@Req() req, @Body() dto: SetPasswordDto) {
    return this.authService.setPasswordForUser(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('telegram/link')
  async linkTelegram(@Req() req, @Body() telegramData: TelegramLoginDto) {
    return this.authService.linkTelegramToUser(req.user.userId, telegramData);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    const cookieSameSite =
      (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') ?? 'lax';
    const cookieSecure =
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
    });
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
      loginUsername: user.loginUsername,
      hasTelegram: Boolean(user.telegramId),
    };
  }
}
