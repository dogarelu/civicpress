import { Injectable } from '@nestjs/common';
import { Prisma, PostStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_POST_DATE_FORMAT,
  TickerBarsUpdateSchema,
  createTickerBar,
  defaultBarTitle,
  headlineHref,
  isPostDateFormat,
  normalizeTickerBars,
  SettingsUpdateSchema,
  type MenuItem,
  type PublicTickerBar,
  type PublicTickerBarsResponse,
  type SettingsUpdate,
  type TickerBarConfig,
  type TickerBarsUpdate,
} from '@civicpress/shared';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreate() {
    const existing = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      include: { logoMedia: true, mobileLogoMedia: true, faviconMedia: true },
    });
    if (existing) return existing;
    return this.prisma.siteSettings.create({
      data: { id: 'default' },
      include: { logoMedia: true, mobileLogoMedia: true, faviconMedia: true },
    });
  }

  async getPublic() {
    const settings = await this.getOrCreate();
    const baseUrl = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    return {
      siteName: settings.siteName,
      tagline: settings.tagline,
      logoUrl: settings.logoMedia ? `${baseUrl}/v1/media/${settings.logoMedia.id}/orig` : null,
      mobileLogoUrl: settings.mobileLogoMedia
        ? `${baseUrl}/v1/media/${settings.mobileLogoMedia.id}/orig`
        : null,
      faviconUrl: settings.faviconMedia
        ? `${baseUrl}/v1/media/${settings.faviconMedia.id}/orig`
        : null,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      headingFont: settings.headingFont,
      bodyFont: settings.bodyFont,
      headerMaxCategories: settings.headerMaxCategories,
      headerShowMoreDropdown: settings.headerShowMoreDropdown,
      headerMoreCategoryIds: settings.headerMoreCategoryIds,
      tickerBgColor: settings.tickerBgColor,
      tickerTextColor: settings.tickerTextColor,
      tickerFontWeight: settings.tickerFontWeight,
      newsTitleFontSize: settings.newsTitleFontSize,
      newsTitleFontWeight: settings.newsTitleFontWeight,
      newsSummaryFontSize: settings.newsSummaryFontSize,
      newsSummaryFontWeight: settings.newsSummaryFontWeight,
      defaultSummaryRows: settings.defaultSummaryRows,
      heroTitleFontSize: settings.heroTitleFontSize,
      heroTitleFontWeight: settings.heroTitleFontWeight,
      sidebarTitleFontSize: settings.sidebarTitleFontSize,
      sidebarTitleFontWeight: settings.sidebarTitleFontWeight,
      articleTitleFontSize: settings.articleTitleFontSize,
      articleTitleFontWeight: settings.articleTitleFontWeight,
      articleContentFontSize: settings.articleContentFontSize,
      articleContentFontWeight: settings.articleContentFontWeight,
      showArticleViews: settings.showArticleViews,
      postDateFormat: isPostDateFormat(settings.postDateFormat)
        ? settings.postDateFormat
        : DEFAULT_POST_DATE_FORMAT,
      pillCorner: settings.pillCorner as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
      pillFontSize: settings.pillFontSize,
      pillTransparency: settings.pillTransparency,
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      youtubeUrl: settings.youtubeUrl,
      instagramUrl: settings.instagramUrl,
      whatsappUrl: settings.whatsappUrl,
      tiktokUrl: settings.tiktokUrl,
      showFacebook: settings.showFacebook,
      showTwitter: settings.showTwitter,
      showYoutube: settings.showYoutube,
      showInstagram: settings.showInstagram,
      showWhatsapp: settings.showWhatsapp,
      showTiktok: settings.showTiktok,
      showSocialInHeader: settings.showSocialInHeader,
      showSocialInMobileMenu: settings.showSocialInMobileMenu,
      showSocialInFooter: settings.showSocialInFooter,
      footerHtml: settings.footerHtml,
      footerContactInfo: settings.footerContactInfo,
      contactPageHtml: settings.contactPageHtml,
      termsPageHtml: settings.termsPageHtml,
      privacyPageHtml: settings.privacyPageHtml,
      cookiePageHtml: settings.cookiePageHtml,
    };
  }

  async getAdmin() {
    const s = await this.getOrCreate();
    const baseUrl = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return {
      siteName: s.siteName,
      tagline: s.tagline,
      logoMediaId: s.logoMediaId,
      logoUrl: s.logoMedia ? `${baseUrl}/v1/media/${s.logoMedia.id}/orig` : null,
      mobileLogoMediaId: s.mobileLogoMediaId,
      mobileLogoUrl: s.mobileLogoMedia ? `${baseUrl}/v1/media/${s.mobileLogoMedia.id}/orig` : null,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      accentColor: s.accentColor,
      backgroundColor: s.backgroundColor,
      textColor: s.textColor,
      headingFont: s.headingFont,
      bodyFont: s.bodyFont,
      headerMaxCategories: s.headerMaxCategories,
      headerShowMoreDropdown: s.headerShowMoreDropdown,
      headerMoreCategoryIds: s.headerMoreCategoryIds,
      tickerBgColor: s.tickerBgColor,
      tickerTextColor: s.tickerTextColor,
      tickerFontWeight: s.tickerFontWeight,
      newsTitleFontSize: s.newsTitleFontSize,
      newsTitleFontWeight: s.newsTitleFontWeight,
      newsSummaryFontSize: s.newsSummaryFontSize,
      newsSummaryFontWeight: s.newsSummaryFontWeight,
      defaultSummaryRows: s.defaultSummaryRows,
      heroTitleFontSize: s.heroTitleFontSize,
      heroTitleFontWeight: s.heroTitleFontWeight,
      sidebarTitleFontSize: s.sidebarTitleFontSize,
      sidebarTitleFontWeight: s.sidebarTitleFontWeight,
      articleTitleFontSize: s.articleTitleFontSize,
      articleTitleFontWeight: s.articleTitleFontWeight,
      articleContentFontSize: s.articleContentFontSize,
      articleContentFontWeight: s.articleContentFontWeight,
      showArticleViews: s.showArticleViews,
      postDateFormat: isPostDateFormat(s.postDateFormat)
        ? s.postDateFormat
        : DEFAULT_POST_DATE_FORMAT,
      pillCorner: s.pillCorner as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
      pillFontSize: s.pillFontSize,
      pillTransparency: s.pillTransparency,
      facebookUrl: s.facebookUrl,
      twitterUrl: s.twitterUrl,
      youtubeUrl: s.youtubeUrl,
      instagramUrl: s.instagramUrl,
      whatsappUrl: s.whatsappUrl,
      tiktokUrl: s.tiktokUrl,
      showFacebook: s.showFacebook,
      showTwitter: s.showTwitter,
      showYoutube: s.showYoutube,
      showInstagram: s.showInstagram,
      showWhatsapp: s.showWhatsapp,
      showTiktok: s.showTiktok,
      showSocialInHeader: s.showSocialInHeader,
      showSocialInMobileMenu: s.showSocialInMobileMenu,
      showSocialInFooter: s.showSocialInFooter,
      footerHtml: s.footerHtml,
      footerContactInfo: s.footerContactInfo,
      contactPageHtml: s.contactPageHtml,
      termsPageHtml: s.termsPageHtml,
      privacyPageHtml: s.privacyPageHtml,
      cookiePageHtml: s.cookiePageHtml,
    };
  }

  async update(input: SettingsUpdate) {
    const data = SettingsUpdateSchema.parse(input);
    // Normalize empty social URLs to null
    const normalized = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]),
    );
    if (Array.isArray(normalized.headerMoreCategoryIds)) {
      normalized.headerMoreCategoryIds = normalized.headerMoreCategoryIds.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0,
      );
    }
    await this.getOrCreate();
    await this.prisma.siteSettings.update({
      where: { id: 'default' },
      data: normalized,
    });
    return this.getAdmin();
  }

  async getTickerBars(): Promise<{ bars: TickerBarConfig[] }> {
    const settings = await this.getOrCreate();
    return { bars: this.readTickerBars(settings) };
  }

  async saveTickerBars(input: TickerBarsUpdate): Promise<{ bars: TickerBarConfig[] }> {
    const rawBars = Array.isArray(input?.bars) ? input.bars : [];
    const prepared = rawBars.map((bar) =>
      createTickerBar({
        ...bar,
        title:
          bar.title?.trim() || defaultBarTitle(bar.kind ?? 'ticker', bar.source ?? 'most-read'),
        customItems: (bar.customItems ?? [])
          .map((item) => ({ ...item, text: item.text.trim() }))
          .filter((item) => item.text.length > 0),
      }),
    );
    const data = TickerBarsUpdateSchema.parse({
      bars: normalizeTickerBars(prepared),
    });
    const bars = data.bars;
    const first =
      bars.find((bar) => bar.enabled && bar.kind === 'ticker') ??
      bars.find((bar) => bar.enabled) ??
      bars[0];
    await this.getOrCreate();
    await this.prisma.siteSettings.update({
      where: { id: 'default' },
      data: {
        tickerBars: bars as unknown as Prisma.InputJsonValue,
        ...(first
          ? {
              tickerBgColor: first.bgColor,
              tickerTextColor: first.textColor,
              tickerFontWeight: first.fontWeight,
            }
          : {}),
      },
    });
    return { bars };
  }

  async getPublicTickerBars(): Promise<PublicTickerBarsResponse> {
    const settings = await this.getOrCreate();
    const configs = this.readTickerBars(settings).filter((bar) => bar.enabled);
    const bars = await Promise.all(configs.map((bar) => this.resolvePublicHeaderBar(bar)));
    return { bars };
  }

  private readTickerBars(settings: {
    tickerBars: unknown;
    tickerBgColor: string;
    tickerTextColor: string;
    tickerFontWeight: number;
    headerMaxCategories: number;
    headerShowMoreDropdown: boolean;
    headerMoreCategoryIds: string[];
  }): TickerBarConfig[] {
    return normalizeTickerBars(settings.tickerBars, {
      bgColor: settings.tickerBgColor,
      textColor: settings.tickerTextColor,
      fontWeight: settings.tickerFontWeight,
      headerMaxCategories: settings.headerMaxCategories,
      headerShowMoreDropdown: settings.headerShowMoreDropdown,
      headerMoreCategoryIds: settings.headerMoreCategoryIds,
    });
  }

  private async resolvePublicHeaderBar(bar: TickerBarConfig): Promise<PublicTickerBar> {
    const items =
      bar.kind === 'ticker'
        ? bar.source === 'custom'
          ? bar.customItems.map((item) => ({ text: item.text, href: null }))
          : (await this.loadTickerHeadlines(bar)).map((post) => ({
              text: post.title,
              href: headlineHref(post),
            }))
        : [];
    const menuItems = bar.kind === 'menu' ? await this.resolveMenuItems(bar) : [];
    return {
      id: bar.id,
      slot: bar.slot,
      kind: bar.kind,
      title: bar.title,
      titleBgColor: bar.titleBgColor,
      titleTextColor: bar.titleTextColor,
      bgColor: bar.bgColor,
      textColor: bar.textColor,
      fontSize: bar.fontSize,
      fontWeight: bar.fontWeight,
      intervalMs: bar.intervalMs,
      textAlign: bar.textAlign,
      scrollFrom: bar.scrollFrom,
      motion: bar.motion,
      marqueeSpeed: bar.marqueeSpeed,
      items,
      showSearch: bar.showSearch,
      showSocial: bar.showSocial,
      menuItems,
      headerMaxCategories: bar.headerMaxCategories,
      headerShowMoreDropdown: bar.headerShowMoreDropdown,
      headerMoreCategoryIds: bar.headerMoreCategoryIds,
    };
  }

  private async resolveMenuItems(bar: TickerBarConfig): Promise<MenuItem[]> {
    if (!bar.menuEntries.length) {
      return this.getWebMenuFallback();
    }

    const ids = new Set<string>();
    for (const entry of bar.menuEntries) {
      ids.add(entry.categoryId);
      for (const childId of entry.childIds) ids.add(childId);
    }

    const cats = await this.prisma.category.findMany({
      where: { id: { in: [...ids] } },
    });
    const byId = new Map(cats.map((cat) => [cat.id, cat]));

    return bar.menuEntries
      .map((entry) => {
        const cat = byId.get(entry.categoryId);
        if (!cat) return null;
        const children = entry.childIds
          .map((id) => byId.get(id))
          .filter((child): child is NonNullable<typeof child> => !!child)
          .map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            color: child.color,
            menuOrder: child.menuOrder,
          }));
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          menuOrder: cat.menuOrder,
          ...(children.length ? { children } : {}),
        };
      })
      .filter((item): item is MenuItem => !!item);
  }

  private async getWebMenuFallback(): Promise<MenuItem[]> {
    const cats = await this.prisma.category.findMany({
      where: { showInMenu: true },
      orderBy: { menuOrder: 'asc' },
    });
    const byId = new Map(cats.map((cat) => [cat.id, cat]));
    const childrenByParent = new Map<string, typeof cats>();

    for (const cat of cats) {
      if (!cat.parentId || !byId.has(cat.parentId)) continue;
      const siblings = childrenByParent.get(cat.parentId) ?? [];
      siblings.push(cat);
      childrenByParent.set(cat.parentId, siblings);
    }

    return cats
      .filter((cat) => !cat.parentId || !byId.has(cat.parentId))
      .map((cat) => {
        const children = (childrenByParent.get(cat.id) ?? []).map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          color: child.color,
          menuOrder: child.menuOrder,
        }));
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          menuOrder: cat.menuOrder,
          ...(children.length ? { children } : {}),
        };
      });
  }

  private async loadTickerHeadlines(bar: TickerBarConfig) {
    const take = Math.min(Math.max(bar.itemCount, 1), 15);
    if (bar.source === 'category' && !bar.categoryId) return [];

    const where: Record<string, unknown> = {
      status: PostStatus.PUBLISHED,
      excludeFromModules: false,
    };
    if (bar.source === 'most-read') {
      where['publishedAt'] = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }
    if (bar.source === 'category' && bar.categoryId) {
      where['categories'] = { some: { categoryId: bar.categoryId } };
    }

    return this.prisma.post.findMany({
      where,
      orderBy:
        bar.source === 'most-read'
          ? [{ viewCount: 'desc' }, { publishedAt: 'desc' }]
          : [{ publishedAt: 'desc' }],
      take,
      select: { id: true, title: true, slug: true, videoUrl: true },
    });
  }
}
