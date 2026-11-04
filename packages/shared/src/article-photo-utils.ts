export const ARTICLE_PHOTO_SIZES = ['small', 'medium', 'full'] as const;
export type ArticlePhotoSize = (typeof ARTICLE_PHOTO_SIZES)[number];

export const ARTICLE_PHOTO_ALIGNS = ['left', 'center', 'right'] as const;
export type ArticlePhotoAlign = (typeof ARTICLE_PHOTO_ALIGNS)[number];

const FIGURE_RE = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi;
const IMG_RE = /<img\b[^>]*>/gi;
const FIGCAPTION_RE = /<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readAttr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const match = re.exec(tag);
  return match ? (match[2] ?? match[3] ?? null) : null;
}

export function parseArticlePhotoSize(value: string | null | undefined): ArticlePhotoSize {
  return ARTICLE_PHOTO_SIZES.includes(value as ArticlePhotoSize)
    ? (value as ArticlePhotoSize)
    : 'full';
}

export function parseArticlePhotoAlign(value: string | null | undefined): ArticlePhotoAlign {
  return ARTICLE_PHOTO_ALIGNS.includes(value as ArticlePhotoAlign)
    ? (value as ArticlePhotoAlign)
    : 'center';
}

export function articlePhotoWidth(size: ArticlePhotoSize): string {
  if (size === 'small') return '40%';
  if (size === 'medium') return '70%';
  return '100%';
}

export function articlePhotoBoxStyle(size: ArticlePhotoSize, align: ArticlePhotoAlign): string {
  const width = articlePhotoWidth(size);
  const margin =
    align === 'left' ? '1rem auto 1rem 0' : align === 'right' ? '1rem 0 1rem auto' : '1rem auto';
  return `width:${width};max-width:${width};height:auto;display:block;margin:${margin}`;
}

function figcaptionHtml(caption: string): string {
  if (!caption) return '';
  return `<figcaption class="cp-article-photo-caption" style="text-align:left">${escapeHtml(caption)}</figcaption>`;
}

function sizeFromTags(...tags: string[]): ArticlePhotoSize {
  for (const tag of tags) {
    const value = readAttr(tag, 'data-size');
    if (value) return parseArticlePhotoSize(value);
  }
  return 'full';
}

function alignFromTags(...tags: string[]): ArticlePhotoAlign {
  for (const tag of tags) {
    const value = readAttr(tag, 'data-align');
    if (value) return parseArticlePhotoAlign(value);
  }
  return 'center';
}

function figureClass(size: ArticlePhotoSize, align: ArticlePhotoAlign): string {
  return `cp-article-photo not-prose cp-article-photo--${size} cp-article-photo--${align}`;
}

function wrapBareImage(imgTag: string, caption: string): string {
  const size = sizeFromTags(imgTag);
  const align = alignFromTags(imgTag);
  const style = articlePhotoBoxStyle(size, align);
  return `<figure class="${figureClass(size, align)}" data-size="${size}" data-align="${align}" style="${style}">${imgTag}${figcaptionHtml(caption)}</figure>`;
}

function enhanceFigure(figure: string, caption: string): string {
  const imgMatch = /<img\b[^>]*>/i.exec(figure);
  const imgTag = imgMatch?.[0] ?? '';
  const size = sizeFromTags(figure, imgTag);
  const align = alignFromTags(figure, imgTag);
  const style = articlePhotoBoxStyle(size, align);
  let body = figure.replace(/^<figure\b[^>]*>/i, '').replace(/<\/figure>\s*$/i, '');
  if (caption) {
    body = body.replace(FIGCAPTION_RE, '');
    body += figcaptionHtml(caption);
  }
  return `<figure class="${figureClass(size, align)}" data-size="${size}" data-align="${align}" style="${style}">${body}</figure>`;
}

type PhotoMatch = {
  start: number;
  end: number;
  kind: 'figure' | 'img' | 'video';
  html: string;
};

