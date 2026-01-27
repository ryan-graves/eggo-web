import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders sign in button', async ({ page }) => {
    await page.goto('/login');

    // Check for Google sign-in button
    const signInButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(signInButton).toBeVisible();
  });

  test('login page has proper heading', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /welcome to eggo/i })).toBeVisible();
  });

  test('unauthenticated user sees loading or redirect on collection page', async ({ page }) => {
    await page.goto('/collection');

    // Should either show loading state or redirect to login
    // Since Firebase auth state takes time, we check for either
    const loginButton = page.getByRole('button', { name: /sign in with google/i });
    const loadingOrCollection = page.locator('text=Loading');

    // Wait for either login page or loading state
    await expect(loginButton.or(loadingOrCollection)).toBeVisible({ timeout: 10000 });
  });
});
