/**
 * Seed CivicPress from local WordPress SQL dump + uploads folder.
 *
 * Imports ALL published articles (post_type=post, post_status=publish),
 * deletes existing CivicPress posts first, and migrates images from local uploads.
 *
 * Run: pnpm seed:wp-sql (from repo root)
 *
 * Env:
 *   WP_SQL_PATH          — path to civicpre_wp1.sql (default: ../ex-wp/civicpre_wp1.sql)
 *   WP_UPLOADS_PATH      — path to wp uploads dir (default: ../ex-wp/uploads)
 *   WP_MYSQL_HOST/PORT   — existing MariaDB with WP data (skip docker spin-up)
 *   WP_DOCKER_CONTAINER  — temp MariaDB container name (default: civicpress-wp-import-tmp)
 *   WP_DOCKER_PORT       — host port for temp MariaDB (default: 3307)
 *   WP_DOCKER_KEEP       — set to 1 to keep MariaDB container after run
 *   DRY_RUN              — set to 1 to preview counts without writing
 *   MEDIA_BASE_URL       — base URL for rewritten inline images (default: http://localhost:3000)
 */
import * as path from 'path';
import * as fs from 'fs';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execFileAsync = promisify(execFile);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL || 'postgresql://civicpress:civicpress@localhost:5432/civicpress',
    },
  },
});

const REPO_ROOT = path.resolve(__dirname, '..');
const WP_SQL_PATH = process.env.WP_SQL_PATH || path.resolve(REPO_ROOT, '../ex-wp/civicpre_wp1.sql');
const WP_UPLOADS_PATH = process.env.WP_UPLOADS_PATH || path.resolve(REPO_ROOT, '../ex-wp/uploads');
const STORAGE_ORIG = path.resolve(REPO_ROOT, 'apps/backend/storage/media/orig');
const MEDIA_BASE = process.env.MEDIA_BASE_URL || 'http://localhost:3000';
const DRY_RUN = process.env.DRY_RUN === '1';

const WP_CONTAINER = process.env.WP_DOCKER_CONTAINER || 'civicpress-wp-import-tmp';
const WP_DOCKER_PORT = Number(process.env.WP_DOCKER_PORT || 3307);
const WP_MYSQL_ROOT_PASSWORD = process.env.WP_MYSQL_ROOT_PASSWORD || 'wpimport';
const WP_MYSQL_DATABASE = process.env.WP_MYSQL_DATABASE || 'civicpre_wp1';

const CANONICAL_CATEGORIES = [
  { name: 'Politică', slug: 'politica', color: '#c0392b', menuOrder: 1 },
  { name: 'Economie', slug: 'economie', color: '#2980b9', menuOrder: 2 },
  { name: 'Justiție', slug: 'justitie', color: '#8e44ad', menuOrder: 3 },
  { name: 'Social', slug: 'social', color: '#27ae60', menuOrder: 4 },
  { name: 'Externe', slug: 'externe', color: '#d35400', menuOrder: 5 },
  { name: 'Educație', slug: 'educatie', color: '#16a085', menuOrder: 6 },
  { name: 'Cultură-Media', slug: 'cultura-media', color: '#f39c12', menuOrder: 7 },
  { name: 'Sport', slug: 'sport', color: '#2c3e50', menuOrder: 8 },
  { name: 'Video', slug: 'video', color: '#e74c3c', menuOrder: 9 },
] as const;

