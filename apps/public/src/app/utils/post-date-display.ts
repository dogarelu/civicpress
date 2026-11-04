import type { PostDateFormat } from '@civicpress/shared';

const ROMANIAN_TIME_ZONE = 'Europe/Bucharest';

const dayFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: ROMANIAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hourFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: ROMANIAN_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: ROMANIAN_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function dayKey(date: Date): string {
  return dayFormatter.format(date);
}

export function formatPostDateForList(
  dateStr: string | null | undefined,
  format: PostDateFormat = 'time-if-today',
): string {
  if (!dateStr) return '';
  const postDate = new Date(dateStr);
  if (Number.isNaN(postDate.getTime())) return '';
  const showTime = format === 'time-if-today' && dayKey(postDate) === dayKey(new Date());
  return showTime ? hourFormatter.format(postDate) : dateFormatter.format(postDate);
}
