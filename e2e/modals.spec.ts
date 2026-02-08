import { test, expect } from '@playwright/test';
import { openModal, closeModal, verifyModalCentered, verifyModalOverlay } from './helpers/modal-helpers';

/**
 * Modal Responsive Behavior Tests
 *
 * These tests verify that all modals (EditSetModal, FilterSheet, HomeSectionsSheet,
 * CollectionSettingsModal) work correctly across different viewports and have proper
 * animations, accessibility, and responsive layouts.
 *
 * NOTE: These tests require authentication to access collection pages.
 * Set up Firebase auth in test environment or use test credentials before running.
 */

test.describe('Modals - Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Set up authentication here
    // For now, navigate to login page
    await page.goto('/login');

    // Wait for potential auth state or redirect
    // In a real test environment, you would:
    // 1. Mock Firebase auth
    // 2. Use test credentials
    // 3. Or stub auth state
  });

  test.skip('EditSetModal opens and displays correctly', async ({ page }) => {
    // Navigate to a collection with sets
    await page.goto('/collection');

    // Wait for sets to load
    await page.waitForSelector('[data-testid="set-card"]', { timeout: 10000 });

    // Click edit button on first set
    await openModal(page, /edit/i);

    // Verify modal is open
    await expect(page.locator('[data-vaul-drawer][data-state="open"]')).toBeVisible();

    // Verify handle is visible
    await expect(page.locator('[data-vaul-handle]')).toBeVisible();

    // Verify overlay
    await verifyModalOverlay(page);

    // Check form fields are present
    await expect(page.getByText(/status/i)).toBeVisible();
    await expect(page.getByText(/owner/i)).toBeVisible();

    // Close modal
    await closeModal(page);
    await expect(page.locator('[data-vaul-drawer][data-state="closed"]')).toBeVisible();
  });

  test.skip('EditSetModal has responsive grid layout', async ({ page }, testInfo) => {
    await page.goto('/collection');
    await page.waitForSelector('[data-testid="set-card"]', { timeout: 10000 });

    await openModal(page, /edit/i);

    // Check grid layout based on viewport
    const dateField = page.locator('input[type="date"]');
    const occasionField = page.locator('input[placeholder*="occasion"]').or(
      page.locator('label:has-text("Occasion") + input')
    );

    if (testInfo.project.name === 'mobile') {
      // Mobile: single column (fields stacked vertically)
      // Both fields should be at similar x position (same column)
      const dateBox = await dateField.boundingBox();
      const occasionBox = await occasionField.boundingBox();
      expect(dateBox).not.toBeNull();
      expect(occasionBox).not.toBeNull();
      expect(Math.abs(dateBox!.x - occasionBox!.x)).toBeLessThan(20);
    } else {
      // Desktop/Tablet: two columns (fields side by side)
      const dateBox = await dateField.boundingBox();
      const occasionBox = await occasionField.boundingBox();
      expect(dateBox).not.toBeNull();
      expect(occasionBox).not.toBeNull();
      expect(Math.abs(dateBox!.x - occasionBox!.x)).toBeGreaterThan(50);
    }
  });

  test.skip('FilterSheet opens and filters work', async ({ page }) => {
    await page.goto('/collection');

    // Open filter sheet
    await openModal(page, /filter/i);

    // Verify filter controls are present
    await expect(page.getByText(/status/i)).toBeVisible();
    await expect(page.getByText(/sort/i)).toBeVisible();

    // Check for dropdowns
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();

    // Verify "Apply" button
    await expect(page.getByRole('button', { name: /apply/i })).toBeVisible();

    // Close modal
    await closeModal(page);
  });

  test.skip('HomeSectionsSheet opens with section list', async ({ page }) => {
    await page.goto('/collection');

    // Open customize sheet
    await openModal(page, /customize/i);

    // Verify header title
    await expect(page.getByRole('heading', { name: /customize home/i })).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();

    // Close modal
    await closeModal(page);
  });

  test.skip('CollectionSettingsModal shows form fields', async ({ page }) => {
    await page.goto('/collection');

    // Open settings modal (typically in menu or settings icon)
    await openModal(page, /settings/i);

    // Verify form fields
    await expect(page.getByLabel(/collection name/i)).toBeVisible();
    await expect(page.getByLabel(/owners/i)).toBeVisible();

    // Verify save button
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();

    // Close modal
    await closeModal(page);
  });

  test.skip('Modal animations complete within expected time', async ({ page }) => {
    await page.goto('/collection');

    // Record start time
    const startTime = Date.now();

    // Open modal
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    await page.waitForSelector('[data-vaul-drawer][data-state="open"]', { timeout: 1000 });

    // Check animation completed reasonably fast (within 1 second)
    const openTime = Date.now() - startTime;
    expect(openTime).toBeLessThan(1000);

    // Wait for animation to settle
    await page.waitForTimeout(500);

    // Close modal and time it
    const closeStartTime = Date.now();
    await closeModal(page);

    const closeTime = Date.now() - closeStartTime;
    expect(closeTime).toBeLessThan(1000);
  });

  test.skip('Desktop modals are centered', async ({ page }, testInfo) => {
    // Only run on desktop projects
    test.skip(testInfo.project.name === 'mobile' || testInfo.project.name === 'tablet');

    await page.goto('/collection');
    await page.waitForSelector('[data-testid="set-card"]', { timeout: 10000 });

    // Open modal
    await openModal(page, /edit/i);

    // Verify modal is centered
    await verifyModalCentered(page);
  });

  test.skip('Mobile modals span full width', async ({ page }, testInfo) => {
    // Only run on mobile project
    test.skip(testInfo.project.name !== 'mobile');

    await page.goto('/collection');
    await page.waitForSelector('[data-testid="set-card"]', { timeout: 10000 });

    // Open modal
    await openModal(page, /edit/i);

    // Get modal width
    const box = await page.locator('.modal-sheet').boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();

    // On mobile, modal should be close to full width (within 20px for borders/padding)
    expect(Math.abs(box!.width - viewport!.width)).toBeLessThan(20);
  });

  test.skip('Modal overlay is visible and blocks clicks', async ({ page }) => {
    await page.goto('/collection');
    await openModal(page, /edit/i);

    // Verify overlay exists and is visible
    const overlay = page.locator('[data-vaul-overlay]');
    await expect(overlay).toBeVisible();

    // Click overlay to close modal
    await overlay.click();

    // Modal should close
    await page.waitForSelector('[data-vaul-drawer][data-state="closed"]', { timeout: 1000 });
  });

  test.skip('Modal can be closed with Escape key', async ({ page }) => {
    await page.goto('/collection');
    await openModal(page, /edit/i);

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await page.waitForSelector('[data-vaul-drawer][data-state="closed"]', { timeout: 1000 });
  });

  test.skip('Modal handle is draggable on touch devices', async ({ page }, testInfo) => {
    // Only run on mobile
    test.skip(testInfo.project.name !== 'mobile');

    await page.goto('/collection');
    await openModal(page, /edit/i);

    const handle = page.locator('[data-vaul-handle]');
    await expect(handle).toBeVisible();

    // Get initial modal position
    const initialBox = await page.locator('.modal-sheet').boundingBox();

    // Simulate drag down gesture (this may not work perfectly in all test environments)
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + initialBox!.width / 2, initialBox!.y + 100);
    await page.mouse.up();

    // Modal should either close or have moved
    // This is a basic check - actual behavior depends on Vaul's swipe threshold
    await page.waitForTimeout(500);
  });
});