const CANONICAL_SLUG_MAP: Record<string, string> = {
  politica: 'politica',
  politică: 'politica',
  'politica-2': 'politica',
  economie: 'economie',
  'economie-2': 'economie',
  justitie: 'justitie',
  justiție: 'justitie',
  'justitie-2': 'justitie',
  social: 'social',
  'social-2': 'social',
  externe: 'externe',
  'externe-2': 'externe',
  educatie: 'educatie',
  educație: 'educatie',
  'educatie-2': 'educatie',
  'cultura-media': 'cultura-media',
  'cultură-media': 'cultura-media',
  'cultura media': 'cultura-media',
  'cultura-media-2': 'cultura-media',
  sport: 'sport',
  'sport-2': 'sport',
  video: 'video',
  'video-2': 'video',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface WpPostRow {
  ID: number;
  post_author: number;
  post_date: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_name: string;
}

interface WpUserRow {
  ID: number;
  user_nicename: string;
  display_name: string;
  user_email: string;
}

interface WpTermRow {
  term_id: number;
  name: string;
  slug: string;
  term_taxonomy_id: number;
  taxonomy: string;
  description: string;
  parent: number;
}

interface WpTermRelRow {
  object_id: number;
  term_taxonomy_id: number;
  taxonomy: string;
}

interface WpAttachmentRow {
  ID: number;
  guid: string;
  post_mime_type: string;
  attached_file: string | null;
}

interface WpMetaRow {
  post_id: number;
  meta_key: string;
  meta_value: string;
}

interface ImportReport {
  sourcePosts: number;
  importedPosts: number;
  importedUsers: number;
  importedCategories: number;
  importedTags: number;
  heroImages: number;
  inlineImages: number;
  missingMedia: string[];
  skippedPosts: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extToMime(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function parsePhpDimensions(serialized: string | undefined): { width?: number; height?: number } {
  if (!serialized) return {};
  const width = serialized.match(/s:5:"width";i:(\d+)/)?.[1];
  const height = serialized.match(/s:6:"height";i:(\d+)/)?.[1];
  return {
    width: width ? Number(width) : undefined,
    height: height ? Number(height) : undefined,
  };
}

function uploadsRelativeFromUrl(url: string): string | null {
  const decoded = url.replace(/&amp;/g, '&').trim();
  const patterns = [/\/wp-content\/uploads\/(.+?)(?:['")\s]|$)/i, /^\/wp-content\/uploads\/(.+)$/i];
  for (const re of patterns) {
    const m = decoded.match(re);
    if (m?.[1]) return m[1].split('?')[0];
  }
  return null;
}

async function docker(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('docker', args, { maxBuffer: 1024 * 1024 * 512 });
}

async function isContainerRunning(name: string): Promise<boolean> {
  try {
    const { stdout } = await docker(['inspect', '-f', '{{.State.Running}}', name]);
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function waitForMariaDb(attempts = 60): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await wpMysqlExec('SELECT 1');
      return;
    } catch {
      await sleep(2000);
    }
  }
  throw new Error('MariaDB did not become ready in time');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wpMysqlExec(sql: string): Promise<string> {
  const { stdout } = await docker([
    'exec',
    WP_CONTAINER,
    'mysql',
    '-uroot',
    `-p${WP_MYSQL_ROOT_PASSWORD}`,
    '--default-character-set=utf8mb4',
    '-N',
    '-B',
    WP_MYSQL_DATABASE,
    '-e',
    sql,
  ]);
  return stdout;
}

async function wpPostsCount(): Promise<number> {
  try {
    const rows = await wpQueryJson<{ cnt: number }>(
      `SELECT JSON_OBJECT('cnt', COUNT(*)) AS row FROM wp_posts`,
    );
    return rows[0]?.cnt ?? 0;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("doesn't exist") || msg.includes('1146')) return 0;
    throw e;
  }
}

async function wpQueryTsv(sql: string): Promise<string[][]> {
  const { stdout } = await docker([
    'exec',
    WP_CONTAINER,
    'mysql',
    '-uroot',
    `-p${WP_MYSQL_ROOT_PASSWORD}`,
    '--default-character-set=utf8mb4',
    '-N',
    '-B',
    WP_MYSQL_DATABASE,
    '-e',
    sql,
  ]);

  return stdout
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t'));
}

function decodeHexField(value: string | undefined): string {
  if (!value) return '';
  return Buffer.from(value, 'hex').toString('utf8');
}
async function wpQueryJson<T>(sql: string): Promise<T[]> {
  const { stdout } = await docker([
    'exec',
    WP_CONTAINER,
    'mysql',
    '-uroot',
    `-p${WP_MYSQL_ROOT_PASSWORD}`,
    '--default-character-set=utf8mb4',
    '-N',
    '-B',
    WP_MYSQL_DATABASE,
    '-e',
    sql,
  ]);

  const rows: T[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed) as T);
    } catch (e) {
      console.warn('  [wp-sql] failed to parse JSON row:', trimmed.slice(0, 120));
    }
  }
  return rows;
}

async function wpQueryRaw(sql: string): Promise<string> {
  const { stdout } = await docker([
    'exec',
    WP_CONTAINER,
    'mysql',
    '-uroot',
    `-p${WP_MYSQL_ROOT_PASSWORD}`,
    '--default-character-set=utf8mb4',
    '-N',
    WP_MYSQL_DATABASE,
    '-e',
    sql,
  ]);
  return stdout.replace(/\r?\n$/, '');
}

async function wpQueryTerms(): Promise<WpTermRow[]> {
  const rows = await wpQueryTsv(`
    SELECT
      t.term_id,
      HEX(t.name),
      t.slug,
      tt.term_taxonomy_id,
      tt.taxonomy,
      HEX(IFNULL(tt.description, '')),
      tt.parent
    FROM wp_terms t
    JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
    WHERE tt.taxonomy IN ('category', 'post_tag')
  `);

  return rows.map((row) => ({
    term_id: Number(row[0]),
    name: decodeHexField(row[1]),
    slug: row[2],
    term_taxonomy_id: Number(row[3]),
    taxonomy: row[4],
    description: decodeHexField(row[5]),
    parent: Number(row[6]),
  }));
}

async function loadWpPosts(): Promise<WpPostRow[]> {
  const metaRows = await wpQueryTsv(`
    SELECT
      ID,
      post_author,
      post_date,
      HEX(post_title),
      HEX(IFNULL(post_excerpt, '')),
      post_name
    FROM wp_posts
    WHERE post_type = 'post' AND post_status = 'publish'
    ORDER BY ID ASC
  `);

  const posts: WpPostRow[] = [];
  let idx = 0;
  for (const row of metaRows) {
    idx++;
    const contentHex = await wpQueryRaw(
      `SELECT HEX(post_content) FROM wp_posts WHERE ID=${Number(row[0])}`,
    );
    posts.push({
      ID: Number(row[0]),
      post_author: Number(row[1]),
      post_date: row[2],
      post_content: decodeHexField(contentHex),
      post_title: decodeHexField(row[3]),
      post_excerpt: decodeHexField(row[4]),
      post_name: row[5],
    });
    if (idx % 50 === 0 || idx === metaRows.length) {
      console.log(`  loaded posts ${idx}/${metaRows.length}`);
    }
  }

  return posts;
}

async function ensureWpMariaDb(): Promise<void> {
  if (process.env.WP_MYSQL_HOST) {
    console.log(
      `Using external WP MariaDB at ${process.env.WP_MYSQL_HOST}:${process.env.WP_MYSQL_PORT || 3306}`,
    );
    return;
  }

  if (!fs.existsSync(WP_SQL_PATH)) {
    throw new Error(`WordPress SQL dump not found: ${WP_SQL_PATH}`);
  }

  let running = await isContainerRunning(WP_CONTAINER);
  if (!running) {
    const exists = await containerExists(WP_CONTAINER);
    if (exists) {
      console.log(`Starting existing container ${WP_CONTAINER}...`);
      await docker(['start', WP_CONTAINER]);
    } else {
      console.log(`Creating MariaDB container ${WP_CONTAINER} on port ${WP_DOCKER_PORT}...`);
      await docker([
        'run',
        '-d',
        '--name',
        WP_CONTAINER,
        '-e',
        `MYSQL_ROOT_PASSWORD=${WP_MYSQL_ROOT_PASSWORD}`,
        '-e',
        `MYSQL_DATABASE=${WP_MYSQL_DATABASE}`,
        '-p',
        `${WP_DOCKER_PORT}:3306`,
        'mariadb:10.5',
      ]);
    }
    running = true;
    console.log('Waiting for MariaDB...');
    await waitForMariaDb();
  }

  const existing = await wpPostsCount();
  if (existing > 0) {
    console.log(`  WP database already loaded (${existing} wp_posts rows)`);
    return;
  }

  console.log(`Importing WordPress SQL dump from ${WP_SQL_PATH} (may take a few minutes)...`);
  await importSqlDump();
  const after = await wpPostsCount();
  console.log(`  Imported ${after} wp_posts rows`);
}

async function containerExists(name: string): Promise<boolean> {
  try {
    await docker(['inspect', name]);
    return true;
  } catch {
    return false;
  }
}

async function importSqlDump(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'docker',
      [
        'exec',
        '-i',
        WP_CONTAINER,
        'mysql',
        '-uroot',
        `-p${WP_MYSQL_ROOT_PASSWORD}`,
        '--default-character-set=utf8mb4',
        WP_MYSQL_DATABASE,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );

    const stream = fs.createReadStream(WP_SQL_PATH);
    stream.pipe(proc.stdin!);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`SQL import exited with code ${code}`));
    });
  });
}

