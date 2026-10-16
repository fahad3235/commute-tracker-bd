// commute-tracker-bd -- unit tests, Node, zero dependencies. Run: node tests/logic.test.js
'use strict';
var L = require('../js/logic.js');
var passed = 0, failed = 0;
var failures = [];
function check(name, cond, detail) {
  if (cond) { passed++; }
  else { failed++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL: ' + name + (detail ? ' :: ' + detail : '')); }
}
function eq(name, a, b) { check(name, a === b, 'got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b)); }

// --- money: integer paisa, no float error ---
eq('parse 50 -> 5000', L.parseCostToPaisa('50'), 5000);
eq('parse 50.25 -> 5025', L.parseCostToPaisa('50.25'), 5025);
eq('parse 0.10 -> 10', L.parseCostToPaisa('0.10'), 10);
eq('parse 0.1 -> 10', L.parseCostToPaisa('0.1'), 10);
eq('parse 100000 ok', L.parseCostToPaisa('100000'), 10000000);
eq('parse 100000.01 rejected', L.parseCostToPaisa('100000.01'), null);
eq('parse 3 decimals rejected', L.parseCostToPaisa('10.123'), null);
eq('parse negative rejected', L.parseCostToPaisa('-5'), null);
eq('parse empty rejected', L.parseCostToPaisa(''), null);
eq('parse abc rejected', L.parseCostToPaisa('abc'), null);
eq('format 9000 -> 90.00', L.formatMoney(9000), '90.00');
eq('format 5025 -> 50.25', L.formatMoney(5025), '50.25');
eq('0.1+0.2 style: 10+20 paisa = 30', L.parseCostToPaisa('0.10') + L.parseCostToPaisa('0.20'), 30);

// --- hand-verified dashboard math ---
// trips: 45min/50 BDT + 30min/40 BDT + 60min/0 BDT (walk) on one route
var state = {
  app: 'commute-tracker-bd', version: 1, lang: 'en',
  routes: [{ id: 'r1', name: 'Home-Office', from: 'Mirpur', to: 'Motijheel', mode: 'Bus', distanceKm: 8.5 }],
  trips: [
    { id: 't1', date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 45, costPaisa: 5000, traffic: 4, note: '' },
    { id: 't2', date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 4000, traffic: 3, note: '' },
    { id: 't3', date: '2026-10-15', routeId: 'r1', mode: 'Walk', durationMin: 60, costPaisa: 0, traffic: null, note: '' }
  ]
};
var d = L.computeDashboard(state, '2026-10-16');
eq('dashboard total trips 3', d.totalTrips, 3);
eq('dashboard total minutes 135', d.totalMinutes, 135);
eq('dashboard total cost 9000 paisa (90.00)', d.totalCostPaisa, 9000);
eq('dashboard avg 45.0', d.avgDuration, 45);
eq('dashboard week trips 3', d.weekTrips, 3);
eq('dashboard week cost 9000', d.weekCostPaisa, 9000);
var pr = L.perRouteStats(state);
eq('per-route trips 3', pr[0].trips, 3);
eq('per-route avg 45', pr[0].avgDuration, 45);
eq('per-route fastest 30', pr[0].fastest, 30);
eq('per-route slowest 60', pr[0].slowest, 60);
eq('per-route total cost 9000', pr[0].totalCostPaisa, 9000);
eq('per-route avg cost/trip 3000 (30.00)', pr[0].avgCostPaisa, 3000);
var pm = L.perModeStats(state);
eq('per-mode rows 2', pm.length, 2);
var bus = pm.filter(function (x) { return x.mode === 'Bus'; })[0];
var walk = pm.filter(function (x) { return x.mode === 'Walk'; })[0];
eq('per-mode Bus trips 2', bus.trips, 2);
eq('per-mode Bus avg 37.5', bus.avgDuration, 37.5);
eq('per-mode Bus cost 9000', bus.totalCostPaisa, 9000);
eq('per-mode Walk trips 1', walk.trips, 1);
eq('per-mode Walk cost 0', walk.totalCostPaisa, 0);
eq('formatDuration 135 -> 2h 15m', L.formatDuration(135), '2h 15m');
eq('formatDuration 45 -> 45m', L.formatDuration(45), '45m');
eq('formatDuration 60 -> 1h', L.formatDuration(60), '1h');

// --- 7-day bucketing: asof 2026-10-16; asof-6 counts, asof-7 excluded ---
var bState = JSON.parse(JSON.stringify(state));
bState.trips.push({ id: 't4', date: '2026-10-10', routeId: 'r1', mode: 'Bus', durationMin: 20, costPaisa: 1000, traffic: null, note: '' }); // asof-6
bState.trips.push({ id: 't5', date: '2026-10-09', routeId: 'r1', mode: 'Bus', durationMin: 20, costPaisa: 1000, traffic: null, note: '' }); // asof-7, excluded
var buckets = L.bucket7Days(bState, '2026-10-16');
eq('buckets length 7', buckets.length, 7);
eq('bucket first date asof-6', buckets[0].date, '2026-10-10');
eq('bucket asof-6 trips 1', buckets[0].trips, 1);
eq('bucket last date asof', buckets[6].date, '2026-10-16');
eq('bucket asof trips 2', buckets[6].trips, 2);
var totalBucketed = buckets.reduce(function (s, b) { return s + b.trips; }, 0);
eq('bucketed total 4 (asof-7 excluded)', totalBucketed, 4);
// empty state buckets render without crash
var emptyBuckets = L.bucket7Days(L.emptyState(), '2026-10-16');
eq('empty buckets all zero', emptyBuckets.every(function (b) { return b.trips === 0; }), true);
var emptyDash = L.computeDashboard(L.emptyState(), '2026-10-16');
eq('empty dashboard trips 0', emptyDash.totalTrips, 0);
eq('empty dashboard avg 0', emptyDash.avgDuration, 0);

// --- validation ---
var routes = state.routes;
check('future date rejected', L.validateTrip({ date: '2026-10-17', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 1000 }, routes, '2026-10-16').length > 0);
check('today accepted', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 1000 }, routes, '2026-10-16').length === 0);
check('0 minutes rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 0, costPaisa: 1000 }, routes, '2026-10-16').length > 0);
check('601 minutes rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 601, costPaisa: 1000 }, routes, '2026-10-16').length > 0);
check('600 minutes accepted', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 600, costPaisa: 1000 }, routes, '2026-10-16').length === 0);
check('negative cost rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: -1 }, routes, '2026-10-16').length > 0);
check('3-decimal cost string rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costBdt: '10.123' }, routes, '2026-10-16').length > 0);
check('2-decimal cost string accepted', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costBdt: '10.12' }, routes, '2026-10-16').length === 0);
check('empty route name rejected', L.validateRoute({ name: '  ', from: '', to: '', mode: '', distanceKm: '' }).length > 0);
check('61-char route name rejected', L.validateRoute({ name: new Array(62).join('x'), from: '', to: '', mode: '', distanceKm: '' }).length > 0);
check('60-char route name accepted', L.validateRoute({ name: new Array(61).join('x'), from: '', to: '', mode: '', distanceKm: '' }).length === 0);
check('distance 2 decimals rejected', L.validateRoute({ name: 'A', distanceKm: '8.55' }).length > 0);
check('distance 501 rejected', L.validateRoute({ name: 'A', distanceKm: '501' }).length > 0);
check('distance 8.5 accepted', L.validateRoute({ name: 'A', distanceKm: '8.5' }).length === 0);
check('traffic 6 rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 1000, traffic: 6 }, routes, '2026-10-16').length > 0);
check('traffic 5 accepted', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 1000, traffic: 5 }, routes, '2026-10-16').length === 0);
check('note 201 chars rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 1000, note: new Array(202).join('x') }, routes, '2026-10-16').length > 0);
check('unknown route rejected', L.validateTrip({ date: '2026-10-16', routeId: 'nope', mode: 'Bus', durationMin: 30, costPaisa: 1000 }, routes, '2026-10-16').length > 0);
check('bad mode rejected', L.validateTrip({ date: '2026-10-16', routeId: 'r1', mode: 'Plane', durationMin: 30, costPaisa: 1000 }, routes, '2026-10-16').length > 0);
check('history from>to rejected', L.validateHistoryFilter({ from: '2026-10-16', to: '2026-10-10' }).length > 0);
check('history from<=to accepted', L.validateHistoryFilter({ from: '2026-10-10', to: '2026-10-16' }).length === 0);

// --- filters ---
var filtered = L.filterTrips(state, { routeId: 'r1', mode: 'Bus', from: '', to: '' });
eq('filter mode Bus -> 2', filtered.length, 2);
var filtered2 = L.filterTrips(state, { routeId: '', mode: '', from: '2026-10-16', to: '2026-10-16' });
eq('filter date 10-16 -> 2', filtered2.length, 2);

// --- Bengali digits ---
eq('bengali digits 0123456789', L.toBengaliDigits('0123456789'), '\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF');
eq('localize en keeps digits', L.localizeNumber('123', 'en'), '123');

// --- import: valid round-trip ---
var exported = L.exportState(state);
var imp = L.validateImport(exported, '2026-10-16');
check('valid export imports', imp.ok === true);
eq('import preserves trips', imp.state.trips.length, 3);
eq('import preserves cost paisa', imp.state.trips[0].costPaisa, 5000);

// --- import: 8+ malformed cases rejected, data intact ---
var good = L.exportState(state);
var malformed = [
  ['not json', '{not json'],
  ['empty string', ''],
  ['array top-level', '[]'],
  ['wrong app', JSON.stringify({ app: 'other-app', version: 1, routes: [], trips: [] })],
  ['wrong version', JSON.stringify({ app: 'commute-tracker-bd', version: 99, routes: [], trips: [] })],
  ['routes not array', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: {}, trips: [] })],
  ['trips not array', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: [], trips: 'x' })],
  ['route empty name', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: [{ id: 'r9', name: '', from: '', to: '', mode: '', distanceKm: null }], trips: [] })],
  ['trip future date', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: [{ id: 'r1', name: 'A', from: '', to: '', mode: '', distanceKm: null }], trips: [{ id: 't9', date: '2026-10-17', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: 1000, traffic: null, note: '' }] })],
  ['trip negative cost', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: [{ id: 'r1', name: 'A', from: '', to: '', mode: '', distanceKm: null }], trips: [{ id: 't9', date: '2026-10-16', routeId: 'r1', mode: 'Bus', durationMin: 30, costPaisa: -5, traffic: null, note: '' }] })],
  ['trip unknown route', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: [], trips: [{ id: 't9', date: '2026-10-16', routeId: 'ghost', mode: 'Bus', durationMin: 30, costPaisa: 1000, traffic: null, note: '' }] })],
  ['duplicate route id', JSON.stringify({ app: 'commute-tracker-bd', version: 1, routes: [{ id: 'r1', name: 'A', from: '', to: '', mode: '', distanceKm: null }, { id: 'r1', name: 'B', from: '', to: '', mode: '', distanceKm: null }], trips: [] })],
  ['bad lang', JSON.stringify({ app: 'commute-tracker-bd', version: 1, lang: 'fr', routes: [], trips: [] })]
];
malformed.forEach(function (pair) {
  var r = L.validateImport(pair[1], '2026-10-16');
  check('import rejected: ' + pair[0], r.ok === false, r.error || 'accepted');
});
// data-intact: a rejected import never mutates the caller's state object
var before = JSON.stringify(state);
L.validateImport(malformed[0][1], '2026-10-16');
eq('state untouched after rejected import', JSON.stringify(state), before);
eq('good export still imports after rejects', L.validateImport(good, '2026-10-16').ok, true);

console.log('\n' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total');
if (failures.length) { console.log('Failures:'); failures.forEach(function (f) { console.log(' - ' + f); }); }
process.exit(failed ? 1 : 0);
