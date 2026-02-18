import { test, expect } from '@playwright/test';

test.describe('Network overview', () => {
  test('renders feature map + explorer CTA', async ({ page }) => {
    // Full load helps avoid hydration races in production builds.
    await page.goto('/network', { waitUntil: 'load' });

    await expect(page.getByRole('heading', { name: /network graph/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /solana explorer/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /feature map/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /who can do what/i })).toBeVisible();

    // In E2E we may run against a local validator with the program preloaded (deployed),
    // but the page also supports "placeholder" mode when the program isn't present.
    const deployed = page.getByText('deployed', { exact: true });
    const placeholder = page.getByText('placeholder', { exact: true });
    await expect
      .poll(async () => (await deployed.isVisible()) || (await placeholder.isVisible()), { timeout: 60_000 })
      .toBe(true);
  });
});
