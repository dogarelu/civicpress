import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { SignalService } from './signal.service';
import { Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly adminUrl: string;

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private signal: SignalService,
    private config: ConfigService,
  ) {
    this.adminUrl = this.config.get<string>('ADMIN_URL') || 'http://localhost:4300/admin';
  }

  /**
   * Notifies opted-in editors and admins that an author has submitted a post for review.
   * All sends are fire-and-forget — delivery failures never affect the HTTP response.
   */
  notifyPostSubmitted(params: {
    postId: string;
    title: string;
    actorId: string;
    actorName: string;
  }): void {
    this.dispatchPostSubmitted(params).catch((err: unknown) => {
      this.logger.error(`notifyPostSubmitted failed unexpectedly: ${(err as Error).message}`);
    });
  }

  private async dispatchPostSubmitted(params: {
    postId: string;
    title: string;
    actorId: string;
    actorName: string;
  }): Promise<void> {
    const { postId, title, actorId, actorName } = params;

    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.EDITOR, Role.CHIEF_EDITOR, Role.ADMIN] },
        id: { not: actorId },
        OR: [{ notifyReviewEmail: true }, { notifyReviewSignal: true }],
      },
      select: {
        id: true,
        displayName: true,
        notificationEmail: true,
        signalNumber: true,
        notifyReviewEmail: true,
        notifyReviewSignal: true,
      },
    });

    if (recipients.length === 0) {
      this.logger.debug(`No opted-in recipients for post ${postId}`);
      return;
    }

    const link = `${this.adminUrl}/posts/${postId}/edit`;
    const message = `Articol nou spre revizie: «${title}» — trimis de ${actorName}. ${link}`;
    const subject = `Articol nou spre revizie: «${title}»`;

    const sends: Promise<void>[] = [];

    for (const recipient of recipients) {
      if (recipient.notifyReviewEmail && recipient.notificationEmail) {
        sends.push(
          this.email.sendText({ to: recipient.notificationEmail, subject, text: message }),
        );
      }
      if (recipient.notifyReviewSignal && recipient.signalNumber) {
        sends.push(this.signal.sendText(recipient.signalNumber, message));
      }
    }

    await Promise.allSettled(sends);
  }
}
