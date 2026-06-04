/**
 * Seed script: populates the DB from civicpress.ro WP REST API.
 * Fallback: cheerio HTML scraper if WP REST is unavailable.
 *
 * Run: pnpm seed (from repo root)
 */
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL || 'postgresql://civicpress:civicpress@localhost:5432/civicpress',
    },
  },
});

const BASE_URL = 'https://www.civicpress.ro';
const STORAGE_ORIG = path.resolve(__dirname, '../apps/backend/storage/media/orig');

// Canonical 9 menu categories — the source of truth
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

// All slug variants that map to each canonical slug (WP can return with/without diacritics, with -2 suffixes, etc.)
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

function downloadFile(
  urlStr: string,
  destPath: string,
): Promise<{ size: number; contentType: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(urlStr, { timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
        return;
      }
      const contentType = res.headers['content-type'] ?? 'image/jpeg';
      const out = fs.createWriteStream(destPath);
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
      });
      res.pipe(out);
      out.on('finish', () => resolve({ size, contentType }));
      out.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout downloading ${urlStr}`));
    });
  });
}

async function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'CivicpressSeeder/1.0',
        Accept: 'application/json',
      },
      timeout: 10000,
    };
    const req = client.get(options, (res) => {
      let data = '';
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

interface WPCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  parent: number;
}

interface WPUser {
  id: number;
  slug: string;
  name: string;
  description: string;
}

interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  caption: { rendered: string };
  media_details: { width?: number; height?: number };
}

interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  featured_media: number;
  categories: number[];
  tags: number[];
  author: number;
  yoast_head_json?: { title?: string; description?: string };
  _embedded?: {
    'wp:featuredmedia'?: WPMedia[];
    author?: WPUser[];
  };
}

async function saveMedia(url: string, postId: string): Promise<string | null> {
  ensureDir(STORAGE_ORIG);
  const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
  const filename = `${postId}${ext}`;
  const destPath = path.join(STORAGE_ORIG, filename);

  if (fs.existsSync(destPath)) {
    console.log(`  [media] already downloaded: ${filename}`);
  } else {
    try {
      console.log(`  [media] downloading: ${url}`);
      await downloadFile(url, destPath);
    } catch (e) {
      console.warn(`  [media] failed to download ${url}: ${e}`);
      return null;
    }
  }

  return filename;
}

/**
 * Ensure canonical 9 categories exist with correct color/menuOrder/showInMenu.
 * Returns a map of canonical slug → DB id.
 */
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
        menuOrder: cat.menuOrder,
      },
      update: { name: cat.name, color: cat.color, showInMenu: true, menuOrder: cat.menuOrder },
    });
    idMap.set(cat.slug, record.id);
  }
  console.log('\n  ✅ Default categories ensured');
  return idMap;
}

async function seedViaWpRest(canonicalIds: Map<string, string>) {
  console.log('\n🌐 Attempting WP REST API...');

  const testUrl = `${BASE_URL}/wp-json/wp/v2/posts?per_page=1`;
  let categories: WPCategory[] = [];
  let users: WPUser[] = [];
  let posts: WPPost[] = [];

  try {
    await fetchJson(testUrl);
    console.log('✅ WP REST API accessible');
  } catch {
    console.log('❌ WP REST API not accessible, skipping WP import');
    return false;
  }

  try {
    categories = (await fetchJson(
      `${BASE_URL}/wp-json/wp/v2/categories?per_page=100`,
    )) as WPCategory[];
    console.log(`  [wp-rest] ${categories.length} categories`);
  } catch (e) {
    console.warn('  [wp-rest] failed to fetch categories:', e);
  }

  try {
    users = (await fetchJson(`${BASE_URL}/wp-json/wp/v2/users?per_page=100`)) as WPUser[];
    console.log(`  [wp-rest] ${users.length} users`);
  } catch (e) {
    console.warn('  [wp-rest] failed to fetch users:', e);
  }

  try {
    posts = (await fetchJson(
      `${BASE_URL}/wp-json/wp/v2/posts?per_page=30&_embed=1&orderby=date&order=desc`,
    )) as WPPost[];
    console.log(`  [wp-rest] ${posts.length} posts`);
  } catch (e) {
    console.warn('  [wp-rest] failed to fetch posts:', e);
    return false;
  }

  await ingestWpData({ categories, users, posts, canonicalIds });
  return true;
}

async function ingestWpData({
  categories,
  users,
  posts,
  canonicalIds,
}: {
  categories: WPCategory[];
  users: WPUser[];
  posts: WPPost[];
  canonicalIds: Map<string, string>;
}) {
  console.log('\n📦 Ingesting data into DB...');

  /**
   * Build WP category id → canonical DB id map.
   * For each WP category:
   *   1. Normalize the slug and check if it maps to one of the canonical 9.
   *   2. If yes → update the existing canonical row's externalId, reuse its DB id.
   *   3. If no  → upsert a non-menu category row (showInMenu: false).
   */
  const catIdMap = new Map<number, string>();

  for (const cat of categories) {
    const normalizedSlug = normalizeSlug(cat.slug);
    const canonicalSlug =
      CANONICAL_SLUG_MAP[cat.slug] ?? CANONICAL_SLUG_MAP[normalizedSlug] ?? null;

    if (canonicalSlug && canonicalIds.has(canonicalSlug)) {
      // Map WP category onto the pre-existing canonical row
      const dbId = canonicalIds.get(canonicalSlug)!;
      await prisma.category.update({
        where: { id: dbId },
        data: { externalId: String(cat.id) },
      });
      catIdMap.set(cat.id, dbId);
      console.log(`  [cat] WP "${cat.slug}" → canonical "${canonicalSlug}"`);
    } else {
      // Non-canonical — store with showInMenu: false so it doesn't pollute the menu
      const existing =
        (await prisma.category.findUnique({ where: { slug: normalizedSlug } })) ??
        (await prisma.category.findFirst({ where: { externalId: String(cat.id) } }));

      const record = existing
        ? await prisma.category.update({
            where: { id: existing.id },
            data: {
              name: cat.name,
              slug: normalizedSlug,
              description: cat.description || null,
              showInMenu: false,
              externalId: String(cat.id),
            },
          })
        : await prisma.category.create({
            data: {
              name: cat.name,
              slug: normalizedSlug,
              description: cat.description || null,
              showInMenu: false,
              menuOrder: 99,
              externalId: String(cat.id),
            },
          });
      catIdMap.set(cat.id, record.id);
    }
  }
  console.log(`  ✅ ${catIdMap.size} WP categories mapped`);

  // Upsert users (WP authors get placeholder credentials — real users are seeded separately)
  const userIdMap = new Map<number, string>();
  for (const user of users) {
    const email = `${user.slug}@civicpress.internal`;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ slug: user.slug }, { email }] },
    });
    const record = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { displayName: user.name, bio: user.description || null },
        })
      : await prisma.user.create({
          data: {
            displayName: user.name,
            slug: user.slug,
            email,
            passwordHash: 'placeholder',
            bio: user.description || null,
          },
        });
    userIdMap.set(user.id, record.id);
  }
  console.log(`  ✅ ${userIdMap.size} users`);

  // Upsert posts
  let postCount = 0;
  for (const post of posts) {
    const extId = String(post.id);

    // Hero media
    let mediaDbId: string | null = null;
    const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
    if (featuredMedia?.source_url) {
      const filename = await saveMedia(featuredMedia.source_url, `wp-${post.id}`);
      if (filename) {
        const existing = await prisma.media
          .findFirst({ where: { path: filename } })
          .catch(() => null);
        if (existing) {
          mediaDbId = existing.id;
        } else {
          const m = await prisma.media.create({
            data: {
              filename,
              mimeType: 'image/jpeg',
              width: featuredMedia.media_details?.width ?? null,
              height: featuredMedia.media_details?.height ?? null,
              alt: featuredMedia.alt_text || null,
              caption: featuredMedia.caption?.rendered?.replace(/<[^>]*>/g, '') || null,
              path: filename,
            },
          });
          mediaDbId = m.id;
        }
      }
    }

    const authorId = post.author ? (userIdMap.get(post.author) ?? null) : null;
    const title = post.title.rendered.replace(/<[^>]*>/g, '');
    const excerpt = post.excerpt.rendered.replace(/<[^>]*>/g, '').trim();

    const existing = await prisma.post.findUnique({ where: { externalId: extId } });
    const dbPost = existing
      ? await prisma.post.update({
          where: { externalId: extId },
          data: {
            title,
            excerpt: excerpt || null,
            contentHtml: post.content.rendered,
            publishedAt: new Date(post.date),
            heroMediaId: mediaDbId,
            authorId,
            status: 'PUBLISHED',
          },
        })
      : await prisma.post.create({
          data: {
            title,
            slug: post.slug,
            excerpt: excerpt || null,
            contentHtml: post.content.rendered,
            publishedAt: new Date(post.date),
            heroMediaId: mediaDbId,
            authorId,
            status: 'PUBLISHED',
            externalId: extId,
          },
        });

    // Categories — attach to the canonical DB ids
    await prisma.postCategory.deleteMany({ where: { postId: dbPost.id } });
    for (let i = 0; i < post.categories.length; i++) {
      const catDbId = catIdMap.get(post.categories[i]);
      if (catDbId) {
        await prisma.postCategory.create({
          data: { postId: dbPost.id, categoryId: catDbId, isPrimary: i === 0 },
        });
      }
    }

    postCount++;
    console.log(`  [post] ${postCount}/${posts.length}: ${title.slice(0, 60)}`);
  }
  console.log(`  ✅ ${postCount} posts`);
}

async function seedSettings() {
  console.log('\n⚙️  Seeding settings & layout...');

  // Download logo
  const logoUrl = `${BASE_URL}/wp-content/uploads/2018/11/Sigla_Civicpress_bicolor_2-copy.png`;
  ensureDir(STORAGE_ORIG);
  const logoFilename = 'logo-civicpress.png';
  const logoPath = path.join(STORAGE_ORIG, logoFilename);

  let logoMediaId: string | null = null;
  if (!fs.existsSync(logoPath)) {
    try {
      await downloadFile(logoUrl, logoPath);
      console.log('  ✅ Logo downloaded');
    } catch (e) {
      console.warn('  ⚠️  Logo download failed:', e);
    }
  }

  if (fs.existsSync(logoPath)) {
    const existing = await prisma.media.findFirst({ where: { path: logoFilename } });
    if (existing) {
      logoMediaId = existing.id;
    } else {
      const m = await prisma.media.create({
        data: { filename: logoFilename, mimeType: 'image/png', path: logoFilename },
      });
      logoMediaId = m.id;
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      siteName: 'Civicpress',
      tagline: 'Știri despre lumea în care trăim',
      primaryColor: '#8A0808',
      secondaryColor: '#1a1a1a',
      accentColor: '#c0392b',
      backgroundColor: '#ffffff',
      textColor: '#2d2d2d',
      headingFont: 'Roboto',
      bodyFont: 'Open Sans',
      facebookUrl: 'https://www.facebook.com/civicpress.ro/',
      logoMediaId,
    },
    update: {
      logoMediaId,
      facebookUrl: 'https://www.facebook.com/civicpress.ro/',
    },
  });

  await prisma.layoutSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', homeTemplateId: 'home-magazine', categoryTemplateId: 'cat-list' },
    update: { homeTemplateId: 'home-magazine', categoryTemplateId: 'cat-list' },
  });

  console.log('  ✅ SiteSettings + LayoutSetting');
}

async function cleanupOrphanCategories() {
  try {
    const deleted = await prisma.category.deleteMany({
      where: { showInMenu: false, posts: { none: {} } },
    });
    if (deleted.count > 0) {
      console.log(`  🧹 Removed ${deleted.count} orphan non-menu categories with no posts`);
    }
  } catch (e) {
    console.warn('  ⚠️  Orphan cleanup skipped:', e);
  }
}

async function logMenuSummary() {
  const menuCats = await prisma.category.findMany({
    where: { showInMenu: true },
    orderBy: { menuOrder: 'asc' },
    include: { _count: { select: { posts: true } } },
  });
  console.log('\n📋 Menu categories after seed:');
  for (const cat of menuCats) {
    const postCount = cat._count.posts;
    const note = postCount === 0 ? ' ⚠️  no posts yet' : '';
    console.log(
      `   ${cat.menuOrder}. ${cat.name} (${cat.slug}) — ${cat.color} — ${postCount} posts${note}`,
    );
  }
}

async function seedDevUsers() {
  console.log('\n👤 Seeding dev users...');
  const DEV_PASS = 'civicpress';

  const users = [
    {
      email: 'admin@civicpress.ro',
      displayName: 'Admin Civicpress',
      slug: 'admin',
      role: 'ADMIN' as const,
    },
    {
      email: 'editor@civicpress.ro',
      displayName: 'Editor Civicpress',
      slug: 'editor',
      role: 'EDITOR' as const,
    },
    {
      email: 'author@civicpress.ro',
      displayName: 'Author Civicpress',
      slug: 'author',
      role: 'AUTHOR' as const,
    },
  ];

  const passwordHash = await argon2.hash(DEV_PASS, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  for (const u of users) {
    // If a *different* user already squatted on this slug (e.g. WP-imported "admin"),
    // rename their slug out of the way so the dev user can claim it.
    const slugOwner = await prisma.user.findUnique({ where: { slug: u.slug } });
    if (slugOwner && slugOwner.email !== u.email) {
      await prisma.user.update({
        where: { id: slugOwner.id },
        data: { slug: `${u.slug}-legacy-${slugOwner.id.slice(0, 6)}` },
      });
    }

    await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, passwordHash },
      update: { slug: u.slug, displayName: u.displayName, role: u.role, passwordHash },
    });
  }

  console.log('  ✅ Dev users seeded:');
  console.log('     admin@civicpress.ro  / civicpress  (ADMIN)');
  console.log('     editor@civicpress.ro / civicpress  (EDITOR)');
  console.log('     author@civicpress.ro / civicpress  (AUTHOR)');
}

async function adoptOrphanPosts() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@civicpress.ro' } });
  if (!admin) return;
  const result = await prisma.post.updateMany({
    where: { authorId: null },
    data: { authorId: admin.id },
  });
  if (result.count > 0) {
    console.log(`  📝 Reassigned ${result.count} unauthored posts to admin@civicpress.ro`);
  }
}

async function main() {
  console.log('🌱 Civicpress seed script starting...');
  console.log(
    `   DB: ${process.env.DATABASE_URL || 'postgresql://civicpress:civicpress@localhost:5432/civicpress'}`,
  );

  try {
    // 1. Seed site settings
    await seedSettings();

    // 2. Ensure canonical 9 categories FIRST so WP import can attach to them
    const canonicalIds = await ensureDefaultCategories();

    // 3. Import WP content (merges into canonical categories)
    const success = await seedViaWpRest(canonicalIds);
    if (!success) {
      console.log('\n⚠️  WP REST failed. DB has defaults (categories + settings) but no posts.');
      console.log('   The public site will still run; add posts via admin later.');
    }

    // 4. Seed dev users AFTER the WP import so the canonical "admin/editor/author"
    //    displayName + role + passwordHash always win (WP import never overwrites them again).
    await seedDevUsers();

    // 5. Re-assert canonical colors/menuOrder in case WP import overwrote anything
    await ensureDefaultCategories();

    // 6. Remove orphan non-menu categories with no posts
    await cleanupOrphanCategories();

    // 7. Adopt unauthored posts onto the seeded admin user
    await adoptOrphanPosts();

    // 8. Print a summary
    await logMenuSummary();

    console.log('\n✅ Seed complete!');
  } catch (e) {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
