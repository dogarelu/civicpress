import type {
  Post,
  Category,
  User,
  Media,
  PostCategory,
  PostTag,
  Tag,
  Pill,
  PostBulb,
} from '@prisma/client';

type PostWithRelations = Post & {
  heroMedia: Media | null;
  pill: Pill | null;
  author: (User & { avatar: Media | null }) | null;
  categories: (PostCategory & { category: Category })[];
  tags: (PostTag & { tag: Tag })[];
  bulbi?: (PostBulb & { linkedPost: PostSummaryRow })[];
};

type PostSummaryRow = Post & {
  heroMedia: Media | null;
  pill: Pill | null;
  author: User | null;
  categories: (PostCategory & { category: Category })[];
};

const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/** Max length of the excerpt derived from content (display is clamped by CSS line count). */
const CONTENT_EXCERPT_MAX_CHARS = 360;

function excerptFromContent(contentHtml: string | null | undefined): string | null {
  if (!contentHtml) return null;
  const text = contentHtml
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (text.length <= CONTENT_EXCERPT_MAX_CHARS) return text;
  const cut = text.slice(0, CONTENT_EXCERPT_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : CONTENT_EXCERPT_MAX_CHARS)}…`;
}

function resolveExcerpt(
  excerpt: string | null,
  showSummary: boolean,
  contentHtml?: string | null,
): string | null {
  if (!showSummary) return null;
  const explicitExcerpt = excerpt?.trim();
  // No explicit summary: fall back to plain text extracted from the article content.
  return explicitExcerpt || excerptFromContent(contentHtml);
}

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

export function mapPill(pill: Pill | null) {
  if (!pill) return null;
  return { id: pill.id, text: pill.text, color: pill.color, textColor: pill.textColor };
}

export function mapPostBulbi(
  bulbi: (PostBulb & { linkedPost: PostSummaryRow })[] | undefined,
  opts?: { publishedOnly?: boolean },
) {
  if (!bulbi?.length) return [];
  return bulbi
    .filter((item) => {
      if (!item.linkedPost) return false;
      if (opts?.publishedOnly && item.linkedPost.status !== 'PUBLISHED') return false;
      return true;
    })
    .map((item) => ({
      postId: item.linkedPostId,
      labelOverride: item.labelOverride,
      post: mapPostSummary(item.linkedPost),
    }));
}

export function mapPostSummary(post: PostSummaryRow, opts?: { forceShowSummary?: boolean }) {
  const authorName = post.authorName?.trim() || post.author?.displayName || null;
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: resolveExcerpt(
      post.excerpt,
      opts?.forceShowSummary ? true : post.showSummary,
      post.contentHtml,
    ),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    heroImage: mapMedia(post.heroMedia),
    primaryCategory: getPrimaryCategory(post.categories),
    author: post.author
      ? { id: post.author.id, displayName: post.author.displayName, slug: post.author.slug }
      : null,
    authorName,
    showDate: post.showDate,
    showAuthor: post.showAuthor,
    showSummary: post.showSummary,
    viewCount: post.viewCount,
    pill: mapPill(post.pill),
    videoUrl: post.videoUrl,
  };
}

export type PostDetailBase = Omit<ReturnType<typeof mapPostDetailBase>, never>;

export function mapPostDetailBase(post: PostWithRelations) {
  const authorName = post.authorName?.trim() || post.author?.displayName || null;
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: resolveExcerpt(post.excerpt, post.showSummary, post.contentHtml),
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
    authorName,
    showDate: post.showDate,
    showAuthor: post.showAuthor,
    showSummary: post.showSummary,
    viewCount: post.viewCount,
    categories: post.categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      slug: pc.category.slug,
      color: pc.category.color,
    })),
    tags: post.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug })),
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    pill: mapPill(post.pill),
    bulbi: mapPostBulbi(post.bulbi),
  };
}

/** @deprecated use mapPostDetailBase — service attaches relatedPosts */
export const mapPostDetail = mapPostDetailBase;
