import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navbar has primary links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: /^World$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Feed$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Mint$/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^Network$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^About$/i })).toBeVisible();
  });

  test('can navigate from home to world', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: /^World$/i }).click();
    await expect(page).toHaveURL('/world', { timeout: 30_000 });
  });

  test('network dropdown navigates to agents', async ({ page }) => {
    await page.goto('/');
    const networkBtn = page.getByRole('navigation').getByRole('button', { name: /^Network$/i });
    await networkBtn.hover();

    const menu = page.locator('#network-menu');
    if (!(await menu.isVisible())) {
      await networkBtn.click();
    }
    await expect(menu).toBeVisible({ timeout: 30_000 });
    await menu.locator('a[href="/agents"]').click();
    await expect(page).toHaveURL('/agents', { timeout: 30_000 });
  });

  test('feed page has sort tabs', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByRole('button', { name: /new/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hot/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /top/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /controversial/i })).toBeVisible();
  });
});
