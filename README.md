# Commute Tracker BD

Offline, bilingual (English / Bangla) daily commute tracker for Bangladeshi
commuters. Log home-to-work / home-to-school trips, see where your time and
money go, and keep your data on your own device. No account, no server, no
network requests at runtime.

Ships EMPTY: no demo trips, no demo routes, no fabricated data. Everything
you see after first launch is data you entered yourself.

## Problem

Dhaka commuters juggle buses, CNGs, rickshaws, bikes, walking, cars, and
trains, and the cost adds up invisibly. Existing trackers are either
English-only, account-gated, cloud-backed, or built for cars in other
countries. Commute Tracker BD is a small, private, offline-first tool that
answers one question honestly: "How much time and money did my commute
actually cost this week?"

## Features

1. **Route CRUD** - name (required, max 60 chars), from / to (each max 60),
   default mode, optional distance in km (0-500, up to 1 decimal). Inline
   validation errors. Edit and delete. Deleting a route asks for
   confirmation and also deletes that route's trips (the confirm dialog
   states how many trips will go with it).
2. **Trip log** - date (future dates rejected inline), route (dropdown from
   your routes; with zero routes a clear empty state points you to the
   Routes tab), mode (Bus / CNG / Rickshaw / Bike / Walk / Car / Train),
   duration in minutes (integer 1-600), cost in BDT (0-100000, up to 2
   decimals, stored as integer paisa to avoid float error), optional
   traffic rating 1-5, optional note (max 200 chars). Add and delete trips.
3. **Dashboard** - total trips, total cost, total time (h m), average
   duration, this-week trips + cost (last 7 days including today); per-route
   stats table (trips, avg duration, fastest, slowest, total cost, avg
   cost/trip); per-mode breakdown (trips, avg duration, total cost).
4. **7-day SVG chart** - trips per day as bars for the last 7 days
   including today. Renders cleanly with zero trips (empty-state message,
   no crash).
5. **History** - filter by route, mode, and date range (from <= to is
   validated); delete per trip; erase-all only after typing DELETE exactly.
6. **Data (JSON export / import)** - export downloads a JSON file (and shows
   it on screen); import validates STRICTLY: correct app id
   (`commute-tracker-bd`), version 1, schema checks on every field.
   Malformed, wrong-app, future-date, or negative-cost imports are rejected
   with a clear error and your existing data left untouched. A verified
   export -> erase -> import round-trip restores your data.
7. **Bangla / English toggle** - persisted in localStorage, with Bengali
   digits (0-9 rendered as Bengali digits) when Bangla is active. Layout is
   mobile-friendly with no horizontal overflow at 390 px width.

Footer disclaimer (also shown in the app): this is a personal tracker, not
a transport authority; costs and durations are user-entered.

## Stack

- Plain HTML + CSS + JavaScript. No framework, no build step, no CDN, no
  fonts, no analytics. Zero network requests at runtime.
- `js/logic.js` - pure logic (validation, stats, import validation). No DOM,
  no localStorage, Node-testable.
- `js/app.js` - DOM rendering + localStorage persistence.
- Storage: `localStorage` key `commute-bd-v1` only.
- Money: integer paisa everywhere (`parseCostToPaisa` / `formatMoney`).
- Source files are pure ASCII: Bengali UI strings are stored as `\uXXXX`
  escapes in `js/app.js` (and rendered through them), so the repo stays
  ASCII-safe for any transport.

## Install / run

No install step. Open `index.html` in any modern browser (double-click, or
serve the folder with any static server). For a deterministic demo date
used by the smoke test, append `?asof=YYYY-MM-DD`.

```sh
# option A: just open the file
open index.html

# option B: static server (any one will do)
python3 -m http.server 8080
# then visit http://localhost:8080/
```

## Development commands

```sh
node tests/logic.test.js   # unit tests (Node, no dependencies)
node tests/smoke.js        # browser smoke test (raw CDP, zero dependencies;
                           # uses /opt/meta-chromium/chrome on this VM)
```

## Testing

See `TEST_RESULTS.md` for the real recorded results of this release:

- Unit: 86 checks, 86 passed, 0 failed. Covers the hand-verified math
  example (45 min / 50 BDT + 30 min / 40 BDT + 60 min / 0 BDT walk ->
  3 trips, 135 min, 90.00 BDT, avg 45.0 min, fastest 30, slowest 60,
  avg cost/trip 30.00 BDT), per-mode splits, 7-day bucketing (a trip on
  asof-6 counts, asof-7 is excluded), validation rejections, and 13
  malformed import payloads rejected with data intact.
- Smoke (headless Chromium, raw CDP): 35 checks, 35 passed, 0 failed.
  Covers add-route / add-trip via the UI, dashboard numbers, history
  filter, delete, export -> erase -> import round-trip, malformed import
  rejected with data intact, Bangla toggle (Bengali digits + persistence
  across reload), 390 px no-overflow, 0 console/page errors, 0 HTTP(S)
  network requests.

## Deployment

Static hosting only. Copy the folder to GitHub Pages, Netlify Drop, or any
static host. There is no backend to deploy and no environment variables.

## Limitations

- Single-device, single-browser: data lives in that browser's localStorage
  under key `commute-bd-v1`. Clearing site data deletes your trips.
  Export JSON regularly as a backup.
- No multi-user / sync / cloud backup. Import is the only way to move data
  between devices.
- No GPS, no live traffic, no fare lookup: distances, durations, and costs
  are exactly what you type.
- Deleting a route deletes its trips (after a confirm dialog that tells
  you how many). There is no undo; export first if the data matters.
- Dates are calendar dates (`YYYY-MM-DD`); times of day are not recorded.
- "This week" means the last 7 days including today, not Monday-to-Sunday.

## Status

Complete MVP. All features above are implemented, unit-tested, and
browser-smoke-tested. See `TEST_RESULTS.md`.
