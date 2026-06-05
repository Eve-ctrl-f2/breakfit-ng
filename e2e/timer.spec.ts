import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers';

test.describe('Timer', () => {
  test('starts a focus block and counts down', async ({ page }) => {
    await gotoApp(page, '/timer');
    // idle: start button visible
    const start = page.getByRole('button', { name: /Fokus starten|Start focus/ });
    await expect(start).toBeVisible();
    await start.click();

    // running: readout shows MM:SS and a Pause button appears
    await expect(page.locator('.timer__readout')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(page.getByRole('button', { name: /Pause/ })).toBeVisible();
  });

  test('pause then resume keeps the session', async ({ page }) => {
    await gotoApp(page, '/timer');
    await page.getByRole('button', { name: /Fokus starten|Start focus/ }).click();
    await page.getByRole('button', { name: /Pause/ }).click();
    await expect(page.getByRole('button', { name: /Weiter|Resume/ })).toBeVisible();
  });
});
