/** In-body “see also” block. Stored HTML keeps only the target id and image flag. */

export const ARTICLE_REFERENCE_LABEL = 'VEZI ȘI';
export const ARTICLE_REFERENCE_CLASS = 'cp-article-ref';

export interface ArticleReferenceTarget {
  title: string;
  href: string;
  imageUrl: string | null;
}

interface StoredArticleReference {
  postId: string;
  showImage: boolean;
  start: number;
  end: number;
}

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

function findStoredArticleReferences(html: string): StoredArticleReference[] {
  if (!html.includes(ARTICLE_REFERENCE_CLASS)) return [];
  const re = /<div\b([^>]*\bcp-article-ref\b[^>]*)>\s*<\/div>/gi;
  const found: StoredArticleReference[] = [];
  for (const match of html.matchAll(re)) {
    if (match.index == null) continue;
    const postId = readAttr(match[1] ?? '', 'data-post-id')?.trim() ?? '';
    if (!postId) continue;
    found.push({
      postId,
      showImage: readAttr(match[1] ?? '', 'data-show-image') === 'true',
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return found;
}

export function listArticleReferenceIds(html: string): string[] {
  const ids: string[] = [];
  for (const ref of findStoredArticleReferences(html)) {
    if (!ids.includes(ref.postId)) ids.push(ref.postId);
  }
  return ids;
}

export function renderArticleReferenceHtml(
  postId: string,
  showImage: boolean,
  target: ArticleReferenceTarget | null,
): string {
  const title = target?.title.trim() ?? '';
  const titleHtml = title
    ? `<a class="cp-article-ref-link" href="${escapeHtml(target?.href || '#')}">${escapeHtml(title)}</a>`
    : `<span class="cp-article-ref-missing">Articol indisponibil</span>`;
  const image =
    showImage && title && target?.imageUrl
      ? `<img class="cp-article-ref-image" src="${escapeHtml(target.imageUrl)}" alt="${escapeHtml(title)}" />`
      : '';
  return (
    `<div class="${ARTICLE_REFERENCE_CLASS} not-prose" data-post-id="${escapeHtml(postId)}" data-show-image="${showImage ? 'true' : 'false'}">` +
    `<div class="cp-article-ref-line"><span class="cp-article-ref-label">${ARTICLE_REFERENCE_LABEL} : </span>${titleHtml}</div>` +
    `${image}</div>`
  );
}

/** Replace empty reference placeholders with the current title, link, and hero image. */
export function applyArticleReferences(
  html: string,
  resolve: (postId: string) => ArticleReferenceTarget | null,
): string {
  const refs = findStoredArticleReferences(html);
  if (refs.length === 0) return html;
  let output = '';
  let cursor = 0;
  for (const ref of refs) {
    output += html.slice(cursor, ref.start);
    output += renderArticleReferenceHtml(ref.postId, ref.showImage, resolve(ref.postId));
    cursor = ref.end;
  }
  output += html.slice(cursor);
  return output;
}
