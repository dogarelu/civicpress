import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SignalService } from './signal.service';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, SignalService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
