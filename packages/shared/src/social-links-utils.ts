export const SOCIAL_NETWORKS = [
  { id: 'facebook', label: 'Facebook', urlKey: 'facebookUrl', showKey: 'showFacebook' },
  { id: 'instagram', label: 'Instagram', urlKey: 'instagramUrl', showKey: 'showInstagram' },
  { id: 'twitter', label: 'Twitter / X', urlKey: 'twitterUrl', showKey: 'showTwitter' },
  { id: 'youtube', label: 'YouTube', urlKey: 'youtubeUrl', showKey: 'showYoutube' },
  { id: 'whatsapp', label: 'WhatsApp', urlKey: 'whatsappUrl', showKey: 'showWhatsapp' },
  { id: 'tiktok', label: 'TikTok', urlKey: 'tiktokUrl', showKey: 'showTiktok' },
] as const;

export type SocialNetworkId = (typeof SOCIAL_NETWORKS)[number]['id'];

export type SocialPlacement = 'header' | 'mobile' | 'footer';

export const SOCIAL_PLACEMENT_SHOW_KEY = {
  header: 'showSocialInHeader',
  mobile: 'showSocialInMobileMenu',
  footer: 'showSocialInFooter',
} as const;

export type SocialSettingsLike = {
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  whatsappUrl?: string | null;
  tiktokUrl?: string | null;
  showFacebook?: boolean;
  showTwitter?: boolean;
  showYoutube?: boolean;
  showInstagram?: boolean;
  showWhatsapp?: boolean;
  showTiktok?: boolean;
  showSocialInHeader?: boolean;
  showSocialInMobileMenu?: boolean;
  showSocialInFooter?: boolean;
};

export type VisibleSocialLink = {
  id: SocialNetworkId;
  label: string;
  url: string;
};

export function getVisibleSocialLinks(
  settings: SocialSettingsLike | null | undefined,
  placement?: SocialPlacement,
): VisibleSocialLink[] {
  if (!settings) return [];
  if (placement && settings[SOCIAL_PLACEMENT_SHOW_KEY[placement]] === false) {
    return [];
  }
  return SOCIAL_NETWORKS.flatMap((network) => {
    const url = settings[network.urlKey]?.trim();
    if (!url || !settings[network.showKey]) return [];
    return [{ id: network.id, label: network.label, url }];
  });
}
