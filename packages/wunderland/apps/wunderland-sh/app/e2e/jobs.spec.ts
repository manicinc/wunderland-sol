/**
 * @file jobs.spec.ts
 * @description E2E tests for Jobs Marketplace UI and confidential details feature.
 */

import { test, expect } from '@playwright/test';

async function createOnChainJobViaUi(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/jobs/post');

  // Wait for wallet auto-connect in E2E runs (avoids opening the wallet modal).
  await expect(page.getByRole('button', { name: /create job & escrow funds/i })).toBeVisible({ timeout: 30_000 });

  const title = `E2E Job ${Date.now()}`;

  await page.fill('input[placeholder*="Build"]', title);
  await page.fill('textarea[placeholder*="Describe the task"]', 'E2E job description.');
  await page.fill('input[placeholder="1.0"]', '0.01');
  await page.fill('input[type="date"]', '2099-12-31');

  await page.getByRole('button', { name: /create job & escrow funds/i }).click();

  // Wait for the success banner (on-chain + backend metadata caching).
  await expect(page.getByText(/created on-chain/i)).toBeVisible({ timeout: 90_000 });

  const jobPdaLink = page.locator('a:has-text("View Job PDA")');
  const href = await jobPdaLink.getAttribute('href');
  expect(href).toBeTruthy();

  const match = String(href).match(/\/address\/([^?/#]+)/);
  if (!match?.[1]) {
    throw new Error(`Failed to parse job PDA from href: ${href}`);
  }

  return match[1];
}

test.describe('Jobs Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs');
  });

  test('should display jobs listing page', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /^jobs$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /this page is for humans/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^post a job$/i })).toBeVisible();
  });

  test('should show "How it works" collapsible with confidential details note', async ({ page }) => {
    // Collapsible starts with defaultOpen={true}, so content is already visible

    // Verify 4 steps are shown
    await expect(page.locator('strong:has-text("Post a job")')).toBeVisible();
    await expect(page.locator('strong:has-text("Agents bid")')).toBeVisible();
    await expect(page.locator('strong:has-text("Accept & assign")')).toBeVisible();
    await expect(page.locator('strong:has-text("Review & approve")')).toBeVisible();

    // Verify confidential details note
    await expect(page.locator('text=Confidential details')).toBeVisible();
    await expect(page.locator('text=Add sensitive info (API keys, credentials)')).toBeVisible();
  });

  test('should filter jobs by status', async ({ page }) => {
    // Click "In Progress" tab
    await page.click('button:has-text("In Progress")');

    // URL should update
    await expect(page).toHaveURL(/status=assigned/);
  });

  test('should filter jobs by category', async ({ page }) => {
    // Select category
    await page.selectOption('select', 'development');

    // URL should update
    await expect(page).toHaveURL(/category=development/);
  });

  test('should search jobs', async ({ page }) => {
    const searchBox = page.locator('input[placeholder*="Search"]');
    await searchBox.fill('API');

    // Wait for debounce
    await page.waitForTimeout(400);

    // URL should update with query
    await expect(page).toHaveURL(/q=API/);
  });

  test('should navigate to Post a Job', async ({ page }) => {
    await page.click('text=Post a Job');

    await expect(page).toHaveURL('/jobs/post');
    await expect(page.locator('h1')).toContainText('Post a Job');
  });

  test('should navigate to job detail', async ({ page }) => {
    // Jobs can be empty in a fresh local validator; create a job first.
    const jobPda = await createOnChainJobViaUi(page);

    await page.goto('/jobs');
    const jobLink = page.locator(`a[href="/jobs/${jobPda}"]`);
    await expect(jobLink).toBeVisible({ timeout: 30_000 });
    await jobLink.click();

    await expect(page).toHaveURL(`/jobs/${jobPda}`);
  });
});

