/**
 * Smoke test: author creates → editor publishes → public renders
 *
 * Requires all three apps running:
 *   - Backend: http://localhost:3000
 *   - Admin:   http://localhost:4300
 *   - Public:  http://localhost:4200
 *
 * Run dev credentials seeded by seed.ts:
 *   author@civicpress.ro / civicpress (AUTHOR)
 *   editor@civicpress.ro / civicpress (EDITOR)
 */

import { test, expect } from '@playwright/test';

const BACKEND = 'http://localhost:3000';
const ADMIN = 'http://localhost:4300';
const PUBLIC = 'http://localhost:4200';

const AUTHOR = { email: 'author@civicpress.ro', password: 'civicpress' };
const EDITOR = { email: 'editor@civicpress.ro', password: 'civicpress' };
const TITLE = `E2E Test Article ${Date.now()}`;
const SLUG_APPROX = TITLE.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 50);

let postId = '';

// ─── Step 1: Author logs in and creates a draft ────────────────────────────

test('1. Author logs in and creates a draft post', async ({ page }) => {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[type="email"]', AUTHOR.email);
  await page.fill('input[type="password"]', AUTHOR.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${ADMIN}/dashboard`);
  expect(page.url()).toContain('/dashboard');

  await page.goto(`${ADMIN}/posts/new`);
  await page.fill('input[name="title"]', TITLE);
  await page.fill(
    'textarea[name="contentHtml"]',
    '<p>This is a test article created by Playwright.</p>',
  );
  await page.click('button:has-text("Salvează ciornă")');
  await page.waitForURL(/\/posts\/.+\/edit/);

  const url = page.url();
  const match = url.match(/\/posts\/(.+?)\/edit/);
  expect(match).toBeTruthy();
  postId = match![1];

  await page.click('button:has-text("Trimite spre revizie")');
  await page.waitForSelector('text=IN_REVIEW');
});

// ─── Step 2: Editor approves and publishes ─────────────────────────────────

test('2. Editor logs in and publishes the post', async ({ page }) => {
  expect(postId).not.toBe('');

  await page.goto(`${ADMIN}/login`);
  await page.fill('input[type="email"]', EDITOR.email);
  await page.fill('input[type="password"]', EDITOR.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${ADMIN}/dashboard`);

  await page.goto(`${ADMIN}/posts/${postId}/edit`);
  await page.waitForSelector('text=IN_REVIEW');

  await page.click('button:has-text("Publică acum")');
  await page.waitForSelector('text=PUBLISHED');
});

// ─── Step 3: Public site renders the article ───────────────────────────────

test('3. Article is visible on the public site', async ({ page }) => {
  expect(postId).not.toBe('');

  const response = await fetch(`${BACKEND}/v1/admin/posts/${postId}`, {
    headers: { Accept: 'application/json' },
  }).catch(() => null);

  let slug = SLUG_APPROX;
  if (response?.ok) {
    const data = (await response.json()) as { slug?: string };
    if (data.slug) slug = data.slug;
  }

  await page.goto(`${PUBLIC}/${slug}`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1').first()).toContainText(TITLE.slice(0, 30));
});
