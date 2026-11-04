import type {
  CategoryStrip,
  LayoutDisplaySlot,
  PostSummary,
  ResolvedSidebar,
  ResolvedSidebarBlock,
  SidebarMode,
} from '@civicpress/shared';

interface SidebarVideoItemInput {
  id: string;
  title?: string | null;
  url: string;
}

export type SidebarStreamUnitKind =
  | 'latest-header'
  | 'latest-item'
  | 'slideshow-block'
  | 'video-block'
  | 'overlay-list-block'
  | 'article-list-block'
  | 'most-viewed-block'
  | 'single-category-block'
  | 'category-strip'
  | 'featured-video-block'
  | 'featured-article-block'
  | 'featured-photo-block'
  | 'featured-stack-block';

export interface SidebarStreamUnit {
  key: string;
  blockIndex: number;
  mode: SidebarMode;
  kind: SidebarStreamUnitKind;
  block: ResolvedSidebarBlock;
  posts: PostSummary[];
  videoItems: SidebarVideoItemInput[];
  displaySlots: LayoutDisplaySlot[];
  strip: CategoryStrip | null;
  maxPosts: number | null;
}

function blockPosts(block: ResolvedSidebarBlock, extras: PostSummary[]): PostSummary[] {
  return extras.length > 0 ? [...block.posts, ...extras] : block.posts;
}

/** Flatten configured sidebar blocks into ordered render units. */
export function buildSidebarStream(
  sidebar: ResolvedSidebar,
  extraPostsByMode: Partial<Record<SidebarMode, PostSummary[]>>,
): SidebarStreamUnit[] {
  const units: SidebarStreamUnit[] = [];

  sidebar.blocks.forEach((block, blockIndex) => {
    const extras = extraPostsByMode[block.mode] ?? [];
    const displaySlotFallback: LayoutDisplaySlot = {
      postId: null,
      showDate: true,
      showAuthor: true,
    };

    switch (block.mode) {
      case 'latest': {
        const posts = blockPosts(block, extras);
        if (posts.length === 0) break;
        if (block.latestTitle.trim().length > 0) {
          units.push({
            key: `latest:${blockIndex}:header`,
            blockIndex,
            mode: block.mode,
            kind: 'latest-header',
            block,
            posts: [],
            videoItems: [],
            displaySlots: [],
            strip: null,
            maxPosts: null,
          });
        }
        posts.forEach((post, postIndex) => {
          units.push({
            key: `latest:${blockIndex}:${post.id}:${postIndex}`,
            blockIndex,
            mode: block.mode,
            kind: 'latest-item',
            block,
            posts: [post],
            videoItems: [],
            displaySlots: [
              block.latestSlots[postIndex] ?? block.latestSlots[0] ?? displaySlotFallback,
            ],
            strip: null,
            maxPosts: 1,
          });
        });
        break;
      }

      case 'slideshow':
        units.push({
          key: `slideshow:${blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'slideshow-block',
          block,
          posts: blockPosts(block, extras).slice(0, block.slideshowCount),
          videoItems: [],
          displaySlots: block.latestSlots,
          strip: null,
          maxPosts: block.slideshowCount,
        });
        break;

      case 'video': {
        units.push({
          key: `video:${blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'video-block',
          block,
          posts: blockPosts(block, extras).slice(0, block.videoCount),
          videoItems:
            (block as ResolvedSidebarBlock & { videoItems?: SidebarVideoItemInput[] }).videoItems ??
            [],
          displaySlots: block.latestSlots,
          strip: null,
          maxPosts: block.videoCount,
        });
        break;
      }

      case 'overlay-list': {
        units.push({
          key: `overlay:${blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'overlay-list-block',
          block,
          posts: blockPosts(block, extras).slice(0, block.overlayListCount),
          videoItems: [],
          displaySlots: block.overlayListSlots,
          strip: null,
          maxPosts: block.overlayListCount,
        });
        break;
      }

      case 'article-list': {
        units.push({
          key: `article-list:${blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'article-list-block',
          block,
          posts: blockPosts(block, extras).slice(0, block.articleListCount),
          videoItems: [],
          displaySlots: block.articleListSlots,
          strip: null,
          maxPosts: block.articleListCount,
        });
        break;
      }

      case 'most-viewed': {
        units.push({
          key: `most-viewed:${block.blockId ?? blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'most-viewed-block',
          block,
          posts: blockPosts(block, extras).slice(0, block.mostViewedCount),
          videoItems: [],
          displaySlots: block.mostViewedSlots,
          strip: null,
          maxPosts: block.mostViewedCount,
        });
        break;
      }

      case 'single-category':
        for (const strip of block.categoryStrips) {
          if (strip.posts.length === 0) continue;
          units.push({
            key: `single:${blockIndex}:${strip.category.id}`,
            blockIndex,
            mode: block.mode,
            kind: 'single-category-block',
            block,
            posts: strip.posts,
            videoItems: [],
            displaySlots: block.singleCategorySlots,
            strip,
            maxPosts: block.singleCategoryCount,
          });
        }
        break;

      case 'categories':
        for (const strip of block.categoryStrips) {
          if (strip.posts.length === 0) continue;
          units.push({
            key: `cat:${blockIndex}:${strip.category.id}`,
            blockIndex,
            mode: block.mode,
            kind: 'category-strip',
            block,
            posts: strip.posts,
            videoItems: [],
            displaySlots: block.categorySlots,
            strip,
            maxPosts: null,
          });
        }
        break;

      case 'featured-video': {
        const hasManual = (block.videoItems ?? []).some((video) => !!video.url);
        const hasPost = blockPosts(block, extras).some((post) => !!post.videoUrl);
        if (!hasManual && !hasPost) break;
        units.push({
          key: `featured-video:${block.blockId ?? blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'featured-video-block',
          block,
          posts: blockPosts(block, extras).slice(0, 1),
          videoItems: block.videoItems ?? [],
          displaySlots: block.latestSlots,
          strip: null,
          maxPosts: 1,
        });
        break;
      }

      case 'featured-article': {
        const posts = blockPosts(block, extras).slice(0, 1);
        if (posts.length === 0) break;
        units.push({
          key: `featured-article:${block.blockId ?? blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'featured-article-block',
          block,
          posts,
          videoItems: [],
          displaySlots: block.articleListSlots,
          strip: null,
          maxPosts: 1,
        });
        break;
      }

      case 'featured-photo': {
        if (!block.featuredPhotoUrl) break;
        units.push({
          key: `featured-photo:${block.blockId ?? blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'featured-photo-block',
          block,
          posts: [],
          videoItems: [],
          displaySlots: [],
          strip: null,
          maxPosts: null,
        });
        break;
      }

      case 'featured-stack': {
        const secondaryCount = block.featuredSecondaryCount ?? 3;
        const maxPosts = 1 + secondaryCount;
        const posts = blockPosts(block, extras).slice(0, maxPosts);
        if (posts.length === 0) break;
        units.push({
          key: `featured-stack:${block.blockId ?? blockIndex}`,
          blockIndex,
          mode: block.mode,
          kind: 'featured-stack-block',
          block,
          posts,
          videoItems: [],
          displaySlots: block.latestSlots,
          strip: null,
          maxPosts,
        });
        break;
      }
    }
  });

  return units;
}
