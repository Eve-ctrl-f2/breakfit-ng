# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timer.spec.ts >> Timer >> starts a focus block and counts down
- Location: e2e\timer.spec.ts:4:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: /Fokus starten|Start focus/ })
    - locator resolved to <button pc12="" pc13="" pc14="" pripple="" type="button" data-p="large" autofocus="true" data-pc-name="button" data-pc-section="root" class="p-ripple p-button p-button-lg p-component">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <html lang="en" class="dark" data-accent="lime">…</html> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="ob__card" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    23 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="ob__card" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Timer', () => {
  4  |   test('starts a focus block and counts down', async ({ page }) => {
  5  |     await page.goto('/timer');
  6  |     // idle: start button visible
  7  |     const start = page.getByRole('button', { name: /Fokus starten|Start focus/ });
  8  |     await expect(start).toBeVisible();
> 9  |     await start.click();
     |                 ^ Error: locator.click: Target page, context or browser has been closed
  10 | 
  11 |     // running: readout shows MM:SS and a Pause button appears
  12 |     await expect(page.locator('.timer__readout')).toHaveText(/^\d{2}:\d{2}$/);
  13 |     await expect(page.getByRole('button', { name: /Pause/ })).toBeVisible();
  14 |   });
  15 | 
  16 |   test('pause then resume keeps the session', async ({ page }) => {
  17 |     await page.goto('/timer');
  18 |     await page.getByRole('button', { name: /Fokus starten|Start focus/ }).click();
  19 |     await page.getByRole('button', { name: /Pause/ }).click();
  20 |     await expect(page.getByRole('button', { name: /Weiter|Resume/ })).toBeVisible();
  21 |   });
  22 | });
  23 | 
```