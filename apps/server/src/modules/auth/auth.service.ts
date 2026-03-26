import { createHash, randomBytes, randomInt } from 'crypto';

import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { StringValue } from 'ms';
import { Repository } from 'typeorm';

import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';
import { DeviceEntity } from '../users/entities/device.entity';
import { UserEntity } from '../users/entities/user.entity';

import { SmsService } from './sms.service';
import { TwoFactorService } from './two-factor.service';

interface OtpData {
  code: string;
  deviceName: string;
  platform: string;
}

interface TwoFaData {
  userId: string;
  deviceName: string;
  platform: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly twoFactorService: TwoFactorService,
    private readonly smsService: SmsService,
  ) {}

  async register(phone: string, displayName: string) {
    const existing = await this.userRepository.findOne({
      where: { phone },
    });

    if (existing) {
      throw new ConflictException('User with this phone already exists');
    }

    const user = this.userRepository.create({
      phone,
      displayName,
      phoneVerified: true,
    });

    await this.userRepository.save(user);

    const device = this.deviceRepository.create({
      userId: user.id,
      deviceName: 'Primary device',
      platform: 'unknown',
    });
    await this.deviceRepository.save(device);

    const tokens = await this.generateTokens(user.id, device.id);
    device.refreshTokenHash = this.hashToken(tokens.refreshToken);
    await this.deviceRepository.save(device);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(phone: string, deviceName: string, platform: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingOtp = await this.redisService.get(`otp:${phone}`);
    if (existingOtp !== null) {
      throw new HttpException(
        'OTP already sent. Please wait before requesting a new one',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    const tempToken = randomBytes(32).toString('hex');

    const previousTempToken = await this.redisService.get(`login:${phone}`);
    if (previousTempToken !== null) {
      await this.redisService.del(`temp:${previousTempToken}`);
    }

    await this.redisService.set(
      `otp:${phone}`,
      JSON.stringify({ code: otp, deviceName, platform }),
      300,
    );
    await this.redisService.set(`temp:${tempToken}`, phone, 300);
    await this.redisService.set(`login:${phone}`, tempToken, 300);

    await this.smsService.sendOtp(phone, otp);

    return { tempToken };
  }

  async verify(phone: string, code: string, tempToken: string, ipAddress?: string) {
    const storedPhone = await this.redisService.get(`temp:${tempToken}`);
    if (storedPhone === null || storedPhone !== phone) {
      throw new UnauthorizedException('Invalid or expired temp token');
    }

    const otpData = await this.redisService.get(`otp:${phone}`);
    if (otpData === null) {
      throw new UnauthorizedException('OTP expired');
    }

    const parsed = JSON.parse(otpData) as OtpData;
    if (parsed.code !== code) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    await this.redisService.del(`otp:${phone}`);
    await this.redisService.del(`temp:${tempToken}`);

    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.totpEnabled) {
      const twoFaTempToken = randomBytes(32).toString('hex');
      await this.redisService.set(
        `2fa:${twoFaTempToken}`,
        JSON.stringify({
          userId: user.id,
          deviceName: parsed.deviceName,
          platform: parsed.platform,
        }),
        300,
      );
      return { requires2FA: true, tempToken: twoFaTempToken };
    }

    let device = await this.deviceRepository.findOne({
      where: {
        userId: user.id,
        platform: parsed.platform,
        deviceName: parsed.deviceName,
      },
    });

    if (!device) {
      device = this.deviceRepository.create({
        userId: user.id,
        platform: parsed.platform,
        deviceName: parsed.deviceName,
      });
      await this.deviceRepository.save(device);
    }

    const tokens = await this.generateTokens(user.id, device.id);
    device.refreshTokenHash = this.hashToken(tokens.refreshToken);
    device.lastActiveAt = new Date();
    device.ipAddress = ipAddress ?? null;
    await this.deviceRepository.save(device);

    user.phoneVerified = true;
    await this.userRepository.save(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string, ipAddress?: string) {
    const hash = this.hashToken(refreshToken);

    const device = await this.deviceRepository.findOne({
      where: { refreshTokenHash: hash },
      relations: ['user'],
    });

    if (!device) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(device.userId, device.id);
    device.refreshTokenHash = this.hashToken(tokens.refreshToken);
    device.lastActiveAt = new Date();
    device.ipAddress = ipAddress ?? device.ipAddress;
    await this.deviceRepository.save(device);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (device) {
      device.refreshTokenHash = null;
      await this.deviceRepository.save(device);
    }
  }

  async verify2fa(tempToken: string, code: string, ipAddress?: string) {
    const data = await this.redisService.get(`2fa:${tempToken}`);
    if (data === null) {
      throw new UnauthorizedException('Invalid or expired 2FA temp token');
    }

    const parsed = JSON.parse(data) as TwoFaData;
    const user = await this.userRepository.findOne({ where: { id: parsed.userId } });
    if (!user || user.totpSecret === null) {
      throw new UnauthorizedException('2FA not configured');
    }

    const isValid = await this.twoFactorService.validateCode(user, code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.redisService.del(`2fa:${tempToken}`);

    let device = await this.deviceRepository.findOne({
      where: {
        userId: parsed.userId,
        deviceName: parsed.deviceName,
        platform: parsed.platform,
      },
    });

    if (!device) {
      device = this.deviceRepository.create({
        userId: parsed.userId,
        deviceName: parsed.deviceName,
        platform: parsed.platform,
      });
      await this.deviceRepository.save(device);
    }

    const tokens = await this.generateTokens(parsed.userId, device.id);
    device.refreshTokenHash = this.hashToken(tokens.refreshToken);
    device.lastActiveAt = new Date();
    device.ipAddress = ipAddress ?? null;
    await this.deviceRepository.save(device);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private async generateTokens(userId: string, deviceId: string) {
    const payload: JwtPayload = { sub: userId, deviceId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRATION ?? '15m') as StringValue,
      }),

      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION ?? '30d') as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOtp(): string {
    return String(randomInt(100000, 999999));
  }

  private sanitizeUser(user: UserEntity) {
    return {
      id: user.id,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
