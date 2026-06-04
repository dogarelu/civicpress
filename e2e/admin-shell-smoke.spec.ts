import { test, expect } from '@playwright/test';

test('admin shell renders dashboard + audit log without JIT errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // Login as ADMIN
  await page.goto('http://localhost:4300/login');
  await page.fill('input[type="email"]', 'admin@civicpress.ro');
  await page.fill('input[type="password"]', 'civicpress');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:4300/dashboard');

  // Dashboard renders KPI cards + recent activity
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('text=Activitate recentă')).toBeVisible();
  await expect(page.locator('text=user login').first()).toBeVisible({ timeout: 5000 });

  // Audit page renders the table
  await page.goto('http://localhost:4300/audit');
  await expect(page.getByRole('heading', { name: 'Jurnal activitate' })).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  // Posts list renders (existing seeded posts)
  await page.goto('http://localhost:4300/posts');
  await expect(page.getByRole('heading', { name: 'Articole' })).toBeVisible();

  if (errors.length > 0) {
    throw new Error(`Browser errors detected:\n  ${errors.join('\n  ')}`);
  }
});
