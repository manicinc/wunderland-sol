import { test, expect } from '@playwright/test';

test.describe('Mint Flow (Full E2E)', () => {
  test('mints an agent and completes post-mint integrations', async ({ page, request, context }) => {
    test.setTimeout(180_000);

    // Acquire a backend token so credential submission succeeds (Next proxies cookies to backend).
    const loginRes = await request.post('http://127.0.0.1:3001/api/auth/global', {
      data: { password: 'e2e-password', rememberMe: false },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = (await loginRes.json()) as any;
    expect(typeof loginJson?.token).toBe('string');

    await context.addCookies([
      {
        name: 'authToken',
        value: loginJson.token,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    // Use a full page load to avoid hydration races in production builds.
    await page.goto('/mint', { waitUntil: 'load' });

    // Step 1: Identity
    const displayName = page.getByLabel(/display name/i);
    await expect(displayName).toBeVisible();
    await displayName.fill('E2E Agent');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2: Personality
    await expect(page.getByText(/honesty/i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: Skills/Channels/Provider (default provider requires a key)
    await expect(page.getByText(/skills/i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /llm provider/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 4: Credentials
    const openAiKey = page.getByPlaceholder(/enter openai_api_key/i);
    await expect(openAiKey).toBeVisible({ timeout: 30_000 });
    await openAiKey.fill('sk-e2e-test');
    await page.getByRole('button', { name: /next/i }).click();

    // Step 5: Signer
    await expect(page.getByRole('heading', { name: /what is an agent signer/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Managed' }).click();
    const signerInput = page.getByLabel(/agent signer public key/i);
    await expect(signerInput).toBeVisible();
    const signerCard = page.locator('div.glass', {
      has: page.getByRole('heading', { name: /generate or import a signer key/i }),
    });
    await signerCard.getByRole('button', { name: /^generate$/i }).click();
    await expect(signerInput).not.toHaveValue('');
    await page.getByRole('button', { name: 'Review', exact: true }).click();

    // Step 6: Review + Mint
    const mintBtn = page.getByRole('button', { name: /mint agent/i });
    await expect(mintBtn).toBeEnabled();
    await mintBtn.click();

    // Mint success + post-mint tasks
    await expect(page.getByText('Agent minted successfully!')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/metadata_cid b[a-z2-7]+/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/managed_hosting /i)).toHaveText(/managed_hosting onboarded/i, { timeout: 60_000 });
    await expect(page.getByText(/credentials: 1 submitted/i)).toBeVisible({ timeout: 60_000 });

    // Agent directory/profile should resolve the new agent from on-chain state.
    const viewAgent = page.getByRole('link', { name: /view agent/i });
    await expect(viewAgent).toBeVisible();
    await viewAgent.click();

    await expect(page.getByRole('heading', { name: 'E2E Agent' })).toBeVisible({ timeout: 60_000 });
  });
});
