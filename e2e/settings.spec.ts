import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('switches language live', async ({ page }) => {
    await page.goto('/settings');
    // Click the English option in the language SelectButton
    await page.getByRole('button', { name: 'English' }).click();
    // The page title uses the unique .section-title class (nav links don't),
    // so scope to it to avoid the 3-way "Settings" ambiguity.
    await expect(page.locator('.section-title')).toHaveText('Settings');
  });

  test('adds and removes a custom exercise', async ({ page }) => {
    await page.goto('/settings');

    // The add button + form live inside the custom-exercise-form component.
    const form = page.locator('bf-custom-exercise-form');
    await form.getByRole('button', { name: /Übung hinzufügen|Add exercise/ }).click();
    await form.getByPlaceholder(/Wandsitze|Wall sit/).fill('E2E Test');
    // Scope Save to the form — the preset card also has a "Save current settings" button.
    await form.getByRole('button', { name: /Speichern|Save/ }).click();

    // The new exercise shows up in the pool list.
    const row = page.locator('.ex', { hasText: 'E2E Test' });
    await expect(row).toBeVisible();

    // Remove it again via the row's delete button — leaves state clean.
    await row.getByRole('button', { name: /Löschen|Delete/ }).click();
    await expect(page.getByText('E2E Test')).toHaveCount(0);
  });
});