// ─── WP data extraction ───────────────────────────────────────────────────────

async function loadWpData() {
  console.log('\n📖 Reading WordPress data from SQL database...');

  const posts = await loadWpPosts();

  const users = await wpQueryJson<WpUserRow>(`
    SELECT JSON_OBJECT(
      'ID', ID,
      'user_nicename', user_nicename,
      'display_name', display_name,
      'user_email', user_email
    ) AS row
    FROM wp_users
  `);

  const terms = await wpQueryTerms();

  const termRels = await wpQueryJson<WpTermRelRow>(`
    SELECT JSON_OBJECT(
      'object_id', tr.object_id,
      'term_taxonomy_id', tr.term_taxonomy_id,
      'taxonomy', tt.taxonomy
    ) AS row
    FROM wp_term_relationships tr
    JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    WHERE tt.taxonomy IN ('category', 'post_tag')
  `);

  const attachments = await wpQueryJson<WpAttachmentRow>(`
    SELECT JSON_OBJECT(
      'ID', p.ID,
      'guid', p.guid,
      'post_mime_type', IFNULL(p.post_mime_type, ''),
      'attached_file', pm.meta_value
    ) AS row
    FROM wp_posts p
    LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = '_wp_attached_file'
    WHERE p.post_type = 'attachment'
  `);

  const postMeta = await wpQueryJson<WpMetaRow>(`
    SELECT JSON_OBJECT(
      'post_id', post_id,
      'meta_key', meta_key,
      'meta_value', meta_value
    ) AS row
    FROM wp_postmeta
    WHERE meta_key IN (
      '_thumbnail_id',
      '_yoast_wpseo_title',
      '_yoast_wpseo_metadesc',
      '_wp_attached_file',
      '_wp_attachment_image_alt'
    )
  `);

  console.log(`  ${posts.length} published posts`);
  console.log(`  ${users.length} users`);
  console.log(`  ${terms.filter((t) => t.taxonomy === 'category').length} categories`);
  console.log(`  ${terms.filter((t) => t.taxonomy === 'post_tag').length} tags`);
  console.log(`  ${attachments.length} attachments`);

  return { posts, users, terms, termRels, attachments, postMeta };
}

