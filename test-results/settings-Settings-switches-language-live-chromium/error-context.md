# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings >> switches language live
- Location: e2e\settings.spec.ts:4:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: 'English' })
    - locator resolved to <p-togglebutton pc130="" pc131="" tabindex="0" role="button" data-p="checked" aria-pressed="true" data-p-checked="true" data-pc-section="root" data-p-disabled="false" data-pc-name="pctogglebutton" data-pc-extend="togglebutton" class="p-ripple p-component p-togglebutton ng-untouched ng-pristine ng-valid p-togglebutton-checked">…</p-togglebutton>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <html lang="en" class="dark" data-accent="lime">…</html> intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title" _ngcontent-ng-c2236551159="">…</div> from <bf-onboarding _nghost-ng-c2236551159="">…</bf-onboarding> subtree intercepts pointer events
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