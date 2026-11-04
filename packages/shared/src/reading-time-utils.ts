/** Average reading speed used to estimate article duration. */
export const READING_WORDS_PER_MINUTE = 200;

/** Strip tags/entities from article HTML for word counting. */
export function plainTextFromHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
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
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Estimated reading time in whole seconds (no minute rounding).
 */
export function readingTimeSecondsFromHtml(html: string | null | undefined): number {
  const words = countWords(plainTextFromHtml(html));
  if (words <= 0) return 0;
  return Math.round((words / READING_WORDS_PER_MINUTE) * 60 * 0.75);
}