// ─── Media import ─────────────────────────────────────────────────────────────

const mediaCacheByRelativePath = new Map<string, string>();
const mediaCacheByAttachmentId = new Map<number, string>();
const missingMedia: string[] = [];

function resolveLocalUpload(relativePath: string): string | null {
  const normalized = relativePath.replace(/^\/+/, '');
  const full = path.join(WP_UPLOADS_PATH, normalized);
  if (fs.existsSync(full)) return full;
  return null;
}

function resolveOriginalUploadPath(relativePath: string): string | null {
  const direct = resolveLocalUpload(relativePath);
  if (direct) return direct;

  // Fall back to the original file when HTML references a WP-generated size suffix.
  const withoutSize = relativePath.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');
  if (withoutSize !== relativePath) {
    return resolveLocalUpload(withoutSize);
  }
  return null;
}

async function importMediaFile(
  sourcePath: string,
  destFilename: string,
  meta: {
    mimeType: string;
    width?: number | null;
    height?: number | null;
    alt?: string | null;
    caption?: string | null;
    sizeBytes?: number | null;
  },
): Promise<string | null> {
  if (DRY_RUN) return 'dry-run-media-id';

  ensureDir(STORAGE_ORIG);
  const destPath = path.join(STORAGE_ORIG, destFilename);

  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(sourcePath, destPath);
  }

  let media = await prisma.media.findFirst({ where: { path: destFilename } });
  if (!media) {
    media = await prisma.media.create({
      data: {
        filename: destFilename,
        mimeType: meta.mimeType,
        width: meta.width ?? null,
        height: meta.height ?? null,
        sizeBytes: meta.sizeBytes ?? fs.statSync(destPath).size,
        alt: meta.alt ?? null,
        caption: meta.caption ?? null,
        path: destFilename,
      },
    });
  }

  return media.id;
}

