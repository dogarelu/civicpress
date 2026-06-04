import { z } from 'zod';

// ─── Media ────────────────────────────────────────────────────────────────────

export const MediaRefSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  caption: z.string().nullable(),
  mimeType: z.string(),
});
export type MediaRef = z.infer<typeof MediaRefSchema>;

// ─── Author ───────────────────────────────────────────────────────────────────

export const AuthorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  slug: z.string(),
  bio: z.string().nullable(),
  avatar: MediaRefSchema.nullable(),
});
export type Author = z.infer<typeof AuthorSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const CategorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
});
export type CategorySummary = z.infer<typeof CategorySummarySchema>;

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  menuOrder: z.number().int(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuResponseSchema = z.array(MenuItemSchema);
export type MenuResponse = z.infer<typeof MenuResponseSchema>;

// ─── Post ─────────────────────────────────────────────────────────────────────

export const PostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  heroImage: MediaRefSchema.nullable(),
  primaryCategory: CategorySummarySchema.nullable(),
  author: z
    .object({
      id: z.string(),
      displayName: z.string(),
      slug: z.string(),
    })
    .nullable(),
});
export type PostSummary = z.infer<typeof PostSummarySchema>;

export const PostDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  contentHtml: z.string(),
  publishedAt: z.string().datetime().nullable(),
  heroImage: MediaRefSchema.nullable(),
  videoUrl: z.string().nullable(),
  author: AuthorSchema.nullable(),
  categories: z.array(CategorySummarySchema),
  tags: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  relatedPosts: z.array(PostSummarySchema),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
});
export type PostDetail = z.infer<typeof PostDetailSchema>;

// ─── Admin category schemas ───────────────────────────────────────────────────

export const AdminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  showInMenu: z.boolean(),
  menuOrder: z.number().int(),
  postCount: z.number().int(),
});
export type AdminCategory = z.infer<typeof AdminCategorySchema>;

export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  description: z.string().max(500).nullable().optional(),
  showInMenu: z.boolean().optional(),
});
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;

export const CategoryUpdateSchema = CategoryCreateSchema.partial();
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

export const CategoryReorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export type CategoryReorder = z.infer<typeof CategoryReorderSchema>;

// ─── Category detail ──────────────────────────────────────────────────────────

export const CategoryDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  posts: z.array(PostSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
});
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>;

// ─── Home response ────────────────────────────────────────────────────────────

export const CategoryStripSchema = z.object({
  category: CategorySummarySchema,
  posts: z.array(PostSummarySchema),
});
export type CategoryStrip = z.infer<typeof CategoryStripSchema>;

export const HomeResponseSchema = z.object({
  hero: PostSummarySchema.nullable(),
  grid: z.array(PostSummarySchema),
  list: z.array(PostSummarySchema),
  categoryStrips: z.array(CategoryStripSchema),
});
export type HomeResponse = z.infer<typeof HomeResponseSchema>;

// ─── Homepage curation config (admin) ─────────────────────────────────────────

export const HomepageConfigSchema = z.object({
  hero: PostSummarySchema.nullable(),
  grid: z.array(PostSummarySchema.nullable()),
  list: z.array(PostSummarySchema.nullable()),
});
export type HomepageConfig = z.infer<typeof HomepageConfigSchema>;

export const SaveHomepageSchema = z.object({
  hero: z.string().nullable().optional(),
  grid: z.array(z.string().nullable()),
  list: z.array(z.string().nullable()),
});
export type SaveHomepage = z.infer<typeof SaveHomepageSchema>;

// ─── Public settings ──────────────────────────────────────────────────────────

export const PublicSettingsSchema = z.object({
  siteName: z.string(),
  tagline: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  facebookUrl: z.string().url().nullable(),
  twitterUrl: z.string().url().nullable(),
  youtubeUrl: z.string().url().nullable(),
  instagramUrl: z.string().url().nullable(),
  footerHtml: z.string().nullable(),
});
export type PublicSettings = z.infer<typeof PublicSettingsSchema>;

// ─── Layout public ────────────────────────────────────────────────────────────

export const LayoutPublicSchema = z.object({
  homeTemplateId: z.string(),
  categoryTemplateId: z.string(),
  homeTemplateOptions: z.record(z.unknown()).nullable(),
  categoryTemplateOptions: z.record(z.unknown()).nullable(),
});
export type LayoutPublic = z.infer<typeof LayoutPublicSchema>;

// ─── Auth & Users ─────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['AUTHOR', 'EDITOR', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;

export const PostStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]);
export type PostStatus = z.infer<typeof PostStatusSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const MeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  slug: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type Me = z.infer<typeof MeSchema>;

export const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  slug: z.string(),
  role: RoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

// ─── Post write DTOs ──────────────────────────────────────────────────────────

export const PostCreateSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  contentHtml: z.string().optional().default(''),
  heroMediaId: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  primaryCategoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});
export type PostCreate = z.infer<typeof PostCreateSchema>;

export const PostUpdateSchema = PostCreateSchema.partial();
export type PostUpdate = z.infer<typeof PostUpdateSchema>;

export const PostTransitionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'publish', 'archive']),
  message: z.string().optional(),
});
export type PostTransition = z.infer<typeof PostTransitionSchema>;

// ─── Admin post list ──────────────────────────────────────────────────────────

export const AdminPostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: PostStatusSchema,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({ id: z.string(), displayName: z.string(), slug: z.string() }).nullable(),
  primaryCategory: CategorySummarySchema.nullable(),
});
export type AdminPostSummary = z.infer<typeof AdminPostSummarySchema>;

// ─── Revision ─────────────────────────────────────────────────────────────────

export const RevisionSummarySchema = z.object({
  id: z.string(),
  postId: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  message: z.string().nullable(),
  createdAt: z.string(),
  editor: z.object({ id: z.string(), displayName: z.string() }).nullable(),
});
export type RevisionSummary = z.infer<typeof RevisionSummarySchema>;

// ─── Audit ────────────────────────────────────────────────────────────────────

export const AuditEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  diff: z.unknown().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  actor: z.object({ id: z.string(), displayName: z.string(), email: z.string() }).nullable(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
