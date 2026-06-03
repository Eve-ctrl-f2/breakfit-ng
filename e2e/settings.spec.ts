import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('switches language live', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('.section-title')).toHaveText('Settings');
  });

  test('adds, edits and removes a custom exercise', async ({ page }) => {
    await page.goto('/settings');
    const form = page.locator('bf-custom-exercise-form');

    // add
    await form.getByRole('button', { name: /Übung hinzufügen|Add exercise/ }).click();
    await form.getByPlaceholder(/Wandsitze|Wall sit|Chaise murale/).fill('E2E Test');
    await form.getByRole('button', { name: /Speichern|Save|Enregistrer/ }).click();

    const row = page.locator('.ex', { hasText: 'E2E Test' });
    await expect(row).toBeVisible();

    // edit -> rename
    await row.getByTestId('exercise-edit').click();
    const nameInput = form.getByPlaceholder(/Wandsitze|Wall sit|Chaise murale/);
    await nameInput.fill('E2E Renamed');
    await form.getByRole('button', { name: /Speichern|Save|Enregistrer/ }).click();
    await expect(page.locator('.ex', { hasText: 'E2E Renamed' })).toBeVisible();
    await expect(page.getByText('E2E Test')).toHaveCount(0);

    // remove
    await page.locator('.ex', { hasText: 'E2E Renamed' }).getByTestId('exercise-delete').click();
    await expect(page.getByText('E2E Renamed')).toHaveCount(0);
  });
});