async function importAttachmentMedia(
  attachmentId: number,
  attachments: Map<number, WpAttachmentRow>,
  metaByPostId: Map<number, Map<string, string>>,
): Promise<string | null> {
  const cached = mediaCacheByAttachmentId.get(attachmentId);
  if (cached) return cached;

  const attachment = attachments.get(attachmentId);
  if (!attachment) return null;

  const meta = metaByPostId.get(attachmentId);
  const relative =
    meta?.get('_wp_attached_file') ||
    attachment.attached_file ||
    uploadsRelativeFromUrl(attachment.guid);
  if (!relative) {
    missingMedia.push(`attachment:${attachmentId}:no-path`);
    return null;
  }

  const localPath = resolveOriginalUploadPath(relative);
  if (!localPath) {
    missingMedia.push(`attachment:${attachmentId}:${relative}`);
    return null;
  }

  const ext = path.extname(relative) || '.jpg';
  const destFilename = `wp-att-${attachmentId}${ext}`;
  const dims = parsePhpDimensions(meta?.get('_wp_attachment_metadata'));
  const mime = attachment.post_mime_type || extToMime(ext);

  const mediaId = await importMediaFile(localPath, destFilename, {
    mimeType: mime,
    width: dims.width ?? null,
    height: dims.height ?? null,
    alt: meta?.get('_wp_attachment_image_alt') || null,
  });

  if (mediaId) {
    mediaCacheByAttachmentId.set(attachmentId, mediaId);
    mediaCacheByRelativePath.set(relative, mediaId);
  }
  return mediaId;
}

async function importMediaByRelativePath(
  relativePath: string,
  cacheKey: string,
  attachments: Map<number, WpAttachmentRow>,
  metaByPostId: Map<number, Map<string, string>>,
): Promise<string | null> {
  const cached = mediaCacheByRelativePath.get(relativePath);
  if (cached) return cached;

  const localPath = resolveLocalUpload(relativePath);
  if (!localPath) {
    missingMedia.push(`file:${relativePath}`);
    return null;
  }

  // Try to find matching attachment for richer metadata
  let attachmentId: number | null = null;
  for (const [id, att] of attachments) {
    const meta = metaByPostId.get(id);
    const rel = meta?.get('_wp_attached_file') || att.attached_file;
    if (rel === relativePath) {
      attachmentId = id;
      break;
    }
  }

  if (attachmentId) {
    return importAttachmentMedia(attachmentId, attachments, metaByPostId);
  }

  const ext = path.extname(relativePath) || '.jpg';
  const destFilename = `wp-file-${cacheKey}${ext}`;
  const mediaId = await importMediaFile(localPath, destFilename, {
    mimeType: extToMime(ext),
  });
  if (mediaId) mediaCacheByRelativePath.set(relativePath, mediaId);
  return mediaId;
}

async function localizeContentImages(
  html: string,
  postExtId: string,
  attachments: Map<number, WpAttachmentRow>,
  metaByPostId: Map<number, Map<string, string>>,
): Promise<{ html: string; count: number }> {
  if (!html) return { html, count: 0 };

  let result = html;
  let count = 0;
  const tags = Array.from(new Set(html.match(/<img\b[^>]*>/gi) ?? []));

  for (let idx = 0; idx < tags.length; idx++) {
    const tag = tags[idx];
    const srcMatch = tag.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (!/^https?:\/\//i.test(src) && !src.includes('/wp-content/uploads/')) continue;

    const relative = uploadsRelativeFromUrl(src);
    if (!relative) continue;

    const mediaId = await importMediaByRelativePath(
      relative,
      `${postExtId}-inline-${idx}`,
      attachments,
      metaByPostId,
    );
    if (!mediaId) continue;

    const localUrl = `${MEDIA_BASE}/v1/media/${mediaId}/orig`;
    const newTag = tag
      .replace(/\ssrcset=["'][^"']*["']/i, '')
      .replace(/\ssizes=["'][^"']*["']/i, '')
      .replace(/\ssrc=["'][^"']+["']/i, ` src="${localUrl}"`);
    result = result.split(tag).join(newTag);
    count++;
  }

  return { html: result, count };
}

// ─── CivicPress cleanup + import ──────────────────────────────────────────────

async function ensureDefaultCategories(): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  for (const cat of CANONICAL_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        showInMenu: true,
        showInMobileMenu: true,
        showInMobileRow: true,
        menuOrder: cat.menuOrder,
      },
      update: {
        name: cat.name,
        color: cat.color,
        showInMenu: true,
        showInMobileMenu: true,
        showInMobileRow: true,
        menuOrder: cat.menuOrder,
      },
    });
    idMap.set(cat.slug, record.id);
  }
  return idMap;
}

