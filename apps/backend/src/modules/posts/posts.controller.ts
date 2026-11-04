import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { PostsService } from './posts.service';
import { LayoutService } from '../layout/layout.service';
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
    private layout: LayoutService,
  ) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  @Public()
  @Get('home')
  getHome() {
    return this.layout.getPublicHome();
  }

  @Public()
  @Get('most-read')
  getMostRead() {
    return this.posts.getMostRead();
  }

  @Public()
  @Get('search')
  search(@Query('q') q = '', @Query('page') page = '1', @Query('perPage') perPage = '15') {
    return this.posts.search({
      query: q,
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 15,
    });
  }

  @Public()
  @Get('posts/:slug')
  async getPost(@Param('slug') slug: string) {
    const post = await this.posts.getBySlug(slug);
    const layout = await this.layout.getArticleLayout(post.id);
    return {
      ...post,
      modules: layout.modules,
      sidebar: layout.sidebar,
      mobileModules: layout.mobileModules,
      articleLayoutMode: layout.articleLayoutMode,
      articleMainTypography: layout.articleMainTypography,
      articleMainShowSummary: layout.articleMainShowSummary,
      articleMainShowReadingTime: layout.articleMainShowReadingTime,
      articleMainSummaryRows: layout.articleMainSummaryRows,
      articleMainSummaryTypography: layout.articleMainSummaryTypography,
      articleMainBumbiTypography: layout.articleMainBumbiTypography,
      articleMainPhotoCaptionTypography: layout.articleMainPhotoCaptionTypography,
      mobileOrder: layout.mobileOrder,
    };
  }

  @Post('admin/posts/preview')
  previewPost(@Body() body: Record<string, unknown>, @CurrentUser() user: JwtPayload) {
    return this.posts.preview(body as Parameters<PostsService['preview']>[0], {
      sub: user.sub,
      role: user.role,
    });
  }

  @Public()
  @Get('preview/article/:token')
  getPreview(@Param('token') token: string) {
    return this.posts.getPreview(token);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  @Get('posts/trash')
  trashList(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
    @Query('search') search?: string,
  ) {
    return this.posts.trashList({
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      search,
      actor: { sub: user.sub, role: user.role },
    });
  }

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

  @Get('admin/posts/references')
  getArticleReferences(@Query('ids') ids = '') {
    return this.posts.getArticleReferences(ids.split(','));
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

  @Post('posts/from-video')
  createPostFromVideo(
    @Body() body: { title?: string; videoUrl?: string; categoryId?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posts.createFromVideo(
      {
        title: body.title ?? '',
        videoUrl: body.videoUrl ?? '',
        categoryId: body.categoryId ?? '',
      },
      { sub: user.sub, role: user.role },
    );
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
    body: {
      action: 'submit' | 'approve' | 'reject' | 'publish' | 'archive' | 'republish';
      message?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posts.transition(id, body.action, { sub: user.sub, role: user.role }, body.message);
  }

  @Post('posts/:id/restore')
  @HttpCode(200)
  restorePost(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.restore(id, { sub: user.sub, role: user.role });
  }

  @Delete('posts/:id/permanent')
  @HttpCode(200)
  permanentDeletePost(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.permanentDelete(id, { sub: user.sub, role: user.role });
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
