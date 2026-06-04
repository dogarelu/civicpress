import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { PostsService } from './posts.service';
import { HomepageService } from '../homepage/homepage.service';
import { Public } from '../../common/public.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { Role, PostStatus } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Controller('v1')
export class PostsController {
  constructor(
    private posts: PostsService,
    private homepage: HomepageService,
  ) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  @Public()
  @Get('home')
  getHome() {
    return this.homepage.getPublicHome();
  }

  @Public()
  @Get('posts/:slug')
  getPost(@Param('slug') slug: string) {
    return this.posts.getBySlug(slug);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  @Get('posts')
  adminList(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
    @Query('status') status?: PostStatus,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
  ) {
    return this.posts.adminList({
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      status,
      authorId,
      search,
      actor: { sub: user.sub, role: user.role },
    });
  }

  @Get('admin/posts/:id')
  getPostAdmin(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.getByIdAdmin(id, { sub: user.sub, role: user.role });
  }

  @Post('posts')
  createPost(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.posts.create(body as Parameters<PostsService['create']>[0], {
      sub: user.sub,
      role: user.role,
    });
  }

  @Patch('posts/:id')
  updatePost(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posts.update(id, body as Parameters<PostsService['update']>[1], {
      sub: user.sub,
      role: user.role,
    });
  }

  @Post('posts/:id/transition')
  @HttpCode(200)
  transition(
    @Param('id') id: string,
    @Body()
    body: { action: 'submit' | 'approve' | 'reject' | 'publish' | 'archive'; message?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posts.transition(id, body.action, { sub: user.sub, role: user.role }, body.message);
  }

  @Delete('posts/:id')
  @HttpCode(200)
  deletePost(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.delete(id, { sub: user.sub, role: user.role });
  }

  @Get('posts/:id/revisions')
  getRevisions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.getRevisions(id, { sub: user.sub, role: user.role });
  }
}
