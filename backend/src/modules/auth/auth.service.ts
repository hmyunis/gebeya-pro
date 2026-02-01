import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { TelegramLoginDto } from './dto/telegram-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateAndLogin(data: TelegramLoginDto) {
    // 1. Verify Request Integrity
    this.verifyTelegramSignature(data);

    // 2. Find or Create User
    // We explicitly cast telegramId to string to match Entity definition
    let user = await this.userRepository.findOne({ where: { telegramId: data.id.toString() } });

    if (!user) {
      user = this.userRepository.create({
        telegramId: data.id.toString(),
        firstName: data.first_name,
        username: data.username,
        avatarUrl: data.photo_url,
        role: UserRole.CUSTOMER, // Default role
      });
    } else {
      // Update info in case they changed it on Telegram
      user.firstName = data.first_name;
      user.username = data.username ?? '';
      user.avatarUrl = data.photo_url ?? '';
    }

    await this.userRepository.save(user);

    if (user.isBanned) {
      throw new UnauthorizedException('User is banned');
    }

    // 3. Generate JWT
    const payload = { sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return { user, token };
  }

  private verifyTelegramSignature(data: TelegramLoginDto) {
    const BOT_TOKEN = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    
    // Check for replay attacks (5 min expiration)
    const now = Math.floor(Date.now() / 1000);
    if (now - data.auth_date > 300) {
      throw new UnauthorizedException('Login session expired. Please try again.');
    }

    // Create the Check String
    // Logic: Sort keys, remove 'hash', join with \n
    const checkString = Object.keys(data)
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');

    // Create Secret Key (SHA256 of Bot Token)
    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();

    // Create HMAC
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    // Compare
    if (hmac !== data.hash) {
      throw new UnauthorizedException('Invalid Telegram hash');
    }
  }
}