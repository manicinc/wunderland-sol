import { test, expect } from '@playwright/test';

async function waitForHydration(page: import('@playwright/test').Page) {
  // RootLayout mounts a HydrationMarker that sets `data-wl-hydrated="1"` on <html>.
  await page.waitForFunction(() => document.documentElement.dataset.wlHydrated === '1', null, { timeout: 30_000 });
}

test.describe('Mint Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Full "load" can be slow/flaky in CI and during parallel E2E runs; hydrate marker gates interactivity.
    await page.goto('/mint', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  // ── Page Structure ─────────────────────────────────────────────────────

  test('renders wizard stepper and step 1 by default', async ({ page }) => {
    // Wizard stepper should be visible
    await expect(page.getByText('Identity', { exact: true }).first()).toBeVisible();

    // Step 1 content: display name input
    await expect(page.getByLabel(/display name/i)).toBeVisible();
  });

  test('shows connect wallet button', async ({ page }) => {
    await expect(
      page.locator('#main-content').getByRole('button', { name: /(connect|disconnect) wallet/i }),
    ).toBeVisible();
  });

  // ── Step Navigation ────────────────────────────────────────────────────

  test('can navigate to step 2 (Personality) via Next button', async ({ page }) => {
    await expect(page.getByLabel(/display name/i)).toBeVisible();

    // Click Next
    const nextBtn = page.getByRole('button', { name: /next/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Step 2 should show HEXACO sliders
    await expect(page.getByText(/honesty/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('can navigate back from step 2 to step 1', async ({ page }) => {
    await expect(page.getByLabel(/display name/i)).toBeVisible();

    // Go to step 2
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/honesty/i).first()).toBeVisible({ timeout: 30_000 });

    // Go back
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Step 1 content visible again
    await expect(page.getByLabel(/display name/i)).toBeVisible();
  });

  test('can navigate through steps 1-3', async ({ page }) => {
    await expect(page.getByLabel(/display name/i)).toBeVisible();

    // Step 1 → 2
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/honesty/i).first()).toBeVisible({ timeout: 30_000 });

    // Step 2 → 3
    await page.getByRole('button', { name: /next/i }).click();
    // Step 3 should show Skills/Channels/Provider tabs
    await expect(page.getByText(/skills/i).first()).toBeVisible();
  });

  // ── Step 1: Identity ──────────────────────────────────────────────────

  test('step 1: can edit display name', async ({ page }) => {
    const nameInput = page.getByLabel(/display name/i);
    await nameInput.clear();
    await nameInput.fill('Test Agent');
    await expect(nameInput).toHaveValue('Test Agent');
  });

  test('step 1: shows byte count for display name', async ({ page }) => {
    const nameInput = page.getByLabel(/display name/i);
    await nameInput.clear();
    await nameInput.fill('Hello');
    // Should show byte count somewhere
    await expect(page.getByText(/5.*\/.*32/)).toBeVisible();
  });

  // ── Step 5: Signer ────────────────────────────────────────────────────

  test('step 5: shows agent signer explainer', async ({ page }) => {
    // Navigate to step 5 (click Next 4 times)
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }

    // Should show "Why a separate signer key?" explainer
    await expect(page.getByText(/why a separate signer/i)).toBeVisible();

    // Should show hosting mode buttons
    await expect(page.getByRole('button', { name: /managed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /self-hosted/i })).toBeVisible();
  });

  test('step 5: can generate a signer keypair', async ({ page }) => {
    // Navigate to step 5
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }

    // The signer pubkey input should now be populated
    const signerInput = page.getByLabel(/agent signer public key/i);
    await expect(signerInput).toBeVisible();

    // Click the Generate button inside the signer card (avoid colliding with other "Generate" buttons on the page)
    const signerCard = signerInput.locator('..');
    await signerCard.getByRole('button', { name: /^generate$/i }).click();
    await expect(signerInput).not.toHaveValue('');
  });

  // ── Informational Sections ────────────────────────────────────────────

  test('Owner + Agent Signer Model section is visible', async ({ page }) => {
    // Scroll down to find the informational section
    await expect(page.getByText(/owner \+ agent signer model/i)).toBeVisible();
  });

  test('shows Economics + Limits section', async ({ page }) => {
    await expect(page.getByText(/economics/i).first()).toBeVisible();
  });
});
