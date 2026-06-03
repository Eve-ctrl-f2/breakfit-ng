# Performance

BreakFit is a small, offline-first PWA, so the perf story is mostly "stay small
and stay reactive". This documents what's already in place and how to measure.

## Already applied

- **Standalone + lazy routes** — Timer / Insights / Settings (and auth) are
  lazy-loaded; the initial bundle only carries the shell + the first route.
- **Background preloading** — `withPreloading(PreloadAllModules)` warms the
  remaining routes after the first route is stable, so navigation is instant
  without inflating first paint.
- **Zoneless change detection** — no Zone.js; CD runs only on signal changes,
  which keeps the timer's per-250 ms tick cheap (one signal write, one targeted
  re-render of the readout).
- **OnPush everywhere** — every component is `ChangeDetectionStrategy.OnPush`.
- **Bundle budgets** — enforced in `angular.json`:
  - initial: warn @ 600 kB, error @ 1.2 MB
  - per-component style: warn @ 8 kB, error @ 16 kB
- **Service worker** — `@angular/service-worker` prefetches the app shell and
  lazily caches assets; repeat loads are offline-instant.
- **IndexedDB, not localStorage** — async, off the main thread for large reads.
- **PrimeNG styled mode with a single preset** — no per-component theme CSS;
  one token layer, tree-shaken components (only imported ones ship).

## How to measure

```bash
npm run build                       # production build -> dist/breakfit
npx http-server dist/breakfit/browser -p 5000   # or any static server
# Chrome DevTools > Lighthouse > Mobile > Analyze (against http://localhost:5000)
```

Target scores (mobile): Performance ≥ 90, PWA installable ✓, Accessibility ≥ 95.

For bundle analysis:

```bash
npm run build -- --stats-json
npx esbuild-visualizer --metadata dist/breakfit/stats.json --open
```

## If a budget is exceeded

1. Check the stats for an accidentally eager import (a feature component pulled
   into the shell instead of a lazy route).
2. Verify PrimeNG components are imported per-component (they are — each feature
   imports only the modules it uses).
3. Move any heavy, rarely-used view behind a lazy route or `@defer` block.

## Known non-issues

- The meeting strip and goal bar update at 1 Hz while active — bounded, signal-
  driven, single-node re-render. Not a hot path.
- The recommendation engine scores ≤ ~40 exercises on each break — O(n), runs
  once per break, negligible.
