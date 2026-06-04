import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getPublic() {
    let settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'default' },
      include: { logoMedia: true, faviconMedia: true },
    });

    if (!settings) {
      settings = await this.prisma.siteSettings.create({
        data: { id: 'default' },
        include: { logoMedia: true, faviconMedia: true },
      });
    }

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
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      youtubeUrl: settings.youtubeUrl,
      instagramUrl: settings.instagramUrl,
      footerHtml: settings.footerHtml,
    };
  }
}
