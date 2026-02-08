import { test, expect } from '@playwright/test';

test.describe('Network overview', () => {
  test('renders feature map + explorer CTA', async ({ page }) => {
    await page.goto('/network', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^network$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view on explorer/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /feature map/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /who can do what/i })).toBeVisible();

    // The E2E harness uses a local validator; the program is typically not deployed there.
    await expect(page.getByText('placeholder', { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});

