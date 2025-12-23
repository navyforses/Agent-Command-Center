import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to dashboard on load', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('text-page-title')).toBeVisible();
  });

  test('should navigate to all main menu items', async ({ page }) => {
    await page.goto('/');

    // Test navigation to each page
    const menuItems = [
      { testId: 'nav-child-profile', url: '/child-profile' },
      { testId: 'nav-documents', url: '/documents' },
      { testId: 'nav-therapy', url: '/therapy' },
      { testId: 'nav-trials', url: '/trials' },
      { testId: 'nav-research', url: '/research' },
      { testId: 'nav-medications', url: '/medications' },
      { testId: 'nav-email', url: '/email' },
      { testId: 'nav-calendar', url: '/calendar' },
    ];

    for (const item of menuItems) {
      await page.getByTestId(item.testId).click();
      await expect(page).toHaveURL(item.url);
      await page.goto('/'); // Return to dashboard
    }
  });

  test('should navigate to AI tools', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('nav-assistant').click();
    await expect(page).toHaveURL('/assistant');

    await page.goto('/');
    await page.getByTestId('nav-evolution').click();
    await expect(page).toHaveURL('/evolution');
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-settings').click();
    await expect(page).toHaveURL('/settings');
  });
});
