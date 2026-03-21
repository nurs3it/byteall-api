import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio = require('twilio');

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: twilio.Twilio;

  constructor(private readonly config: ConfigService) {
    this.client = twilio(
      config.get<string>('TWILIO_ACCOUNT_SID'),
      config.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendOtp(to: string, code: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: `Your verification code is: ${code}. Valid for 10 minutes.`,
        from: this.config.get<string>('TWILIO_PHONE_NUMBER'),
        to,
      });
      this.logger.log(`OTP SMS sent to ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send OTP SMS to ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new Error('SMS delivery failed');
    }
  }
}
