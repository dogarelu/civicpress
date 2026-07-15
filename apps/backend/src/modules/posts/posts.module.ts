import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LayoutModule } from '../layout/layout.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PillsModule } from '../pills/pills.module';

@Module({
  imports: [PrismaModule, LayoutModule, NotificationsModule, PillsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
