// commute-tracker-bd -- pure logic (no DOM, no localStorage). Node-testable.
// All money is integer paisa. All dates are YYYY-MM-DD strings (local dates).
'use strict';

var APP_ID = 'commute-tracker-bd';
var VERSION = 1;
var STORAGE_KEY = 'commute-bd-v1';
var MODES = ['Bus', 'CNG', 'Rickshaw', 'Bike', 'Walk', 'Car', 'Train'];

// ---------- helpers ----------
function isValidDateStr(s) {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var d = new Date(s + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}
function todayStr(asof) {
  if (asof && isValidDateStr(asof)) return asof;
  var n = new Date();
  var y = n.getFullYear(), m = String(n.getMonth() + 1).padStart(2, '0'), d = String(n.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
function addDays(dateStr, days) {
  var d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// ---------- money ----------
// Parse a BDT string ("50", "50.5", "50.25") to integer paisa. Returns null if invalid.
function parseCostToPaisa(input) {
  if (input === null || input === undefined || input === '') return null;
  var s = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  var parts = s.split('.');
  var taka = parseInt(parts[0], 10);
  var paisaPart = parts[1] ? parts[1].padEnd(2, '0') : '00';
  var total = taka * 100 + parseInt(paisaPart, 10);
  if (total < 0 || total > 100000 * 100) return null;
  return total;
}
function paisaToBdtString(paisa) {
  var sign = paisa < 0 ? '-' : '';
  var a = Math.abs(paisa);
  return sign + Math.floor(a / 100) + '.' + String(a % 100).padStart(2, '0');
}
// Format paisa as "90.00" (no currency symbol; UI adds the symbol).
function formatMoney(paisa) { return paisaToBdtString(paisa); }
function formatDuration(totalMin) {
  totalMin = Math.round(totalMin);
  var h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (h === 0) return m + 'm';
  if (m === 0) return h + 'h';
  return h + 'h ' + m + 'm';
}
function round1(x) { return Math.round(x * 10) / 10; }

// ---------- validation ----------
function validateRoute(route) {
  var errors = [];
  if (!route || typeof route !== 'object') return ['Route is required.'];
  if (!route.name || !String(route.name).trim()) errors.push('Route name is required.');
  else if (String(route.name).trim().length > 60) errors.push('Route name must be 60 characters or fewer.');
  if (route.from !== undefined && route.from !== null && String(route.from).length > 60) errors.push('From must be 60 characters or fewer.');
  if (route.to !== undefined && route.to !== null && String(route.to).length > 60) errors.push('To must be 60 characters or fewer.');
  if (route.mode !== undefined && route.mode !== null && route.mode !== '' && MODES.indexOf(route.mode) === -1) errors.push('Default mode is not recognized.');
  if (route.distanceKm !== undefined && route.distanceKm !== null && route.distanceKm !== '') {
    var ds = String(route.distanceKm).trim();
    if (!/^\d+(\.\d)?$/.test(ds)) errors.push('Distance must be a number with at most 1 decimal place.');
    else { var dv = parseFloat(ds); if (dv < 0 || dv > 500) errors.push('Distance must be between 0 and 500 km.'); }
  }
  return errors;
}
function validateTrip(trip, routes, asof) {
  var errors = [];
  var today = todayStr(asof);
  if (!trip || typeof trip !== 'object') return ['Trip is required.'];
  if (!trip.date || !isValidDateStr(trip.date)) errors.push('Date is required and must be YYYY-MM-DD.');
  else if (trip.date > today) errors.push('Date cannot be in the future.');
  if (!trip.routeId) errors.push('Route is required.');
  else if (routes && routes.filter(function (r) { return r.id === trip.routeId; }).length === 0) errors.push('Route does not exist.');
  if (MODES.indexOf(trip.mode) === -1) errors.push('Mode is required and must be one of Bus, CNG, Rickshaw, Bike, Walk, Car, Train.');
  var dur = trip.durationMin;
  if (dur === undefined || dur === null || dur === '' || !/^\d+$/.test(String(dur).trim())) errors.push('Duration must be a whole number of minutes.');
  else { var di = parseInt(String(dur), 10); if (di < 1 || di > 600) errors.push('Duration must be between 1 and 600 minutes.'); }
  // costPaisa is the canonical field; costBdt string accepted as input too.
  if (trip.costPaisa !== undefined && trip.costPaisa !== null) {
    if (!Number.isInteger(trip.costPaisa) || trip.costPaisa < 0 || trip.costPaisa > 100000 * 100) errors.push('Cost must be between 0 and 100000 BDT.');
  } else if (trip.costBdt !== undefined && trip.costBdt !== null && trip.costBdt !== '') {
    if (parseCostToPaisa(trip.costBdt) === null) errors.push('Cost must be between 0 and 100000 BDT with at most 2 decimal places.');
  } else {
    errors.push('Cost is required (0 is allowed).');
  }
  if (trip.traffic !== undefined && trip.traffic !== null && trip.traffic !== '') {
    var t = parseInt(String(trip.traffic), 10);
    if (!/^\d+$/.test(String(trip.traffic).trim()) || t < 1 || t > 5) errors.push('Traffic rating must be 1 to 5 (or empty).');
  }
  if (trip.note !== undefined && trip.note !== null && String(trip.note).length > 200) errors.push('Note must be 200 characters or fewer.');
  return errors;
}
function normalizeRoute(input) {
  return {
    id: input.id || uid(),
    name: String(input.name || '').trim(),
    from: String(input.from || '').trim(),
    to: String(input.to || '').trim(),
    mode: input.mode || '',
    distanceKm: (input.distanceKm === undefined || input.distanceKm === null || input.distanceKm === '') ? null : parseFloat(String(input.distanceKm))
  };
}
function normalizeTrip(input) {
  var costPaisa = input.costPaisa;
  if (costPaisa === undefined || costPaisa === null) costPaisa = parseCostToPaisa(input.costBdt);
  var traffic = (input.traffic === undefined || input.traffic === null || input.traffic === '') ? null : parseInt(String(input.traffic), 10);
  return {
    id: input.id || uid(),
    date: input.date,
    routeId: input.routeId,
    mode: input.mode,
    durationMin: parseInt(String(input.durationMin), 10),
    costPaisa: costPaisa,
    traffic: traffic,
    note: String(input.note || '').trim()
  };
}

// ---------- stats ----------
function computeDashboard(state, asof) {
  var today = todayStr(asof);
  var weekStart = addDays(today, -6);
  var trips = state.trips || [];
  var totalTrips = trips.length;
  var totalCost = trips.reduce(function (s, t) { return s + t.costPaisa; }, 0);
  var totalMin = trips.reduce(function (s, t) { return s + t.durationMin; }, 0);
  var weekTrips = trips.filter(function (t) { return t.date >= weekStart && t.date <= today; });
  return {
    totalTrips: totalTrips,
    totalCostPaisa: totalCost,
    totalMinutes: totalMin,
    avgDuration: totalTrips ? round1(totalMin / totalTrips) : 0,
    weekTrips: weekTrips.length,
    weekCostPaisa: weekTrips.reduce(function (s, t) { return s + t.costPaisa; }, 0)
  };
}
function perRouteStats(state) {
  return (state.routes || []).map(function (r) {
    var ts = (state.trips || []).filter(function (t) { return t.routeId === r.id; });
    var totalCost = ts.reduce(function (s, t) { return s + t.costPaisa; }, 0);
    var durs = ts.map(function (t) { return t.durationMin; });
    return {
      routeId: r.id, name: r.name, trips: ts.length,
      avgDuration: ts.length ? round1(durs.reduce(function (a, b) { return a + b; }, 0) / ts.length) : 0,
      fastest: ts.length ? Math.min.apply(null, durs) : null,
      slowest: ts.length ? Math.max.apply(null, durs) : null,
      totalCostPaisa: totalCost,
      avgCostPaisa: ts.length ? Math.round(totalCost / ts.length) : 0
    };
  });
}
function perModeStats(state) {
  return MODES.map(function (m) {
    var ts = (state.trips || []).filter(function (t) { return t.mode === m; });
    var totalCost = ts.reduce(function (s, t) { return s + t.costPaisa; }, 0);
    return {
      mode: m, trips: ts.length,
      avgDuration: ts.length ? round1(ts.reduce(function (s, t) { return s + t.durationMin; }, 0) / ts.length) : 0,
      totalCostPaisa: totalCost
    };
  }).filter(function (x) { return x.trips > 0; });
}
function bucket7Days(state, asof) {
  var today = todayStr(asof);
  var out = [];
  for (var i = 6; i >= 0; i--) {
    var d = addDays(today, -i);
    var dayTrips = (state.trips || []).filter(function (t) { return t.date === d; });
    out.push({
      date: d, label: d.slice(5),
      trips: dayTrips.length,
      avgDuration: dayTrips.length ? round1(dayTrips.reduce(function (s, t) { return s + t.durationMin; }, 0) / dayTrips.length) : 0,
      totalCostPaisa: dayTrips.reduce(function (s, t) { return s + t.costPaisa; }, 0)
    });
  }
  return out;
}
function filterTrips(state, filter) {
  var out = (state.trips || []).slice();
  if (filter.routeId) out = out.filter(function (t) { return t.routeId === filter.routeId; });
  if (filter.mode) out = out.filter(function (t) { return t.mode === filter.mode; });
  if (filter.from) out = out.filter(function (t) { return t.date >= filter.from; });
  if (filter.to) out = out.filter(function (t) { return t.date <= filter.to; });
  out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  return out;
}
function validateHistoryFilter(filter) {
  var errors = [];
  if (filter.from && !isValidDateStr(filter.from)) errors.push('From date is invalid.');
  if (filter.to && !isValidDateStr(filter.to)) errors.push('To date is invalid.');
  if (filter.from && filter.to && filter.from > filter.to) errors.push('From date must be on or before To date.');
  return errors;
}

// ---------- import / export ----------
function validateImport(text, asof) {
  var today = todayStr(asof);
  var data;
  try { data = JSON.parse(text); } catch (e) { return { ok: false, error: 'File is not valid JSON.' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'Import must be a JSON object.' };
  if (data.app !== APP_ID) return { ok: false, error: 'Wrong app: this file is not a commute-tracker-bd export.' };
  if (data.version !== VERSION) return { ok: false, error: 'Unsupported version: expected version 1.' };
  if (!Array.isArray(data.routes)) return { ok: false, error: 'Import routes must be an array.' };
  if (!Array.isArray(data.trips)) return { ok: false, error: 'Import trips must be an array.' };
  if (data.lang !== undefined && data.lang !== 'en' && data.lang !== 'bn') return { ok: false, error: 'Import language must be "en" or "bn".' };
  var routeIds = {};
  for (var i = 0; i < data.routes.length; i++) {
    var r = data.routes[i];
    if (!r || typeof r !== 'object') return { ok: false, error: 'Route #' + (i + 1) + ' is invalid.' };
    var rErr = validateRoute(r);
    if (rErr.length) return { ok: false, error: 'Route #' + (i + 1) + ': ' + rErr[0] };
    if (!r.id || typeof r.id !== 'string') return { ok: false, error: 'Route #' + (i + 1) + ' is missing an id.' };
    if (routeIds[r.id]) return { ok: false, error: 'Duplicate route id: ' + r.id };
    routeIds[r.id] = true;
  }
  var tripIds = {};
  for (var j = 0; j < data.trips.length; j++) {
    var t = data.trips[j];
    if (!t || typeof t !== 'object') return { ok: false, error: 'Trip #' + (j + 1) + ' is invalid.' };
    if (!t.id || typeof t.id !== 'string') return { ok: false, error: 'Trip #' + (j + 1) + ' is missing an id.' };
    if (tripIds[t.id]) return { ok: false, error: 'Duplicate trip id: ' + t.id };
    tripIds[t.id] = true;
    if (t.date > today) return { ok: false, error: 'Trip #' + (j + 1) + ': date cannot be in the future.' };
    var tErr = validateTrip(t, data.routes, today);
    if (tErr.length) return { ok: false, error: 'Trip #' + (j + 1) + ': ' + tErr[0] };
  }
  var state = {
    app: APP_ID, version: VERSION,
    lang: data.lang || 'en',
    routes: data.routes.map(normalizeRoute),
    trips: data.trips.map(normalizeTrip)
  };
  return { ok: true, state: state };
}
function exportState(state) {
  return JSON.stringify({ app: APP_ID, version: VERSION, lang: state.lang || 'en', routes: state.routes || [], trips: state.trips || [] }, null, 2);
}
function emptyState() {
  return { app: APP_ID, version: VERSION, lang: 'en', routes: [], trips: [] };
}

// Bengali digits: "123" -> Bengali digits via unicode escapes (ASCII source).
var BN_DIGITS = ['\u09E6', '\u09E7', '\u09E8', '\u09E9', '\u09EA', '\u09EB', '\u09EC', '\u09ED', '\u09EE', '\u09EF'];
function toBengaliDigits(str) {
  return String(str).replace(/[0-9]/g, function (ch) { return BN_DIGITS[parseInt(ch, 10)]; });
}
function localizeNumber(str, lang) {
  return lang === 'bn' ? toBengaliDigits(str) : String(str);
}
var TAKA = '\u09F3';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP_ID: APP_ID, VERSION: VERSION, STORAGE_KEY: STORAGE_KEY, MODES: MODES, TAKA: TAKA,
    isValidDateStr: isValidDateStr, todayStr: todayStr, addDays: addDays,
    parseCostToPaisa: parseCostToPaisa, paisaToBdtString: paisaToBdtString,
    formatMoney: formatMoney, formatDuration: formatDuration, round1: round1,
    validateRoute: validateRoute, validateTrip: validateTrip,
    normalizeRoute: normalizeRoute, normalizeTrip: normalizeTrip,
    computeDashboard: computeDashboard, perRouteStats: perRouteStats,
    perModeStats: perModeStats, bucket7Days: bucket7Days,
    filterTrips: filterTrips, validateHistoryFilter: validateHistoryFilter,
    validateImport: validateImport, exportState: exportState, emptyState: emptyState,
    toBengaliDigits: toBengaliDigits, localizeNumber: localizeNumber
  };
}
