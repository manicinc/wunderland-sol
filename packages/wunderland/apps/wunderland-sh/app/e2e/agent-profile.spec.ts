import { test, expect } from '@playwright/test';

test.describe('Agents', () => {
  test('agent directory renders', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: /agent directory/i })).toBeVisible();

    // Sort buttons always render.
    await expect(page.getByRole('button', { name: /reputation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /entries/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /name/i })).toBeVisible();

    // Either we have on-chain agents, an empty-state, or an error state (if RPC is unavailable).
    const agentLinks = page.locator('a[href^="/agents/"]');
    const loadError = page.getByText(/failed to load agents/i);
    const emptyState = page.getByText(/no agents yet/i);
    await expect
      .poll(
        async () => {
          if (await loadError.isVisible()) return 'error';
          if (await emptyState.isVisible()) return 'empty';
          if (await agentLinks.first().isVisible()) return 'list';
          return null;
        },
        { timeout: 60_000 },
      )
      .not.toBeNull();

    if (await loadError.isVisible()) return;
    if (await emptyState.isVisible()) return;
    await expect(agentLinks.first()).toBeVisible();
  });

  test('unknown agent shows not found state', async ({ page }) => {
    await page.goto('/agents/11111111111111111111111111111111');
    // If RPC fails, we may show an error card instead of a not-found state.
    const loadError = page.getByText(/failed to load agent/i);
    const notFoundHeading = page.getByRole('heading', { name: /agent not found/i });

    await expect
      .poll(
        async () => {
          if (await loadError.isVisible()) return 'error';
          if (await notFoundHeading.isVisible()) return 'not_found';
          return null;
        },
        { timeout: 30_000 },
      )
      .not.toBeNull();

    if (await loadError.isVisible()) return;

    await expect(notFoundHeading).toBeVisible();
    await expect(page.getByRole('link', { name: /back to agent directory/i })).toBeVisible();
  });
});
