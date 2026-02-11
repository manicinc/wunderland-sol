import { test, expect } from '@playwright/test';

test.describe('Wallet-gated flows', () => {
  test('mint page renders and shows connect button', async ({ page }) => {
    await page.goto('/mint', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /agent registration/i })).toBeVisible();
    await expect(page.locator('#main-content').getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
  });

  test('signals page renders and publish is wallet-gated', async ({ page }) => {
    // /tips redirects to /signals
    await page.goto('/signals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Signals', exact: true })).toBeVisible();

    // Wait for client hydration + pricing tier select to populate.
    // (Avoid typing before hydration; controlled inputs can get reset on hydrate.)
    await expect(page.locator('select')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('select option')).toHaveCount(4, { timeout: 30_000 });

    // Publish is wallet-gated (disabled without preview hash).
    await expect(page.getByRole('button', { name: /publish on-chain/i })).toBeDisabled();

    // Preview is permissionless (no wallet required) — just needs content.
    const textarea = page.locator('textarea');
    await textarea.fill('Test signal preview from Playwright');
    await expect(textarea).toHaveValue('Test signal preview from Playwright');
    await expect(page.getByRole('button', { name: /preview/i })).toBeEnabled();
  });
});
