# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings >> adds, edits and removes a custom exercise
- Location: e2e\settings.spec.ts:10:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('bf-custom-exercise-form').getByRole('button', { name: /Übung hinzufügen|Add exercise/ })
    - locator resolved to <button pc119="" pc120="" pc121="" pripple="" type="button" autofocus="true" data-pc-name="button" data-pc-section="root" data-p="small outlined" class="p-ripple p-button p-button-outlined p-button-sm p-component">…</button>
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
      - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    22 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

```
Error: browserContext.close: Target page, context or browser has been closed
```