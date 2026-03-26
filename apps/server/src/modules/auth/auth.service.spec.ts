import {
  ConflictException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RedisService } from '../redis/redis.service';
import { DeviceEntity } from '../users/entities/device.entity';
import { UserEntity } from '../users/entities/user.entity';

import { AuthService } from './auth.service';
import { SmsService } from './sms.service';
import { TwoFactorService } from './two-factor.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  remove: jest.fn(),
  delete: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: ReturnType<typeof mockRepository>;
  let deviceRepository: ReturnType<typeof mockRepository>;
  let redisService: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let smsService: { sendOtp: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(DeviceEntity), useFactory: mockRepository },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(() => Promise.resolve('test-token')) },
        },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        { provide: TwoFactorService, useValue: { validateCode: jest.fn() } },
        { provide: SmsService, useValue: { sendOtp: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    deviceRepository = module.get(getRepositoryToken(DeviceEntity));
    redisService = module.get(RedisService);
    smsService = module.get(SmsService);
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({
        id: 'user-1',
        phone: '+380501234567',
        displayName: 'Test User',
        phoneVerified: true,
        avatarUrl: null,
        bio: null,
        isOnline: false,
        lastSeenAt: null,
        totpEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register('+380501234567', 'Test User');

      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(deviceRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('displayName', 'Test User');
    });

    it('should throw ConflictException if phone already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing', phone: '+380501234567' });

      await expect(service.register('+380501234567', 'Test')).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should generate OTP and send SMS', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-1', phone: '+380501234567' });
      redisService.get.mockResolvedValue(null);

      const result = await service.login('+380501234567', 'iPhone', 'ios');

      expect(redisService.set).toHaveBeenCalled();
      expect(smsService.sendOtp).toHaveBeenCalled();
      expect(result).toHaveProperty('tempToken');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login('+380000000000', 'iPhone', 'ios')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw TOO_MANY_REQUESTS if OTP already sent', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user-1', phone: '+380501234567' });
      redisService.get.mockResolvedValue('existing-otp');

      await expect(service.login('+380501234567', 'iPhone', 'ios')).rejects.toThrow(HttpException);
    });
  });

  describe('verify', () => {
    const phone = '+380501234567';
    const otpCode = '123456';
    const tempToken = 'valid-temp-token';

    it('should verify OTP and return tokens', async () => {
      redisService.get
        .mockResolvedValueOnce(phone)
        .mockResolvedValueOnce(
          JSON.stringify({ code: otpCode, deviceName: 'iPhone', platform: 'ios' }),
        );
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        phone,
        totpEnabled: false,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      deviceRepository.findOne.mockResolvedValue(null);

      const result = await service.verify(phone, otpCode, tempToken);

      expect(redisService.del).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException for invalid temp token', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.verify(phone, otpCode, 'invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      redisService.get.mockResolvedValueOnce(phone).mockResolvedValueOnce(null);

      await expect(service.verify(phone, otpCode, tempToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong OTP code', async () => {
      redisService.get
        .mockResolvedValueOnce(phone)
        .mockResolvedValueOnce(
          JSON.stringify({ code: '999999', deviceName: 'iPhone', platform: 'ios' }),
        );

      await expect(service.verify(phone, otpCode, tempToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return requires2FA if TOTP enabled', async () => {
      redisService.get
        .mockResolvedValueOnce(phone)
        .mockResolvedValueOnce(
          JSON.stringify({ code: otpCode, deviceName: 'iPhone', platform: 'ios' }),
        );
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        phone,
        totpEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.verify(phone, otpCode, tempToken);

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).toHaveProperty('tempToken');
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      deviceRepository.findOne.mockResolvedValue({
        id: 'device-1',
        userId: 'user-1',
        refreshTokenHash: 'hash',
        lastActiveAt: new Date(),
        ipAddress: null,
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refreshTokenHash on device', async () => {
      const device = { id: 'device-1', refreshTokenHash: 'hash' };
      deviceRepository.findOne.mockResolvedValue(device);

      await service.logout('user-1', 'device-1');

      expect(deviceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenHash: null }),
      );
    });

    it('should do nothing if device not found', async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await service.logout('user-1', 'nonexistent');

      expect(deviceRepository.save).not.toHaveBeenCalled();
    });
  });
});
