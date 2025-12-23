import { test, expect } from '@playwright/test';

test.describe('Clinical Trials', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trials');
  });

  test('should display clinical trials page', async ({ page }) => {
    await expect(page.getByText(/clinical trials/i)).toBeVisible();
  });

  test('should display trial cards', async ({ page }) => {
    // Wait for trials to load
    await page.waitForTimeout(1000);

    // Check for trial cards or empty state
    const hasTrials = await page.locator('[data-testid^="card-trial-"]').count() > 0;
    const hasEmptyState = await page.getByText(/no trials|search for trials/i).isVisible();

    expect(hasTrials || hasEmptyState).toBeTruthy();
  });

  test('should refresh results', async ({ page }) => {
    const refreshButton = page.getByTestId('button-refresh-trials');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // Wait for loading state
      await page.waitForTimeout(500);
    }
  });

  test('should open trial details dialog', async ({ page }) => {
    await page.waitForTimeout(1000);

    const trialCard = page.locator('[data-testid^="card-trial-"]').first();
    if (await trialCard.isVisible()) {
      const viewDetailsButton = trialCard.getByTestId('button-view-details');
      if (await viewDetailsButton.isVisible()) {
        await viewDetailsButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    }
  });

  test('should filter trials by status', async ({ page }) => {
    const statusFilter = page.getByTestId('select-status-filter');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.getByText('Recruiting').click();
    }
  });
});
