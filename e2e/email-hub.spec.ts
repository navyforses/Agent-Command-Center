import { test, expect } from '@playwright/test';

test.describe('Email Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/email');
  });

  test('should display email hub with tabs', async ({ page }) => {
    await expect(page.getByTestId('tab-inbox')).toBeVisible();
    await expect(page.getByTestId('tab-sent')).toBeVisible();
    await expect(page.getByTestId('tab-drafts')).toBeVisible();
  });

  test('should open compose dialog', async ({ page }) => {
    await page.getByTestId('button-compose-email').click();
    await expect(page.getByTestId('input-recipient-email')).toBeVisible();
    await expect(page.getByTestId('input-email-subject')).toBeVisible();
    await expect(page.getByTestId('textarea-email-content')).toBeVisible();
  });

  test('should compose and save draft', async ({ page }) => {
    await page.getByTestId('button-compose-email').click();

    await page.getByTestId('input-recipient-email').fill('doctor@hospital.com');
    await page.getByTestId('input-email-subject').fill('Test Subject');
    await page.getByTestId('textarea-email-content').fill('Test email content');

    await page.getByTestId('button-save-draft').click();

    // Check success toast
    await expect(page.getByText(/success|saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('should generate AI draft', async ({ page }) => {
    await page.getByTestId('button-compose-email').click();

    // Select a template
    await page.getByTestId('select-email-template').click();
    await page.getByText('Request Medical Records').click();

    // Generate AI draft
    await page.getByTestId('button-generate-ai-draft').click();

    // Wait for generation
    await expect(page.getByTestId('textarea-email-content')).not.toBeEmpty({ timeout: 5000 });
  });

  test('should switch between tabs', async ({ page }) => {
    await page.getByTestId('tab-sent').click();
    await expect(page.getByText(/sent emails/i)).toBeVisible();

    await page.getByTestId('tab-drafts').click();
    await expect(page.getByText(/drafts|no drafts/i)).toBeVisible();

    await page.getByTestId('tab-inbox').click();
  });

  test('should search emails', async ({ page }) => {
    const searchInput = page.getByTestId('input-search-emails');
    await searchInput.fill('test');

    // Search should filter results
    await page.waitForTimeout(500);
  });
});
