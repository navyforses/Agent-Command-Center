import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings form', async ({ page }) => {
    await expect(page.getByTestId('input-display-name')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-phone')).toBeVisible();
  });

  test('should update profile information', async ({ page }) => {
    const displayNameInput = page.getByTestId('input-display-name');
    await displayNameInput.fill('Test User');

    const phoneInput = page.getByTestId('input-phone');
    await phoneInput.fill('+1234567890');

    await page.getByTestId('button-save-settings').click();

    // Wait for success toast
    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 });
  });

  test('should toggle notification switches', async ({ page }) => {
    const emailNotifications = page.getByTestId('switch-email-notifications');
    await expect(emailNotifications).toBeVisible();

    // Toggle the switch
    await emailNotifications.click();
  });

  test('should export user data', async ({ page }) => {
    const exportButton = page.getByTestId('button-export-data');
    await expect(exportButton).toBeVisible();
    await exportButton.click();
  });

  test('should switch themes', async ({ page }) => {
    const themeToggle = page.getByTestId('button-theme-toggle');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
  });

  test('should switch languages', async ({ page }) => {
    const languageToggle = page.getByTestId('button-language-toggle');
    await expect(languageToggle).toBeVisible();
    await languageToggle.click();

    // Check that language changed
    await expect(languageToggle).toContainText(/EN|ქარ/);
  });
});
