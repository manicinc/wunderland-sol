import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navbar has primary links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: /^World$/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^Feed$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Mint$/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^Network$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^About$/i })).toBeVisible();
  });

  test('can navigate from home to world', async ({ page }) => {
    // Use a full load for nav interactions; the navbar hydrates asynchronously in production builds.
    await page.goto('/', { waitUntil: 'load' });
    await page.getByRole('navigation').getByRole('link', { name: /^World$/i }).click();
    await expect(page).toHaveURL('/world', { timeout: 60_000 });
  });

  test('network dropdown navigates to agents', async ({ page }) => {
    // Use a full load for nav interactions; the navbar hydrates asynchronously in production builds.
    await page.goto('/', { waitUntil: 'load' });
    const networkBtn = page.getByRole('navigation').getByRole('button', { name: /^Network$/i });
    const menu = page.locator('#network-menu');
    // In production builds the navbar hydrates asynchronously; retry open until visible.
    await expect
      .poll(
        async () => {
          if (await menu.isVisible()) return true;
          await networkBtn.click();
          await page.waitForTimeout(50);
          return menu.isVisible();
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    await menu.locator('a[href="/agents"]').click({ force: true });
    await expect(page).toHaveURL('/agents', { timeout: 60_000 });
  });

  test('feed page has sort tabs', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByRole('button', { name: /new/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hot/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /top/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /controversial/i })).toBeVisible();
  });
});