async function cleanupExistingPosts(): Promise<number> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const keepMediaIds = new Set<string>();
  if (settings?.logoMediaId) keepMediaIds.add(settings.logoMediaId);
  if (settings?.faviconMediaId) keepMediaIds.add(settings.faviconMediaId);

  const avatarUsers = await prisma.user.findMany({
    where: { avatarMediaId: { not: null } },
    select: { avatarMediaId: true },
  });
  for (const u of avatarUsers) {
    if (u.avatarMediaId) keepMediaIds.add(u.avatarMediaId);
  }

  const postCount = await prisma.post.count();
  console.log(`\n🗑️  Deleting ${postCount} existing CivicPress posts...`);

  if (DRY_RUN) return postCount;

  await prisma.post.deleteMany({});
  const deletedMedia = await prisma.media.deleteMany({
    where: keepMediaIds.size > 0 ? { id: { notIn: Array.from(keepMediaIds) } } : {},
  });
  console.log(
    `  Removed ${deletedMedia.count} media files from DB (kept ${keepMediaIds.size} site/avatar media)`,
  );
  return postCount;
}

async function importWpData(
  data: Awaited<ReturnType<typeof loadWpData>>,
  canonicalIds: Map<string, string>,
): Promise<ImportReport> {
  const { posts, users, terms, termRels, attachments, postMeta } = data;

  const attachmentsMap = new Map<number, WpAttachmentRow>();
  for (const a of attachments) attachmentsMap.set(a.ID, a);

  const metaByPostId = new Map<number, Map<string, string>>();
  for (const m of postMeta) {
    if (!metaByPostId.has(m.post_id)) metaByPostId.set(m.post_id, new Map());
    metaByPostId.get(m.post_id)!.set(m.meta_key, m.meta_value);
  }

  const categories = terms.filter((t) => t.taxonomy === 'category');
  const tags = terms.filter((t) => t.taxonomy === 'post_tag');

  const termTaxIdToTerm = new Map<number, WpTermRow>();
  for (const t of terms) termTaxIdToTerm.set(t.term_taxonomy_id, t);

  const postCategories = new Map<number, number[]>();
  const postTags = new Map<number, number[]>();
  for (const rel of termRels) {
    if (rel.taxonomy === 'category') {
      if (!postCategories.has(rel.object_id)) postCategories.set(rel.object_id, []);
      postCategories.get(rel.object_id)!.push(rel.term_taxonomy_id);
    } else if (rel.taxonomy === 'post_tag') {
      if (!postTags.has(rel.object_id)) postTags.set(rel.object_id, []);
      postTags.get(rel.object_id)!.push(rel.term_taxonomy_id);
    }
  }

  // Import users
  const userIdMap = new Map<number, string>();
  for (const user of users) {
    if (DRY_RUN) {
      userIdMap.set(user.ID, `dry-user-${user.ID}`);
      continue;
    }
    const slug = normalizeSlug(user.user_nicename || user.display_name || `user-${user.ID}`);
    const email = user.user_email?.includes('@') ? user.user_email : `${slug}@civicpress.internal`;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ slug }, { email }] },
    });
    const record = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { displayName: user.display_name, bio: null },
        })
      : await prisma.user.create({
          data: {
            displayName: user.display_name,
            slug,
            email,
            passwordHash: 'placeholder',
          },
        });
    userIdMap.set(user.ID, record.id);
  }

  // Import categories
  const catIdMap = new Map<number, string>();
  for (const cat of categories) {
    const normalizedSlug = normalizeSlug(cat.slug);
    const canonicalSlug =
      CANONICAL_SLUG_MAP[cat.slug] ?? CANONICAL_SLUG_MAP[normalizedSlug] ?? null;

    if (DRY_RUN) {
      catIdMap.set(cat.term_taxonomy_id, `dry-cat-${cat.term_taxonomy_id}`);
      continue;
    }

    if (canonicalSlug && canonicalIds.has(canonicalSlug)) {
      const dbId = canonicalIds.get(canonicalSlug)!;
      await prisma.category.update({
        where: { id: dbId },
        data: { externalId: String(cat.term_id) },
      });
      catIdMap.set(cat.term_taxonomy_id, dbId);
    } else {
      const existing =
        (await prisma.category.findUnique({ where: { slug: normalizedSlug } })) ??
        (await prisma.category.findFirst({ where: { externalId: String(cat.term_id) } }));

      const record = existing
        ? await prisma.category.update({
            where: { id: existing.id },
            data: {
              name: cat.name,
              slug: normalizedSlug,
              description: cat.description || null,
              showInMenu: false,
              showInMobileMenu: false,
              showInMobileRow: false,
              externalId: String(cat.term_id),
            },
          })
        : await prisma.category.create({
            data: {
              name: cat.name,
              slug: normalizedSlug,
              description: cat.description || null,
              showInMenu: false,
              showInMobileMenu: false,
              showInMobileRow: false,
              menuOrder: 99,
              externalId: String(cat.term_id),
            },
          });
      catIdMap.set(cat.term_taxonomy_id, record.id);
    }
  }

  // Import tags
  const tagIdMap = new Map<number, string>();
  for (const tag of tags) {
    const normalizedSlug = normalizeSlug(tag.slug);
    if (DRY_RUN) {
      tagIdMap.set(tag.term_taxonomy_id, `dry-tag-${tag.term_taxonomy_id}`);
      continue;
    }

    const existing =
      (await prisma.tag.findUnique({ where: { slug: normalizedSlug } })) ??
      (await prisma.tag.findFirst({ where: { externalId: String(tag.term_id) } }));

    const record = existing
      ? await prisma.tag.update({
          where: { id: existing.id },
          data: { name: tag.name, slug: normalizedSlug, externalId: String(tag.term_id) },
        })
      : await prisma.tag.create({
          data: {
            name: tag.name,
            slug: normalizedSlug,
            externalId: String(tag.term_id),
          },
        });
    tagIdMap.set(tag.term_taxonomy_id, record.id);
  }

  // Import posts
  let importedPosts = 0;
  let heroImages = 0;
  let inlineImages = 0;
  const skippedPosts: string[] = [];

  console.log(`\n📦 Importing ${posts.length} posts...`);

  const usedSlugs = new Set<string>();

  async function uniqueSlug(base: string): Promise<string> {
    let slug = base || 'post';
    let n = 2;
    while (usedSlugs.has(slug) || (await prisma.post.findUnique({ where: { slug } }))) {
      slug = `${base}-${n++}`;
    }
    usedSlugs.add(slug);
    return slug;
  }

  for (const post of posts) {
    const extId = String(post.ID);
    const title = stripHtml(post.post_title);
    if (!title) {
      skippedPosts.push(`${extId}:empty-title`);
      continue;
    }

    const meta = metaByPostId.get(post.ID);
    const excerpt = stripHtml(post.post_excerpt || '');

    let heroMediaId: string | null = null;
    const thumbnailId = meta?.get('_thumbnail_id');
    if (thumbnailId) {
      heroMediaId = await importAttachmentMedia(Number(thumbnailId), attachmentsMap, metaByPostId);
      if (heroMediaId) heroImages++;
    }

    const localized = await localizeContentImages(
      post.post_content,
      extId,
      attachmentsMap,
      metaByPostId,
    );
    inlineImages += localized.count;

    const authorId = userIdMap.get(post.post_author) ?? null;
    const authorUser = users.find((u) => u.ID === post.post_author);
    const authorName = authorUser?.display_name?.trim() || null;

    if (DRY_RUN) {
      importedPosts++;
      if (importedPosts % 100 === 0) {
        console.log(`  [dry-run] ${importedPosts}/${posts.length} posts processed`);
      }
      continue;
    }

    const slug = await uniqueSlug(post.post_name || normalizeSlug(title));

    const dbPost = await prisma.post.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        contentHtml: localized.html,
        publishedAt: new Date(post.post_date),
        heroMediaId,
        authorId,
        authorName,
        status: 'PUBLISHED',
        externalId: extId,
        seoTitle: meta?.get('_yoast_wpseo_title') || null,
        seoDescription: meta?.get('_yoast_wpseo_metadesc') || null,
      },
    });

    const catTaxIds = postCategories.get(post.ID) ?? [];
    for (let i = 0; i < catTaxIds.length; i++) {
      const catDbId = catIdMap.get(catTaxIds[i]);
      if (catDbId) {
        await prisma.postCategory.create({
          data: { postId: dbPost.id, categoryId: catDbId, isPrimary: i === 0 },
        });
      }
    }

    const tagTaxIds = postTags.get(post.ID) ?? [];
    for (const taxId of tagTaxIds) {
      const tagDbId = tagIdMap.get(taxId);
      if (tagDbId) {
        await prisma.postTag.create({ data: { postId: dbPost.id, tagId: tagDbId } });
      }
    }

    importedPosts++;
    if (importedPosts % 50 === 0 || importedPosts === posts.length) {
      console.log(`  [post] ${importedPosts}/${posts.length}: ${title.slice(0, 60)}`);
    }
  }

  return {
    sourcePosts: posts.length,
    importedPosts,
    importedUsers: users.length,
    importedCategories: categories.length,
    importedTags: tags.length,
    heroImages,
    inlineImages,
    missingMedia,
    skippedPosts,
  };
}

