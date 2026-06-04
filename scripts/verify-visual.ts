/**
 * Visual verification script: takes side-by-side screenshots of localhost:4200
 * and civicpress.ro for manual visual comparison.
 *
 * Run: pnpm verify:visual  (requires pnpm dev to be running first)
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

const OUTPUT_DIR = '/tmp/visual-diff';
const LOCAL_URL = process.env['LOCAL_URL'] ?? 'http://localhost:4200';
const LIVE_URL = 'https://www.civicpress.ro';

async function getHeroSlug(): Promise<string> {
  try {
    const res = await fetch(`${LOCAL_URL}/v1/home`);
    if (!res.ok)
      return 'ciprian-ciucu-primarul-sectorului-6-a-fost-ales-presedinte-al-pnl-bucuresti';
    const data = (await res.json()) as { hero?: { slug?: string } };
    return (
      data?.hero?.slug ??
      'ciprian-ciucu-primarul-sectorului-6-a-fost-ales-presedinte-al-pnl-bucuresti'
    );
  } catch {
    return 'ciprian-ciucu-primarul-sectorului-6-a-fost-ales-presedinte-al-pnl-bucuresti';
  }
}

const PAGES = [
  { name: 'home', localPath: '/', livePath: '/' },
  { name: 'politica', localPath: '/category/politica', livePath: '/category/politica/' },
];

async function captureScreenshot(page: import('playwright').Page, url: string, filename: string) {
  console.log(`  📸 Capturing: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`  ✅ Saved: ${filename}`);
}

async function main() {
  console.log('🔍 Civicpress Visual Verification\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const heroSlug = await getHeroSlug();
  const pages = [
    ...PAGES,
    { name: 'article', localPath: `/${heroSlug}`, livePath: `/${heroSlug}` },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results: string[] = [];

  for (const { name, localPath, livePath } of pages) {
    console.log(`\n[${name}]`);

    const localFile = path.join(OUTPUT_DIR, `${name}-local.png`);
    const liveFile = path.join(OUTPUT_DIR, `${name}-live.png`);

    try {
      await captureScreenshot(page, LOCAL_URL + localPath, localFile);
    } catch (e) {
      console.warn(`  ⚠️  Local screenshot failed (is dev server running?): ${e}`);
    }

    try {
      await captureScreenshot(page, LIVE_URL + livePath, liveFile);
    } catch (e) {
      console.warn(`  ⚠️  Live screenshot failed: ${e}`);
    }

    results.push(`${name}: ${localFile}  vs  ${liveFile}`);
  }

  await browser.close();

  console.log('\n✅ Screenshots saved to:', OUTPUT_DIR);
  console.log('\nCompare side by side:');
  results.forEach((r) => console.log(' ', r));

  // Try to open the output folder
  try {
    child_process.execSync(`open ${OUTPUT_DIR}`);
  } catch {
    console.log(`\nOpen manually: ${OUTPUT_DIR}`);
  }
}

main().catch((e) => {
  console.error('❌ Visual verification failed:', e);
  process.exit(1);
});
