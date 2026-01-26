import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean;

  constructor(private config: ConfigService) {
    this.enabled = this.config.get<boolean>('email.enabled');
    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST') || process.env.SMTP_HOST,
        port: parseInt(this.config.get<string>('SMTP_PORT') || process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: this.config.get<string>('SMTP_USER') || process.env.SMTP_USER,
          pass: this.config.get<string>('SMTP_PASS') || process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    if (!this.enabled || !this.transporter) {
      this.logger.log(`Email disabled - skipping send to ${to}. Subject: ${subject}`);
      this.logger.debug(`Preview - text: ${text}`);
      return;
    }

    const from = this.config.get<string>('email.from') || process.env.EMAIL_FROM;

    await this.transporter.sendMail({ from, to, subject, text, html });
  }
}
