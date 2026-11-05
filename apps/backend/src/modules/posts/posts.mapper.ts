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
  PostPhotoCaption,
  PostPill,
} from '@prisma/client';
import {
  applyArticlePhotoCaptions,
  readingTimeSecondsFromHtml,
  safeHttpUrl,
  splitArticlePhotoCaptions,
} from '@civicpress/shared';

type LinkedPostLite = {
  id: string;
  slug: string;
  title: string;
  status?: string;
  deletedAt?: Date | string | null;
};

type PostPillRow = PostPill & { pill: Pill };

type PostWithRelations = Post & {
  heroMedia: Media | null;
  postPills?: PostPillRow[];
  author: (User & { avatar: Media | null }) | null;
  categories: (PostCategory & { category: Category })[];
  tags: (PostTag & { tag: Tag })[];
  bulbi?: (PostBulb & { linkedPost: LinkedPostLite | null })[];
  photoCaptions?: PostPhotoCaption[];
};

type PostSummaryRow = Post & {
  heroMedia: Media | null;
  postPills?: PostPillRow[];
  author: User | null;
  categories: (PostCategory & { category: Category })[];
  bulbi?: (PostBulb & { linkedPost: LinkedPostLite | null })[];
};

const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/** Plain text from article HTML; length is controlled by CSS line-clamp on display. */
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
  return text || null;
}

function resolveExcerpt(
  excerpt: string | null,
  showSummary: boolean,
  contentHtml?: string | null,
  hasBulbi = false,
): string | null {
  if (!showSummary) return null;
  // Subtitle bumbi replace the plain excerpt when present.
  if (hasBulbi) return null;
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

const PILL_CORNERS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
const PILL_SIZES = new Set(['smaller', 'default', 'bigger']);

function mapPillCorner(value: string | null | undefined) {
  if (!value || !PILL_CORNERS.has(value)) return null;
  return value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

function mapPillSize(value: string | null | undefined) {
  if (value && PILL_SIZES.has(value)) return value as 'smaller' | 'default' | 'bigger';
  return 'default' as const;
}

export function mapPostPills(postPills: PostPillRow[] | undefined) {
  if (!postPills?.length) return [];
  return postPills.map((row) => ({
    pill: {
      id: row.pill.id,
      text: row.pill.text,
      color: row.pill.color,
      textColor: row.pill.textColor,
    },
    corner: mapPillCorner(row.corner),
    size: mapPillSize(row.size),
  }));
}

export function mapPostBulbi(
  bulbi: (PostBulb & { linkedPost: LinkedPostLite | null })[] | undefined,
  opts?: { publishedOnly?: boolean },
) {
  if (!bulbi?.length) return [];
  return bulbi
    .map((item) => {
      const linked = item.linkedPost;
      const externalUrl = linked ? null : safeHttpUrl(item.externalUrl);
      if (
        linked &&
        opts?.publishedOnly &&
        (linked.deletedAt || (linked.status && linked.status !== 'PUBLISHED'))
      ) {
        return {
          id: item.id,
          label: item.label,
          linkedPost: null as null,
          externalUrl: safeHttpUrl(item.externalUrl),
        };
      }
      return {
        id: item.id,
        label: item.label,
        linkedPost: linked ? { id: linked.id, slug: linked.slug, title: linked.title } : null,
        externalUrl,
      };
    })
    .filter((item) => !!item.label?.trim());
}

export function mapPostPhotoCaptions(captions: PostPhotoCaption[] | undefined) {
  if (!captions?.length) return [];
  return [...captions]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({ id: item.id, label: item.label }));
}

export function applyPublicArticlePhotos<
  T extends {
    contentHtml: string;
    heroImage: { caption?: string | null } | null;
    videoUrl?: string | null;
  },
>(post: T, captions: Array<{ label: string }>): T {
  const { heroCaption, bodyCaptions } = splitArticlePhotoCaptions(
    captions.map((item) => item.label),
  );
  return {
    ...post,
    heroImage: post.heroImage
      ? { ...post.heroImage, caption: heroCaption || post.heroImage.caption || null }
      : null,
    contentHtml: applyArticlePhotoCaptions(post.contentHtml, bodyCaptions),
  };
}

function summaryVisible(showSummary: boolean, forceShowSummary?: boolean) {
  return forceShowSummary ? true : showSummary;
}

export function mapPostSummary(post: PostSummaryRow, opts?: { forceShowSummary?: boolean }) {
  const authorName = post.authorName?.trim() || post.author?.displayName || null;
  const visible = summaryVisible(post.showSummary, opts?.forceShowSummary);
  const bulbi = visible ? mapPostBulbi(post.bulbi, { publishedOnly: true }) : [];
  const pills = mapPostPills(post.postPills);
  const first = pills[0];
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    kicker: post.kicker?.trim() || null,
    excerpt: resolveExcerpt(post.excerpt, visible, post.contentHtml, bulbi.length > 0),
    bulbi,
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
    readingTimeSeconds: readingTimeSecondsFromHtml(post.contentHtml),
    pills,
    pill: first?.pill ?? null,
    pillCorner: first?.corner ?? null,
    videoUrl: post.videoUrl,
  };
}

export type PostDetailBase = Omit<ReturnType<typeof mapPostDetailBase>, never>;

export function mapPostDetailBase(post: PostWithRelations) {
  const authorName = post.authorName?.trim() || post.author?.displayName || null;
  const bulbi = mapPostBulbi(post.bulbi, { publishedOnly: true });
  const photoCaptions = mapPostPhotoCaptions(post.photoCaptions);
  const pills = mapPostPills(post.postPills);
  const first = pills[0];
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    kicker: post.kicker?.trim() || null,
    // Article page: only explicit legacy excerpt (no contentHtml fallback).
    excerpt: bulbi.length > 0 ? null : post.excerpt?.trim() || null,
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
    readingTimeSeconds: readingTimeSecondsFromHtml(post.contentHtml),
    categories: post.categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      slug: pc.category.slug,
      color: pc.category.color,
    })),
    tags: post.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug })),
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    updatedAt: post.updatedAt?.toISOString() ?? undefined,
    pills,
    pill: first?.pill ?? null,
    pillCorner: first?.corner ?? null,
    bulbi,
    photoCaptions,
  };
}

/** @deprecated use mapPostDetailBase — service attaches relatedPosts */
export const mapPostDetail = mapPostDetailBase;
