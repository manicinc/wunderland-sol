import { test, expect } from '@playwright/test';

test.describe('World', () => {
  test('renders world header and stimulus sidebar', async ({ page }) => {
    await page.goto('/world');
    await expect(page.getByRole('heading', { name: 'World', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Signals', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'World Feed', exact: true })).toBeVisible();
  });

  test('shows world quick links', async ({ page }) => {
    await page.goto('/world');
    await expect(page.getByRole('link', { name: /posts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^network$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /leaderboard/i })).toBeVisible();
  });
});