function printReport(report: ImportReport, deletedPosts: number) {
  console.log('\n📊 Import report');
  console.log(`  Deleted existing posts: ${deletedPosts}`);
  console.log(`  Source WP posts:        ${report.sourcePosts}`);
  console.log(`  Imported posts:         ${report.importedPosts}`);
  console.log(`  Users:                  ${report.importedUsers}`);
  console.log(`  Categories:             ${report.importedCategories}`);
  console.log(`  Tags:                   ${report.importedTags}`);
  console.log(`  Hero images:            ${report.heroImages}`);
  console.log(`  Inline images:          ${report.inlineImages}`);
  console.log(`  Missing media files:    ${report.missingMedia.length}`);
  if (report.missingMedia.length > 0) {
    console.log('  First missing media:');
    for (const m of report.missingMedia.slice(0, 10)) console.log(`    - ${m}`);
    if (report.missingMedia.length > 10) {
      console.log(`    ... and ${report.missingMedia.length - 10} more`);
    }
  }
  if (report.skippedPosts.length > 0) {
    console.log(`  Skipped posts:          ${report.skippedPosts.length}`);
  }
}

async function cleanupOrphanCategories() {
  if (DRY_RUN) return;
  try {
    const deleted = await prisma.category.deleteMany({
      where: { showInMenu: false, posts: { none: {} } },
    });
    if (deleted.count > 0) {
      console.log(`  🧹 Removed ${deleted.count} orphan non-menu categories`);
    }
  } catch (e) {
    console.warn('  ⚠️  Orphan category cleanup skipped:', e);
  }
}

