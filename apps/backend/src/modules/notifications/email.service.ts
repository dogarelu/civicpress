import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_SEND_URL = 'https://api.resend.com/emails';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY') || null;
    this.from = this.config.get<string>('MAIL_FROM') || 'Civicpress <noreply@civicpress.ro>';

    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY is not set — email notifications are disabled');
    }
  }

  async sendText(params: { to: string; subject: string; text: string }): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`Email skipped (no API key): ${params.subject} → ${params.to}`);
      return;
    }

    try {
      const res = await fetch(RESEND_SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [params.to],
          subject: params.subject,
          text: params.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Resend HTTP ${res.status}: ${body}`);
      }

      this.logger.log(`Email sent: ${params.subject} → ${params.to}`);
    } catch (err) {
      this.logger.error(`Email failed → ${params.to}: ${(err as Error).message}`);
    }
  }
}
