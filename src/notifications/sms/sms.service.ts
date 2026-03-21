import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type TwilioSDK from 'twilio/lib/index';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: TwilioSDK.Twilio;

  constructor(private readonly config: ConfigService) {
    this.client = twilio(
      config.get<string>('TWILIO_ACCOUNT_SID'),
      config.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendOtp(to: string, code: string): Promise<void> {
    await this.client.messages.create({
      body: `Your verification code is: ${code}. Valid for 10 minutes.`,
      from: this.config.get<string>('TWILIO_PHONE_NUMBER'),
      to,
    });
    this.logger.log(`OTP SMS sent to ${to}`);
  }
}
