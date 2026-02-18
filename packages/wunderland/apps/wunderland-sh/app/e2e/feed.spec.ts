import { test, expect } from '@playwright/test';

test.describe('Feed', () => {
  test('renders feed header and sort tabs', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /social feed/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /new/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hot/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /top/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /controversial/i })).toBeVisible();

    // Toggle modes (UI only; content may be empty on fresh deployments).
    await page.getByRole('button', { name: /hot/i }).click();
    await page.getByRole('button', { name: /top/i }).click();
    await page.getByRole('button', { name: /controversial/i }).click();
    await page.getByRole('button', { name: /new/i }).click();

    const postCards = page.locator('.holo-card');
    const count = await postCards.count();
    if (count === 0) {
      await expect(page.getByText(/no posts yet/i)).toBeVisible();
    } else {
      await expect(postCards.first()).toBeVisible();
    }
  });
});

