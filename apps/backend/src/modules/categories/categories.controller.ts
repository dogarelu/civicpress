import { Controller, Get, Post, Patch, Delete, Put, Param, Query, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/public.decorator';
import { Roles } from '../../common/roles.decorator';
import { Role } from '@prisma/client';
import type { CategoryCreate, CategoryUpdate } from '@civicpress/shared';

@Controller('v1')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  // ─── Public routes ─────────────────────────────────────────────────────────

  @Public()
  @Get('menu')
  getMenu() {
    return this.categories.getMenu();
  }

  @Public()
  @Get('categories/:slug')
  getCategory(
    @Param('slug') slug: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '15',
  ) {
    return this.categories.getBySlug(slug, parseInt(page, 10), parseInt(perPage, 10));
  }

  // ─── Admin routes ──────────────────────────────────────────────────────────

  // Authors need the list to pick a category when writing a post
  @Get('admin/categories')
  @Roles(Role.AUTHOR, Role.EDITOR, Role.ADMIN)
  listAdmin() {
    return this.categories.listAdmin();
  }

  @Post('admin/categories')
  @Roles(Role.EDITOR, Role.ADMIN)
  create(@Body() body: CategoryCreate) {
    return this.categories.createCategory(body);
  }

  @Patch('admin/categories/:id')
  @Roles(Role.EDITOR, Role.ADMIN)
  update(@Param('id') id: string, @Body() body: CategoryUpdate) {
    return this.categories.updateCategory(id, body);
  }

  @Delete('admin/categories/:id')
  @Roles(Role.EDITOR, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.categories.deleteCategory(id);
  }

  @Put('admin/categories/order')
  @Roles(Role.EDITOR, Role.ADMIN)
  reorder(@Body() body: { ids: string[] }) {
    return this.categories.reorder(body.ids);
  }
}