function hasClass(tag: string, className: string): boolean {
  const value = readAttr(tag, 'class');
  if (!value) return false;
  return value.split(/\s+/).includes(className);
}

/** End offset of the div that starts at `start`, including nested divs. */
function endOfDiv(html: string, start: number): number | null {
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  return null;
}

function collectVideoMatches(html: string, figures: PhotoMatch[]): PhotoMatch[] {
  const matches: PhotoMatch[] = [];
  const openRe = /<div\b[^>]*>/gi;
  let open: RegExpExecArray | null;
  while ((open = openRe.exec(html))) {
    if (!hasClass(open[0], 'cp-article-video')) continue;
    const start = open.index;
    const insideFigure = figures.some((item) => start >= item.start && start < item.end);
    if (insideFigure) continue;
    const end = endOfDiv(html, start);
    if (end == null) continue;
    matches.push({ start, end, kind: 'video', html: html.slice(start, end) });
    openRe.lastIndex = end;
  }
  return matches;
}

function enhanceVideo(videoHtml: string, caption: string): string {
  FIGCAPTION_RE.lastIndex = 0;
  const withoutCaption = videoHtml.replace(FIGCAPTION_RE, '');
  if (!caption) return withoutCaption;
  const captionHtml = figcaptionHtml(caption);
  const close = withoutCaption.lastIndexOf('</div>');
  if (close < 0) return withoutCaption + captionHtml;
  return withoutCaption.slice(0, close) + captionHtml + withoutCaption.slice(close);
}

function collectPhotoMatches(html: string): PhotoMatch[] {
  const matches: PhotoMatch[] = [];
  FIGURE_RE.lastIndex = 0;
  for (const match of html.matchAll(FIGURE_RE)) {
    if (match.index == null) continue;
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: 'figure',
      html: match[0],
    });
  }
  IMG_RE.lastIndex = 0;
  for (const match of html.matchAll(IMG_RE)) {
    if (match.index == null) continue;
    const insideFigure = matches.some(
      (item) => item.kind === 'figure' && match.index! >= item.start && match.index! < item.end,
    );
    if (insideFigure) continue;
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: 'img',
      html: match[0],
    });
  }
  matches.push(...collectVideoMatches(html, matches));
  return matches.sort((a, b) => a.start - b.start);
}

export type ArticleBodyMediaKind = 'image' | 'video';

/** Body photos and videos in document order. The hero photo is not included. */
export function listArticleBodyMedia(html: string): ArticleBodyMediaKind[] {
  return collectPhotoMatches(html).map((match) => (match.kind === 'video' ? 'video' : 'image'));
}

/** Attach captions to body photos and videos in document order. */
export function applyArticlePhotoCaptions(html: string, captions: string[]): string {
  if (!html) return html;
  const matches = collectPhotoMatches(html);
  if (matches.length === 0) return html;

  let output = '';
  let cursor = 0;
  matches.forEach((match, index) => {
    output += html.slice(cursor, match.start);
    const caption = captions[index] ?? '';
    if (match.kind === 'figure') output += enhanceFigure(match.html, caption);
    else if (match.kind === 'video') output += enhanceVideo(match.html, caption);
    else output += wrapBareImage(match.html, caption);
    cursor = match.end;
  });
  output += html.slice(cursor);
  return output;
}

export function trimTrailingEmptyPhotoCaptions(labels: string[]): string[] {
  const next = labels.map((label) => label.trim());
  while (next.length > 0 && !next[next.length - 1]) next.pop();
  return next;
}

/** First caption is always for the main article photo; the rest follow body images in order. */
export function splitArticlePhotoCaptions(captions: string[]): {
  heroCaption: string | null;
  bodyCaptions: string[];
} {
  const labels = trimTrailingEmptyPhotoCaptions(captions);
  return {
    heroCaption: labels[0] || null,
    bodyCaptions: labels.slice(1),
  };
}
