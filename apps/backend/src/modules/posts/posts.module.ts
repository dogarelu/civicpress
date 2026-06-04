import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { HomepageModule } from '../homepage/homepage.module';

@Module({
  imports: [PrismaModule, HomepageModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
