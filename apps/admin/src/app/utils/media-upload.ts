/** Matches backend `MAX_VIDEO_SIZE` in `apps/backend/src/modules/media/media.service.ts`. */
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

export function isAllowedVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return file.name.toLowerCase().endsWith('.mp4');
}

export function videoFileRejection(file: File): string | null {
  if (!isAllowedVideoFile(file)) return 'Fișierul selectat nu este un videoclip.';
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) return 'Fișierul este prea mare (max 100MB).';
  return null;
}

export function videoUploadErrorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string | string[] } };
  if (e.status === 413) return 'Fișierul este prea mare (max 100MB).';
  const msg = e.error?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (Array.isArray(msg) && msg[0]) return msg.join(', ');
  return 'Eroare la încărcarea videoclipului';
}
