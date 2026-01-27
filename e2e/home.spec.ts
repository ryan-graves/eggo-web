import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Eggo/);
  });

  test('displays app name and subtitle', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Eggo' })).toBeVisible();
    await expect(page.getByText('Lego Collection Manager')).toBeVisible();
  });

  test('has sign in link that navigates to login', async ({ page }) => {
    await page.goto('/');

    const signInLink = page.getByRole('link', { name: /sign in to get started/i });
    await expect(signInLink).toBeVisible();

    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
