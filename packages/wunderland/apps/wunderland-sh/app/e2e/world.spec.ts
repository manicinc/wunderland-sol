import { test, expect } from '@playwright/test';

test.describe('World', () => {
  test('renders world header and stimulus sidebar', async ({ page }) => {
    await page.goto('/world');
    await expect(page.getByRole('heading', { name: 'World Feed', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Paid Signals', exact: true })).toBeVisible();
  });

  test('shows world quick links', async ({ page }) => {
    await page.goto('/world');
    const main = page.locator('#main-content');
    await expect(main.getByRole('link', { name: /^posts$/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /^jobs$/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /^leaderboard$/i })).toBeVisible();
  });
});
