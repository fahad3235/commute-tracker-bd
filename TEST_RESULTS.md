# TEST_RESULTS.md -- commute-tracker-bd (real runs, 2026-10-16)

## Unit tests -- `node tests/logic.test.js`
- **86 passed, 0 failed, 86 total** (exit 0)
- Hand-verified math example: trips 45 min / 50 BDT + 30 min / 40 BDT +
  60 min / 0 BDT (walk) on one route -> 3 trips, 135 min, 90.00 BDT,
  avg 45.0 min, fastest 30, slowest 60, avg cost/trip 30.00 BDT. All match.
- Per-mode split: Bus 2 trips / avg 37.5 min / 90.00 BDT; Walk 1 trip / 0 BDT.
- 7-day bucketing (asof 2026-10-16): trip on asof-6 counted, trip on asof-7
  excluded; bucketed total 4. Empty-state buckets all zero, no crash.
- Validation rejections verified: future date, 0 / 601 minutes, 600 accepted,
  negative cost, 3-decimal cost, empty / 61-char route name, 60-char accepted,
  distance 2 decimals / 501 rejected, 8.5 accepted, traffic 6 rejected,
  5 accepted, 201-char note rejected, unknown route, bad mode, history
  from > to rejected.
- Money: integer paisa throughout; 0.10 + 0.20 = 30 paisa (no float error).
- Import: valid export re-imports with trips + paisa preserved; **13 malformed
  payloads rejected** (not JSON, empty string, array top-level, wrong app,
  wrong version, routes not array, trips not array, empty route name,
  future-date trip, negative-cost trip, unknown-route trip, duplicate route
  id, bad lang), and caller state byte-identical after a rejected import.

## Smoke tests -- `node tests/smoke.js` (raw CDP, headless Chromium, file:// + ?asof=2026-10-16)
- **35 passed, 0 failed, 35 total** (exit 0)
- Covered: page loads; empty dashboard (0 trips, chart SVG renders, chart
  empty message shown); trip empty-state points to Routes tab with zero
  routes; route added via UI; empty route name rejected inline; future trip
  date rejected inline and not counted; two trips added via UI; dashboard
  trips = 2, total cost 50.25, total time 1h 45m; per-route + per-mode rows
  render; chart has 7 bars; history 2 rows; filter Walk narrows to 1 row;
  clear filter restores 2 rows; history from > to rejected; delete reduces
  rows to 1; export produces `commute-tracker-bd` JSON containing the route;
  erase-all wipes trips; import round-trip restores data (dashboard trips = 1);
  malformed import rejected with error; data intact after malformed import;
  BN toggle renders Bengali digit + translates title; BN persists across
  reload; 390 px no horizontal overflow (dashboard + history);
  **0 console errors, 0 page errors, 0 HTTP(S) network requests**;
  localStorage key `commute-bd-v1` present.

## Repairs
- 1 harness repair (not an app bug): smoke test initially connected to the
  browser-level CDP socket, which has no `Page.*` methods; fixed to connect
  to the page target from `/json/list`. App code required 0 repair cycles.
- 1 app fix during build: `appToday()` briefly called itself (copy/paste in
  the `?asof=` helper); fixed to compute the local date directly. Caught by
  code review before tests ran.

## Source checks
- `grep -rP '[^\x00-\x7F]'` over `*.html` / `*.js` / `*.css` / `*.md`:
  **0 matches** (pure ASCII; Bengali strings are `\uXXXX` escapes).
- `node --check` passes on `js/logic.js`, `js/app.js`, `tests/logic.test.js`,
  `tests/smoke.js`.
- Ships empty: no demo trips/routes; first launch shows the empty state.
