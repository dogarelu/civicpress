import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SignalService {
  private readonly logger = new Logger(SignalService.name);
  private readonly apiUrl: string;
  private readonly senderNumber: string | null;

  constructor(private config: ConfigService) {
    this.apiUrl = this.config.get<string>('SIGNAL_API_URL') || 'http://localhost:8080';
    this.senderNumber = this.config.get<string>('SIGNAL_SENDER_NUMBER') || null;

    if (!this.senderNumber) {
      this.logger.warn('SIGNAL_SENDER_NUMBER is not set — Signal notifications are disabled');
    }
  }

  async sendText(recipient: string, message: string): Promise<void> {
    if (!this.senderNumber) {
      this.logger.warn(`Signal skipped (no sender number) → ${recipient}`);
      return;
    }

    try {
      const res = await fetch(`${this.apiUrl}/v2/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          number: this.senderNumber,
          recipients: [recipient],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      this.logger.log(`Signal sent → ${recipient}`);
    } catch (err) {
      this.logger.error(`Signal failed → ${recipient}: ${(err as Error).message}`);
    }
  }
}
