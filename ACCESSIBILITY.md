# Accessibility

A WCAG 2.1 AA-oriented pass over BreakFit's interactive surfaces. This records
what was audited, what was fixed, and what to verify with real assistive tech.

## Fixed in this pass

| Area | Issue | Fix | WCAG |
|---|---|---|---|
| Global | No visible keyboard focus anywhere | `:focus-visible` outline (accent, 2px) on all interactive elements | 2.4.7 |
| Global | No "skip to content" | Skip link (hidden until focused) → `#main` (focusable landmark) | 2.4.1 |
| Global | Animations ignored motion prefs | `prefers-reduced-motion` neutralizes transitions, animations, and view transitions | 2.3.3 |
| Nav | Active route not exposed | `ariaCurrentWhenActive="page"` on both nav bars | 4.1.2 |
| Nav | Decorative icons announced | `aria-hidden="true"` on nav `<i>` glyphs | 1.1.1 |
| Onboarding | No focus trap / no initial focus / no Escape | Focus moves to the step heading on open and on each step; Tab is trapped within the dialog; Escape skips | 2.1.2, 2.4.3 |
| Onboarding | Dialog had no accessible name | `aria-labelledby` → step heading (`#ob-title`) | 4.1.2 |
| Timer | Decorative dial exposed; time not labeled | Knob `aria-hidden`; readout is `role="timer"` with a phase + time label | 1.1.1, 4.1.2 |
| Timer | Phase changes not announced | Sub-line is `role="status" aria-live="polite"` (changes only on phase transitions, not per tick — no spam) | 4.1.3 |

## Already in good shape (verified)

- **Break modal** uses PrimeNG `p-dialog`, which traps focus, returns focus to
  the trigger on close, and wires `aria-labelledby` to its header. Amount
  steppers and shuffle have `aria-label`s.
- **Body heatmap** SVG is `role="img"` with an `aria-label` summary.
- **Rest-day picker** buttons expose `aria-pressed`; **custom-exercise** edit and
  delete buttons have `aria-label`s and `data-testid`s.
- **Form controls** (sliders, toggles, selects) are PrimeNG components with their
  own ARIA; labels are associated text.

## To verify with real AT (not automatable here)

- VoiceOver (iOS/Safari) + TalkBack (Android) pass through the timer, a break,
  and onboarding.
- Color contrast of `--text-2` / `.muted` on `--surface-*` ≥ 4.5:1 for body text
  (the button system was already reworked for contrast; muted secondary text
  should be spot-checked).
- Focus order through the break modal's step transitions.
- 200% zoom / reflow at 320 px width (1.4.10).

## How to test quickly

```bash
npm run build && npx http-server dist/breakfit/browser -p 5000
# Chrome DevTools > Lighthouse > Accessibility (mobile)
# Keyboard-only: Tab from page load — skip link should appear first.
# axe DevTools extension for a rule-based scan.
```
