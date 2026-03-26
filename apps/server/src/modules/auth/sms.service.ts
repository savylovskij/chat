import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: Twilio.Twilio | null;
  private readonly fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';

    if (
      accountSid !== undefined &&
      accountSid !== '' &&
      authToken !== undefined &&
      authToken !== '' &&
      this.fromNumber !== ''
    ) {
      this.client = Twilio(accountSid, authToken);
    } else {
      this.client = null;
      this.logger.warn('Twilio credentials not configured — SMS will be logged to console only');
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const message = `Your Secure Messenger code: ${code}`;

    if (this.client === null) {
      this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
      return;
    }

    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phone,
      });

      this.logger.log(`OTP sent to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phone}`, error);
      throw error;
    }
  }
}