async function main() {
  console.log('🌱 CivicPress WP SQL seed starting...');
  console.log(`   SQL:     ${WP_SQL_PATH}`);
  console.log(`   Uploads: ${WP_UPLOADS_PATH}`);
  console.log(
    `   DB:      ${process.env.DATABASE_URL || 'postgresql://civicpress:civicpress@localhost:5432/civicpress'}`,
  );
  if (DRY_RUN) console.log('   Mode:    DRY RUN (no writes)');

  if (!fs.existsSync(WP_SQL_PATH)) {
    throw new Error(`SQL dump not found: ${WP_SQL_PATH}`);
  }
  if (!fs.existsSync(WP_UPLOADS_PATH)) {
    throw new Error(`Uploads folder not found: ${WP_UPLOADS_PATH}`);
  }

  try {
    await ensureWpMariaDb();
    const wpData = await loadWpData();
    const canonicalIds = DRY_RUN ? new Map<string, string>() : await ensureDefaultCategories();
    const deletedPosts = await cleanupExistingPosts();
    const report = await importWpData(wpData, canonicalIds);
    await cleanupOrphanCategories();
    printReport(report, deletedPosts);

    if (!DRY_RUN) {
      const finalCount = await prisma.post.count({ where: { status: 'PUBLISHED' } });
      console.log(`\n✅ CivicPress now has ${finalCount} published posts`);
    } else {
      console.log('\n✅ Dry run complete (no database changes)');
    }
  } catch (e) {
    console.error('\n❌ WP SQL seed failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    if (process.env.WP_DOCKER_KEEP !== '1' && !process.env.WP_MYSQL_HOST) {
      try {
        if (await isContainerRunning(WP_CONTAINER)) {
          console.log(
            `\nStopping temporary MariaDB container ${WP_CONTAINER} (set WP_DOCKER_KEEP=1 to keep)...`,
          );
          await docker(['stop', WP_CONTAINER]);
        }
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

main();
