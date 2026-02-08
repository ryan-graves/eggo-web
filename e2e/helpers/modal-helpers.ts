import { Page, expect } from '@playwright/test';

/**
 * Opens a modal by clicking a button with the given name
 * Waits for modal to be fully open and animation to complete
 */
export async function openModal(page: Page, buttonName: string | RegExp) {
  const button = page.getByRole('button', { name: buttonName });
  await button.click();
  await page.waitForSelector('[data-vaul-drawer][data-state="open"]', { timeout: 1000 });
  await page.waitForTimeout(500); // Animation buffer (0.5s animation duration)
}

/**
 * Closes a modal by clicking the close button
 * Waits for modal to be fully closed
 */
export async function closeModal(page: Page) {
  const closeButton = page.getByRole('button', { name: /close/i });
  await closeButton.click();
  await page.waitForSelector('[data-vaul-drawer][data-state="closed"]', { timeout: 1000 });
}

/**
 * Verifies that a modal is horizontally centered on desktop
 * and has appropriate bottom margin
 */
export async function verifyModalCentered(page: Page) {
  const box = await page.locator('.modal-sheet').boundingBox();
  expect(box).not.toBeNull();

  const viewport = page.viewportSize();
  const centerX = viewport!.width / 2;
  const modalCenterX = box!.x + box!.width / 2;

  // Verify modal is horizontally centered (within 10px tolerance)
  expect(Math.abs(modalCenterX - centerX)).toBeLessThan(10);

  // Verify modal has bottom margin (not stuck at 0)
  const viewportHeight = viewport!.height;
  const modalBottom = box!.y + box!.height;
  expect(modalBottom).toBeLessThan(viewportHeight - 10); // At least 10px from bottom
}

/**
 * Verifies that the modal overlay is visible and has correct opacity
 */
export async function verifyModalOverlay(page: Page) {
  const overlay = page.locator('[data-vaul-overlay]');
  await expect(overlay).toBeVisible();

  // Check that overlay has opacity (not fully transparent)
  const opacity = await overlay.evaluate((el) => {
    return window.getComputedStyle(el).opacity;
  });
  expect(parseFloat(opacity)).toBeGreaterThan(0);
}
