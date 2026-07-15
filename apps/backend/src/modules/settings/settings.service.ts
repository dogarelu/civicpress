import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsUpdateSchema, type SettingsUpdate } from '@civicpress/shared';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreate() {
    const existing = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      include: { logoMedia: true, faviconMedia: true },
    });
    if (existing) return existing;
    return this.prisma.siteSettings.create({
      data: { id: 'default' },
      include: { logoMedia: true, faviconMedia: true },
    });
  }

  async getPublic() {
    const settings = await this.getOrCreate();
    const baseUrl = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    return {
      siteName: settings.siteName,
      tagline: settings.tagline,
      logoUrl: settings.logoMedia ? `${baseUrl}/v1/media/${settings.logoMedia.id}/orig` : null,
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
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      youtubeUrl: settings.youtubeUrl,
      instagramUrl: settings.instagramUrl,
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
      facebookUrl: s.facebookUrl,
      twitterUrl: s.twitterUrl,
      youtubeUrl: s.youtubeUrl,
      instagramUrl: s.instagramUrl,
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
}
