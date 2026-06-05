import { Page } from '@playwright/test';

/**
 * Navigate to a route and dismiss the first-run onboarding overlay if it shows.
 * Each Playwright test gets a fresh context (empty IndexedDB), so onboarding
 * appears on first load and its modal intercepts pointer events. Pressing
 * Escape triggers the wizard's finish()/complete(), which hides it and persists
 * the "onboarded" flag. Locale-independent.
 */
export async function gotoApp(page: Page, route: string): Promise<void> {
  await page.goto(route);
  const dialog = page.locator('bf-onboarding [role="dialog"]');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 3000 });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // never appeared (already onboarded in this context) — nothing to dismiss
  }
}
