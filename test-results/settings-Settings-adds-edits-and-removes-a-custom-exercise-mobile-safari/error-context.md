# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings >> adds, edits and removes a custom exercise
- Location: e2e\settings.spec.ts:10:3

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for locator('bf-custom-exercise-form').getByRole('button', { name: /Übung hinzufügen|Add exercise/ })
    - locator resolved to <button pc113="" pc114="" pc115="" pripple="" type="button" autofocus="true" data-pc-name="button" data-pc-section="root" data-p="small outlined" class="p-ripple p-button p-button-outlined p-button-sm p-component">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <h2 id="ob-title" tabindex="-1" class="ob__title" _ngcontent-ng-c2236551159="">Welcome to BreakFit</h2> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <h2 id="ob-title" tabindex="-1" class="ob__title" _ngcontent-ng-c2236551159="">Welcome to BreakFit</h2> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
  4 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <h2 id="ob-title" tabindex="-1" class="ob__title" _ngcontent-ng-c2236551159="">Welcome to BreakFit</h2> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Settings', () => {
  4  |   test('switches language live', async ({ page }) => {
  5  |     await page.goto('/settings');
  6  |     await page.getByRole('button', { name: 'English' }).click();
  7  |     await expect(page.locator('.section-title')).toHaveText('Settings');
  8  |   });
  9  | 
  10 |   test('adds, edits and removes a custom exercise', async ({ page }) => {
  11 |     await page.goto('/settings');
  12 |     const form = page.locator('bf-custom-exercise-form');
  13 | 
  14 |     // add
> 15 |     await form.getByRole('button', { name: /Übung hinzufügen|Add exercise/ }).click();
     |                                                                               ^ Error: locator.click: Test ended.
  16 |     await form.getByPlaceholder(/Wandsitze|Wall sit|Chaise murale/).fill('E2E Test');
  17 |     await form.getByRole('button', { name: /Speichern|Save|Enregistrer/ }).click();
  18 | 
  19 |     const row = page.locator('.ex', { hasText: 'E2E Test' });
  20 |     await expect(row).toBeVisible();
  21 | 
  22 |     // edit -> rename
  23 |     await row.getByTestId('exercise-edit').click();
  24 |     const nameInput = form.getByPlaceholder(/Wandsitze|Wall sit|Chaise murale/);
  25 |     await nameInput.fill('E2E Renamed');
  26 |     await form.getByRole('button', { name: /Speichern|Save|Enregistrer/ }).click();
  27 |     await expect(page.locator('.ex', { hasText: 'E2E Renamed' })).toBeVisible();
  28 |     await expect(page.getByText('E2E Test')).toHaveCount(0);
  29 | 
  30 |     // remove
  31 |     await page.locator('.ex', { hasText: 'E2E Renamed' }).getByTestId('exercise-delete').click();
  32 |     await expect(page.getByText('E2E Renamed')).toHaveCount(0);
  33 |   });
  34 | });
  35 | 
```