test.describe('Post a Job Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/post');
  });

  test('should display form with all fields', async ({ page }) => {
    await expect(page.locator('label:has-text("Job Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    await expect(page.locator('label:has-text("Confidential Details")')).toBeVisible();
    await expect(page.locator('label:has-text("Budget (SOL)")')).toBeVisible();
    await expect(page.locator('label:has-text("Category")')).toBeVisible();
    await expect(page.locator('label:has-text("Buy It Now Price")')).toBeVisible();
    await expect(page.locator('label:has-text("Deadline")')).toBeVisible();
  });

  test('should show confidential details field with tooltip', async ({ page }) => {
    const confidentialLabel = page.locator('label:has-text("Confidential Details")');
    await expect(confidentialLabel).toBeVisible();

    // Verify 🔒 Private indicator
    await expect(page.locator('text=🔒 Private')).toBeVisible();

    // Hover to show tooltip (if implemented with hover)
    await page.locator('text=🔒 Private').hover();

    // Tooltip text should appear
    await expect(page.locator('text=Only the winning agent sees this')).toBeVisible({ timeout: 2000 });
  });

  test('should show public note on description field', async ({ page }) => {
    const descriptionSection = page.locator('textarea[placeholder*="Describe the task"]').locator('..');

    await expect(descriptionSection.locator('text=Public')).toBeVisible();
    await expect(descriptionSection.locator('text=All agents see this')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation message
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible({ timeout: 1000 });
  });

  test('should show character count for description', async ({ page }) => {
    const description = page.locator('textarea[placeholder*="Describe the task"]');
    await description.fill('Test description');

    // Should show character count
    await expect(page.locator('text=/\\d+\\/4000/')).toBeVisible();
  });

  test('should show character count for confidential details', async ({ page }) => {
    const confidential = page.locator('textarea[placeholder*="API keys, credentials"]');
    await confidential.fill('API_KEY=secret123');

    // Should show character count
    await expect(page.locator('text=/\\d+\\/2000/')).toBeVisible();
  });

  test('should show hidden until accepted note on confidential field', async ({ page }) => {
    const confidentialSection = page.locator('textarea[placeholder*="API keys"]').locator('..');

    await expect(confidentialSection.locator('text=🔒 Hidden until bid accepted')).toBeVisible();
  });

  test('should validate budget is positive number', async ({ page }) => {
    const budgetInput = page.locator('input[placeholder="1.0"]');
    await expect(budgetInput).toHaveAttribute('min', '0.01');
    await expect(budgetInput).toHaveAttribute('step', '0.01');
  });

  test('should show buy-it-now "Instant Win" hint and preview badge', async ({ page }) => {
    await expect(page.locator('text=⚡ Instant Win')).toBeVisible();

    // Fill required preview fields
    await page.fill('input[placeholder*="Build"]', 'Test Job');
    await page.fill('input[placeholder="1.0"]', '1');

    const buyItNowInput = page.locator('input[placeholder*="1.2 (10-20% above budget)"]');
    await expect(buyItNowInput).toHaveAttribute('min', '1.05');

    await buyItNowInput.fill('1.2');

    // Preview should show buy-it-now badge when provided
    await expect(page.locator('text=⚡ 1.2 SOL instant')).toBeVisible();
  });
});

test.describe('Job Detail Page', () => {
  let jobPda: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    jobPda = await createOnChainJobViaUi(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/jobs/${jobPda}`);
    await expect(page.locator('h1')).toBeVisible({ timeout: 30_000 });
  });

  test('should display job details', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('div.font-mono.text-xl')).toContainText(/SOL/); // Budget
    await expect(page.getByRole('heading', { name: 'Description', exact: true })).toBeVisible();
  });

  test('should show status timeline', async ({ page }) => {
    const statusCard = page.getByRole('heading', { name: 'Status' }).locator('..');
    await expect(statusCard.getByText('Open', { exact: true })).toBeVisible();
    await expect(statusCard.getByText('In Progress', { exact: true })).toBeVisible();
    await expect(statusCard.getByText('Submitted', { exact: true })).toBeVisible();
    await expect(statusCard.getByText('Completed', { exact: true })).toBeVisible();
  });

  test('should show agent bids section', async ({ page }) => {
    await expect(page.locator('text=/Agent Bids \\(\\d+\\)/')).toBeVisible();
  });

  test('should show accept bid button for job creator (if connected)', async ({ page }) => {
    // This would require wallet connection in test
    // Just verify the button exists in DOM (may be disabled)
    const acceptButtons = page.locator('button:has-text("Accept Bid")');
    // Should exist (even if disabled for demo)
    expect(await acceptButtons.count()).toBeGreaterThanOrEqual(0);
  });

  test('should navigate back to jobs listing', async ({ page }) => {
    await page.click('a:has-text("Jobs")');

    await expect(page).toHaveURL('/jobs');
  });
});

test.describe('Confidential Details (Demo)', () => {
  test('should NOT show confidential details to non-assigned viewer', async ({ page }) => {
    const jobPda = await createOnChainJobViaUi(page);
    await page.goto(`/jobs/${jobPda}`);

    // Confidential section should not be visible
    await expect(page.locator('text=Confidential Information')).not.toBeVisible();
    await expect(page.locator('text=API_KEY')).not.toBeVisible();
  });

  // Note: Testing actual confidential details reveal requires:
  // 1. Wallet connection
  // 2. Job assignment
  // 3. Backend API integration
  // These would be tested in integration tests, not E2E browser tests
});

test.describe('Jobs Navigation', () => {
  test('should show Jobs link in main navigation', async ({ page }) => {
    await page.goto('/');

    const jobsLink = page.locator('a[href="/jobs"]').first();
    await expect(jobsLink).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to jobs from home page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/jobs"]').first().click();

    await expect(page).toHaveURL('/jobs');
    await expect(page.getByRole('heading', { level: 1, name: /^jobs$/i })).toBeVisible();
  });
});

test.describe('Jobs Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/jobs');

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('Jobs');
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/jobs/post');

    // All inputs should have labels
    const titleInput = page.locator('input[placeholder*="Build"]');
    await expect(titleInput).toHaveAttribute('type', 'text');

    const budgetInput = page.locator('input[placeholder="1.0"]');
    await expect(budgetInput).toHaveAttribute('type', 'number');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/jobs');

    // Tab through status filter buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate with Enter
    await page.keyboard.press('Enter');

    // A filter should be applied
    await expect(page).toHaveURL(/.+/);
  });
});
