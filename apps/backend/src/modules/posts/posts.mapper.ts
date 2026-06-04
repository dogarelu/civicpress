import type { Post, Category, User, Media, PostCategory, PostTag, Tag } from '@prisma/client';

type PostWithRelations = Post & {
  heroMedia: Media | null;
  author: (User & { avatar: Media | null }) | null;
  categories: (PostCategory & { category: Category })[];
  tags: (PostTag & { tag: Tag })[];
};

type PostSummaryRow = Post & {
  heroMedia: Media | null;
  author: User | null;
  categories: (PostCategory & { category: Category })[];
};

const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

export function mediaUrl(media: Media, variant = 'orig') {
  return `${MEDIA_BASE_URL}/v1/media/${media.id}/${variant}`;
}

export function mapMedia(media: Media | null) {
  if (!media) return null;
  return {
    id: media.id,
    url: mediaUrl(media),
    width: media.width,
    height: media.height,
    alt: media.alt,
    caption: media.caption,
    mimeType: media.mimeType,
  };
}

export function getPrimaryCategory(categories: (PostCategory & { category: Category })[]) {
  const primary = categories.find((c) => c.isPrimary) ?? categories[0];
  return primary
    ? {
        id: primary.category.id,
        name: primary.category.name,
        slug: primary.category.slug,
        color: primary.category.color,
      }
    : null;
}

export function mapPostSummary(post: PostSummaryRow) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    heroImage: mapMedia(post.heroMedia),
    primaryCategory: getPrimaryCategory(post.categories),
    author: post.author
      ? { id: post.author.id, displayName: post.author.displayName, slug: post.author.slug }
      : null,
  };
}

export type PostDetailBase = Omit<ReturnType<typeof mapPostDetailBase>, never>;

export function mapPostDetailBase(post: PostWithRelations) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    heroImage: mapMedia(post.heroMedia),
    videoUrl: post.videoUrl,
    author: post.author
      ? {
          id: post.author.id,
          displayName: post.author.displayName,
          slug: post.author.slug,
          bio: post.author.bio,
          avatar: mapMedia(post.author.avatar),
        }
      : null,
    categories: post.categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      slug: pc.category.slug,
      color: pc.category.color,
    })),
    tags: post.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug })),
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
  };
}

/** @deprecated use mapPostDetailBase — service attaches relatedPosts */
export const mapPostDetail = mapPostDetailBase;
