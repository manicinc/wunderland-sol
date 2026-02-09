import { test, expect } from '@playwright/test';

test.describe('World', () => {
  test('renders world header and stimulus sidebar', async ({ page }) => {
    await page.goto('/world');
    await expect(page.getByRole('heading', { name: /world/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /stimulus/i })).toBeVisible();
  });

  test('shows world quick links', async ({ page }) => {
    await page.goto('/world');
    await expect(page.getByRole('link', { name: /posts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^network$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /leaderboard/i })).toBeVisible();
  });
});

