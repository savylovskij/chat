import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto, RefreshTokenDto, RegisterDto, Verify2faDto } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { AuthService } from './auth.service';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { Verify2faWithTokenDto } from './dto/verify-2fa-with-token.dto';
import { VerifyOtpWithTokenDto } from './dto/verify-otp-with-token.dto';
import { TwoFactorService } from './two-factor.service';

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto.phone, dto.displayName);
    return { data: result };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login — sends OTP and returns tempToken' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.phone, dto.deviceName, dto.platform);
    return { data: result };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP code' })
  async verify(@Body() dto: VerifyOtpWithTokenDto) {
    const result = await this.authService.verify(dto.phone, dto.code, dto.tempToken);
    return { data: result };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT tokens' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return { data: result };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — invalidate refresh token' })
  async logout(@CurrentUser() user: Record<'userId' | 'deviceId', string>) {
    await this.authService.logout(user.userId, user.deviceId);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enable 2FA — returns QR code' })
  async enable2fa(@CurrentUser() user: { userId: string }) {
    const result = await this.twoFactorService.enable(user.userId);
    return { data: result };
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm 2FA setup with first code' })
  async confirm2fa(@CurrentUser() user: { userId: string }, @Body() dto: Verify2faDto) {
    const result = await this.twoFactorService.confirm(user.userId, dto.code);
    return { data: result };
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA code during login' })
  async verify2fa(@Body() dto: Verify2faWithTokenDto) {
    const result = await this.authService.verify2fa(dto.tempToken, dto.code);
    return { data: result };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2fa(@CurrentUser() user: { userId: string }, @Body() dto: Disable2faDto) {
    await this.twoFactorService.disable(user.userId, dto.code);
  }
}
