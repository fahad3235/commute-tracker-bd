// commute-tracker-bd -- DOM + localStorage. Depends on logic.js (global via script tags
// in the browser; in Node the test harness loads logic.js directly).
'use strict';
/* global document, window, localStorage, Blob, URL, FileReader, confirm, alert */

var I18N = {
  en: {
    appTitle: 'Commute Tracker BD', tagline: 'Daily commute tracker for Bangladesh',
    tabDashboard: 'Dashboard', tabRoutes: 'Routes', tabTrips: 'Trips', tabHistory: 'History', tabData: 'Data',
    langBtn: 'BN', langLabel: 'Language',
    dashTitle: 'Dashboard', routesTitle: 'Routes', tripsTitle: 'Log a Trip', historyTitle: 'History', dataTitle: 'Data',
    statTrips: 'Total trips', statCost: 'Total cost', statTime: 'Total time', statAvg: 'Avg duration',
    weekTrips: 'This week trips', weekCost: 'This week cost',
    routeStats: 'Per-route stats', modeStats: 'Per-mode breakdown', chartTitle: 'Last 7 days: trips per day',
    chartEmpty: 'No trips in the last 7 days yet. Log your first trip to see the chart.',
    noRoutes: 'No routes yet. Add your first route below.',
    noTrips: 'No trips yet.',
    addRoute: 'Add Route', saveRoute: 'Save Route', cancelEdit: 'Cancel',
    addTrip: 'Add Trip', deleteBtn: 'Delete', editBtn: 'Edit',
    tripEmptyRoutes: 'No routes yet. Add a route in the Routes tab first.',
    histFilter: 'Filter', histClear: 'Clear filters',
    clearAllTitle: 'Erase all data', clearAllHint: 'Type DELETE below to erase all routes and trips. This cannot be undone.',
    clearAllBtn: 'Erase Everything', clearAllDone: 'All data erased.',
    exportBtn: 'Export JSON', importBtn: 'Import JSON', importHint: 'Paste a commute-tracker-bd export below, or choose a file.',
    importDone: 'Import successful.', importFileLabel: 'Choose export file',
    exportHint: 'Export downloads a JSON file and also shows it below.',
    footer: 'Personal tracker, not a transport authority. Costs and durations are user-entered.',
    routeName: 'Route name', routeFrom: 'From', routeTo: 'To', defaultMode: 'Default mode', distance: 'Distance (km, optional)',
    tripDate: 'Date', tripRoute: 'Route', tripMode: 'Mode', duration: 'Duration (minutes)', cost: 'Cost (BDT)', traffic: 'Traffic (1-5, optional)', note: 'Note (optional)',
    colRoute: 'Route', colTrips: 'Trips', colAvgDur: 'Avg duration', colFastest: 'Fastest', colSlowest: 'Slowest', colTotalCost: 'Total cost', colAvgCost: 'Avg cost / trip',
    colMode: 'Mode', colDate: 'Date', colDuration: 'Duration', colCost: 'Cost', colTraffic: 'Traffic', colNote: 'Note', colActions: 'Actions',
    filterRoute: 'Route', filterMode: 'Mode', filterFrom: 'From date', filterTo: 'To date',
    allRoutes: 'All routes', allModes: 'All modes', noFilter: 'No trips match these filters.',
    deleteTripConfirm: 'Delete this trip?', deleteRouteTrips: 'This route has {n} trip(s). Deleting it will also delete those trips. Continue?',
    deleteRouteConfirm: 'Delete this route?', deleted: 'Deleted.',
    dashEmpty: 'No trips yet. Log your first trip in the Trips tab.'
  },
  bn: {} // filled below by BN dictionary (Bengali strings as unicode escapes)
};
I18N.bn = {"appTitle": "\u0995\u09ae\u09bf\u0989\u099f \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0 \u09ac\u09bf\u09a1\u09bf", "tagline": "\u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6\u09c7\u09b0 \u09af\u09be\u09a4\u09cd\u09b0\u09c0\u09a6\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09a6\u09c8\u09a8\u09bf\u0995 \u09af\u09be\u09a4\u09be\u09af\u09bc\u09be\u09a4 \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0", "tabDashboard": "\u09a1\u09cd\u09af\u09be\u09b6\u09ac\u09cb\u09b0\u09cd\u09a1", "tabRoutes": "\u09b0\u09c1\u099f", "tabTrips": "\u09af\u09be\u09a4\u09cd\u09b0\u09be", "tabHistory": "\u0987\u09a4\u09bf\u09b9\u09be\u09b8", "tabData": "\u09a1\u09c7\u099f\u09be", "langBtn": "EN", "langLabel": "\u09ad\u09be\u09b7\u09be", "dashTitle": "\u09a1\u09cd\u09af\u09be\u09b6\u09ac\u09cb\u09b0\u09cd\u09a1", "routesTitle": "\u09b0\u09c1\u099f\u09b8\u09ae\u09c2\u09b9", "tripsTitle": "\u09af\u09be\u09a4\u09cd\u09b0\u09be \u09b2\u09bf\u0996\u09c1\u09a8", "historyTitle": "\u0987\u09a4\u09bf\u09b9\u09be\u09b8", "dataTitle": "\u09a1\u09c7\u099f\u09be", "statTrips": "\u09ae\u09cb\u099f \u09af\u09be\u09a4\u09cd\u09b0\u09be", "statCost": "\u09ae\u09cb\u099f \u0996\u09b0\u099a", "statTime": "\u09ae\u09cb\u099f \u09b8\u09ae\u09af\u09bc", "statAvg": "\u0997\u09a1\u09bc \u09b8\u09ae\u09af\u09bc\u0995\u09be\u09b2", "weekTrips": "\u098f\u0987 \u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7\u09b0 \u09af\u09be\u09a4\u09cd\u09b0\u09be", "weekCost": "\u098f\u0987 \u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7\u09b0 \u0996\u09b0\u099a", "routeStats": "\u09aa\u09cd\u09b0\u09a4\u09bf \u09b0\u09c1\u099f \u09aa\u09b0\u09bf\u09b8\u0982\u0996\u09cd\u09af\u09be\u09a8", "modeStats": "\u09aa\u09b0\u09bf\u09ac\u09b9\u09a8 \u09ae\u09be\u09a7\u09cd\u09af\u09ae \u0985\u09a8\u09c1\u09af\u09be\u09af\u09bc\u09c0", "chartTitle": "\u09b6\u09c7\u09b7 \u09ed \u09a6\u09bf\u09a8: \u09aa\u09cd\u09b0\u09a4\u09bf\u09a6\u09bf\u09a8 \u09af\u09be\u09a4\u09cd\u09b0\u09be", "chartEmpty": "\u09b6\u09c7\u09b7 \u09ed \u09a6\u09bf\u09a8\u09c7 \u0995\u09cb\u09a8\u09cb \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09a8\u09c7\u0987\u0964 \u099a\u09be\u09b0\u09cd\u099f \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09cd\u09b0\u09a5\u09ae \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09b2\u09bf\u0996\u09c1\u09a8\u0964", "noRoutes": "\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09b0\u09c1\u099f \u09a8\u09c7\u0987\u0964 \u09a8\u09bf\u099a\u09c7 \u09aa\u09cd\u09b0\u09a5\u09ae \u09b0\u09c1\u099f \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964", "noTrips": "\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09a8\u09c7\u0987\u0964", "addRoute": "\u09b0\u09c1\u099f \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8", "saveRoute": "\u09b0\u09c1\u099f \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8", "cancelEdit": "\u09ac\u09be\u09a4\u09bf\u09b2", "addTrip": "\u09af\u09be\u09a4\u09cd\u09b0\u09be \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8", "deleteBtn": "\u09ae\u09c1\u099b\u09c1\u09a8", "editBtn": "\u09b8\u09ae\u09cd\u09aa\u09be\u09a6\u09a8\u09be", "tripEmptyRoutes": "\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09b0\u09c1\u099f \u09a8\u09c7\u0987\u0964 \u09aa\u09cd\u09b0\u09a5\u09ae\u09c7 \u09b0\u09c1\u099f \u099f\u09cd\u09af\u09be\u09ac\u09c7 \u098f\u0995\u099f\u09bf \u09b0\u09c1\u099f \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964", "histFilter": "\u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0", "histClear": "\u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0 \u09ae\u09c1\u099b\u09c1\u09a8", "clearAllTitle": "\u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09c1\u09a8", "clearAllHint": "\u09b8\u09ac \u09b0\u09c1\u099f \u0993 \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09ae\u09c1\u099b\u09a4\u09c7 \u09a8\u09bf\u099a\u09c7 DELETE \u09b2\u09bf\u0996\u09c1\u09a8\u0964 \u098f\u099f\u09bf \u09ab\u09c7\u09b0\u09be\u09a8\u09cb \u09af\u09be\u09ac\u09c7 \u09a8\u09be\u0964", "clearAllBtn": "\u09b8\u09ac \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09c1\u09a8", "clearAllDone": "\u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964", "exportBtn": "JSON \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f", "importBtn": "JSON \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f", "importHint": "\u09a8\u09bf\u099a\u09c7 \u0995\u09ae\u09bf\u0989\u099f-\u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0-\u09ac\u09bf\u09a1\u09bf \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u09aa\u09c7\u09b8\u09cd\u099f \u0995\u09b0\u09c1\u09a8 \u0985\u09a5\u09ac\u09be \u09ab\u09be\u0987\u09b2 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8\u0964", "importDone": "\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09b8\u09ab\u09b2 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964", "importFileLabel": "\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u09ab\u09be\u0987\u09b2 \u09ac\u09c7\u099b\u09c7 \u09a8\u09bf\u09a8", "exportHint": "\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f JSON \u09ab\u09be\u0987\u09b2 \u09a1\u09be\u0989\u09a8\u09b2\u09cb\u09a1 \u0995\u09b0\u09c7 \u098f\u09ac\u0982 \u09a8\u09bf\u099a\u09c7 \u09a6\u09c7\u0996\u09be\u09af\u09bc\u0964", "footer": "\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0, \u09aa\u09b0\u09bf\u09ac\u09b9\u09a8 \u0995\u09b0\u09cd\u09a4\u09c3\u09aa\u0995\u09cd\u09b7 \u09a8\u09af\u09bc\u0964 \u0996\u09b0\u099a \u0993 \u09b8\u09ae\u09af\u09bc \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u0995\u09be\u09b0\u09c0\u09b0 \u09a6\u09c7\u0993\u09af\u09bc\u09be\u0964", "routeName": "\u09b0\u09c1\u099f\u09c7\u09b0 \u09a8\u09be\u09ae", "routeFrom": "\u09a5\u09c7\u0995\u09c7", "routeTo": "\u09aa\u09b0\u09cd\u09af\u09a8\u09cd\u09a4", "defaultMode": "\u09a1\u09bf\u09ab\u09b2\u09cd\u099f \u09ae\u09be\u09a7\u09cd\u09af\u09ae", "distance": "\u09a6\u09c2\u09b0\u09a4\u09cd\u09ac (\u0995\u09bf\u09ae\u09bf, \u0990\u099a\u09cd\u099b\u09bf\u0995)", "tripDate": "\u09a4\u09be\u09b0\u09bf\u0996", "tripRoute": "\u09b0\u09c1\u099f", "tripMode": "\u09ae\u09be\u09a7\u09cd\u09af\u09ae", "duration": "\u09b8\u09ae\u09af\u09bc\u0995\u09be\u09b2 (\u09ae\u09bf\u09a8\u09bf\u099f)", "cost": "\u0996\u09b0\u099a (\u099f\u09be\u0995\u09be)", "traffic": "\u09af\u09be\u09a8\u099c\u099f (\u09e7-\u09eb, \u0990\u099a\u09cd\u099b\u09bf\u0995)", "note": "\u09a8\u09cb\u099f (\u0990\u099a\u09cd\u099b\u09bf\u0995)", "colRoute": "\u09b0\u09c1\u099f", "colTrips": "\u09af\u09be\u09a4\u09cd\u09b0\u09be", "colAvgDur": "\u0997\u09a1\u09bc \u09b8\u09ae\u09af\u09bc\u0995\u09be\u09b2", "colFastest": "\u09a6\u09cd\u09b0\u09c1\u09a4\u09a4\u09ae", "colSlowest": "\u09b8\u09ac\u099a\u09c7\u09af\u09bc\u09c7 \u09a7\u09c0\u09b0", "colTotalCost": "\u09ae\u09cb\u099f \u0996\u09b0\u099a", "colAvgCost": "\u0997\u09a1\u09bc \u0996\u09b0\u099a / \u09af\u09be\u09a4\u09cd\u09b0\u09be", "colMode": "\u09ae\u09be\u09a7\u09cd\u09af\u09ae", "colDate": "\u09a4\u09be\u09b0\u09bf\u0996", "colDuration": "\u09b8\u09ae\u09af\u09bc\u0995\u09be\u09b2", "colCost": "\u0996\u09b0\u099a", "colTraffic": "\u09af\u09be\u09a8\u099c\u099f", "colNote": "\u09a8\u09cb\u099f", "colActions": "\u0995\u09be\u099c", "filterRoute": "\u09b0\u09c1\u099f", "filterMode": "\u09ae\u09be\u09a7\u09cd\u09af\u09ae", "filterFrom": "\u09b6\u09c1\u09b0\u09c1\u09b0 \u09a4\u09be\u09b0\u09bf\u0996", "filterTo": "\u09b6\u09c7\u09b7 \u09a4\u09be\u09b0\u09bf\u0996", "allRoutes": "\u09b8\u09ac \u09b0\u09c1\u099f", "allModes": "\u09b8\u09ac \u09ae\u09be\u09a7\u09cd\u09af\u09ae", "noFilter": "\u098f\u0987 \u09ab\u09bf\u09b2\u09cd\u099f\u09be\u09b0\u09c7 \u0995\u09cb\u09a8\u09cb \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09a8\u09c7\u0987\u0964", "deleteTripConfirm": "\u098f\u0987 \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09ae\u09c1\u099b\u09ac\u09c7\u09a8?", "deleteRouteTrips": "\u098f\u0987 \u09b0\u09c1\u099f\u09c7 {n}\u099f\u09bf \u09af\u09be\u09a4\u09cd\u09b0\u09be \u0986\u099b\u09c7\u0964 \u09ae\u09c1\u099b\u09b2\u09c7 \u09b8\u09c7\u0997\u09c1\u09b2\u09cb\u0993 \u09ae\u09c1\u099b\u09c7 \u09af\u09be\u09ac\u09c7\u0964 \u099a\u09be\u09b2\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u09ac\u09c7\u09a8?", "deleteRouteConfirm": "\u098f\u0987 \u09b0\u09c1\u099f \u09ae\u09c1\u099b\u09ac\u09c7\u09a8?", "deleted": "\u09ae\u09cb\u099b\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964", "dashEmpty": "\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09a8\u09c7\u0987\u0964 \u09af\u09be\u09a4\u09cd\u09b0\u09be \u099f\u09cd\u09af\u09be\u09ac\u09c7 \u09aa\u09cd\u09b0\u09a5\u09ae \u09af\u09be\u09a4\u09cd\u09b0\u09be \u09b2\u09bf\u0996\u09c1\u09a8\u0964"};

var state = null;
var editingRouteId = null;
var TEST_ASOF = (function () { try { var q = new URLSearchParams(window.location.search); var a = q.get('asof'); return a && /^\d{4}-\d{2}-\d{2}$/.test(a) ? a : null; } catch (e) { return null; } })();
function appToday() { if (TEST_ASOF) return TEST_ASOF; var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function t(key) {
  var lang = state ? state.lang : 'en';
  var dict = I18N[lang] || I18N.en;
  return dict[key] || I18N.en[key] || key;
}
function fmtNum(x) { return localizeNumber(String(x), state.lang); }
function fmtMoney(paisa) {
  var s = formatMoney(paisa);
  var out = TAKA + ' ' + s;
  return state.lang === 'bn' ? toBengaliDigits(out) : out;
}
function fmtDateLabel(iso) { return state.lang === 'bn' ? toBengaliDigits(iso) : iso; }

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    var parsed = JSON.parse(raw);
    var v = validateImport(JSON.stringify(parsed), appToday());
    if (!v.ok) return emptyState();
    return v.state;
  } catch (e) { return emptyState(); }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, exportState(state)); } catch (e) { /* storage full/blocked */ }
}

function setTab(name) {
  var tabs = ['dashboard', 'routes', 'trips', 'history', 'data'];
  tabs.forEach(function (n) {
    var panel = $('tab-' + n);
    if (panel) panel.classList.toggle('active', n === name);
    var btn = document.querySelector('[data-tab-btn="' + n + '"]');
    if (btn) btn.classList.toggle('active', n === name);
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'routes') renderRoutes();
  if (name === 'trips') renderTripForm();
  if (name === 'history') renderHistory();
}

function renderStaticText() {
  $('app-title').textContent = t('appTitle');
  $('app-tagline').textContent = t('tagline');
  $('lang-toggle').textContent = state.lang === 'en' ? 'BN' : 'EN';
  document.querySelector('[data-tab-btn="dashboard"]').textContent = t('tabDashboard');
  document.querySelector('[data-tab-btn="routes"]').textContent = t('tabRoutes');
  document.querySelector('[data-tab-btn="trips"]').textContent = t('tabTrips');
  document.querySelector('[data-tab-btn="history"]').textContent = t('tabHistory');
  document.querySelector('[data-tab-btn="data"]').textContent = t('tabData');
  $('footer-text').textContent = t('footer');
  document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
  var map = {
    'dash-title': 'dashTitle', 'routes-title': 'routesTitle', 'trips-title': 'tripsTitle',
    'history-title': 'historyTitle', 'data-title': 'dataTitle',
    'lbl-stat-trips': 'statTrips', 'lbl-stat-cost': 'statCost', 'lbl-stat-time': 'statTime',
    'lbl-stat-avg': 'statAvg', 'lbl-stat-week-trips': 'weekTrips', 'lbl-stat-week-cost': 'weekCost',
    'lbl-chart-title': 'chartTitle', 'lbl-route-stats': 'routeStats', 'lbl-mode-stats': 'modeStats',
    'lbl-route-name': 'routeName', 'lbl-route-from': 'routeFrom', 'lbl-route-to': 'routeTo',
    'lbl-default-mode': 'defaultMode', 'lbl-distance': 'distance',
    'lbl-trip-date': 'tripDate', 'lbl-trip-route': 'tripRoute', 'lbl-trip-mode': 'tripMode',
    'lbl-duration': 'duration', 'lbl-cost': 'cost', 'lbl-traffic': 'traffic', 'lbl-note': 'note',
    'lbl-filter-route': 'filterRoute', 'lbl-filter-mode': 'filterMode',
    'lbl-filter-from': 'filterFrom', 'lbl-filter-to': 'filterTo',
    'lbl-clear-all-title': 'clearAllTitle', 'lbl-clear-all-hint': 'clearAllHint',
    'lbl-export-hint': 'exportHint', 'lbl-import-hint': 'importHint',
    'lbl-import-file': 'importFileLabel',
    'th-rs-route': 'colRoute', 'th-rs-trips': 'colTrips', 'th-rs-avg': 'colAvgDur',
    'th-rs-fast': 'colFastest', 'th-rs-slow': 'colSlowest', 'th-rs-total': 'colTotalCost',
    'th-rs-avgcost': 'colAvgCost',
    'th-ms-mode': 'colMode', 'th-ms-trips': 'colTrips', 'th-ms-avg': 'colAvgDur', 'th-ms-total': 'colTotalCost',
    'th-h-date': 'colDate', 'th-h-route': 'colRoute', 'th-h-mode': 'colMode',
    'th-h-dur': 'colDuration', 'th-h-cost': 'colCost', 'th-h-traffic': 'colTraffic',
    'th-h-note': 'colNote', 'th-h-actions': 'colActions'
  };
  Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.textContent = t(map[id]); });
  $('filter-btn').textContent = t('histFilter');
  $('filter-clear').textContent = t('histClear');
  $('clear-all-btn').textContent = t('clearAllBtn');
  $('export-btn').textContent = t('exportBtn');
  $('import-btn').textContent = t('importBtn');
  $('route-submit').textContent = editingRouteId ? t('saveRoute') : t('addRoute');
  $('trip-submit').textContent = t('addTrip');
  $('route-cancel').textContent = t('cancelEdit');
}

function renderDashboard() {
  var d = computeDashboard(state);
  $('stat-trips').textContent = fmtNum(d.totalTrips);
  $('stat-cost').textContent = fmtMoney(d.totalCostPaisa);
  $('stat-time').textContent = state.lang === 'bn' ? toBengaliDigits(formatDuration(d.totalMinutes)) : formatDuration(d.totalMinutes);
  $('stat-avg').textContent = fmtNum(d.avgDuration) + (state.lang === 'bn' ? ' ' + toBengaliDigits('min') : ' min');
  $('stat-week-trips').textContent = fmtNum(d.weekTrips);
  $('stat-week-cost').textContent = fmtMoney(d.weekCostPaisa);
  // per-route table
  var pr = perRouteStats(state);
  $('route-stats-body').innerHTML = pr.map(function (r) {
    return '<tr><td>' + esc(r.name) + '</td><td>' + fmtNum(r.trips) + '</td><td>' + (r.trips ? fmtNum(r.avgDuration) + ' min' : '-') + '</td><td>' + (r.fastest === null ? '-' : fmtNum(r.fastest) + ' min') + '</td><td>' + (r.slowest === null ? '-' : fmtNum(r.slowest) + ' min') + '</td><td>' + fmtMoney(r.totalCostPaisa) + '</td><td>' + fmtMoney(r.avgCostPaisa) + '</td></tr>';
  }).join('') || '<tr><td colspan="7">' + esc(t('noTrips')) + '</td></tr>';
  var pm = perModeStats(state);
  $('mode-stats-body').innerHTML = pm.map(function (m) {
    return '<tr><td>' + esc(m.mode) + '</td><td>' + fmtNum(m.trips) + '</td><td>' + fmtNum(m.avgDuration) + ' min</td><td>' + fmtMoney(m.totalCostPaisa) + '</td></tr>';
  }).join('') || '<tr><td colspan="4">' + esc(t('noTrips')) + '</td></tr>';
  // 7-day chart
  var buckets = bucket7Days(state);
  var maxTrips = Math.max.apply(null, buckets.map(function (b) { return b.trips; }).concat([1]));
  var W = 700, H = 220, padL = 30, padB = 30, padT = 16;
  var chartH = H - padT - padB, barW = Math.floor((W - padL - 20) / 7 * 0.6);
  var svg = '<svg id="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Trips per day, last 7 days">';
  buckets.forEach(function (b, i) {
    var x = padL + 10 + i * Math.floor((W - padL - 20) / 7);
    var bh = Math.round(b.trips / maxTrips * chartH);
    var y = padT + (chartH - bh);
    svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + bh + '" fill="#2563eb" rx="3"></rect>';
    svg += '<text x="' + (x + barW / 2) + '" y="' + (padT + chartH - bh - 4) + '" text-anchor="middle" font-size="13" fill="#111827">' + fmtNum(b.trips) + '</text>';
    svg += '<text x="' + (x + barW / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#4b5563">' + esc(b.label) + '</text>';
  });
  svg += '</svg>';
  $('chart').innerHTML = svg;
  var total7 = buckets.reduce(function (s, b) { return s + b.trips; }, 0);
  $('chart-empty').textContent = total7 === 0 ? t('chartEmpty') : '';
  $('chart-empty').style.display = total7 === 0 ? 'block' : 'none';
  if (d.totalTrips === 0) { $('dash-empty').textContent = t('dashEmpty'); $('dash-empty').style.display = 'block'; }
  else { $('dash-empty').style.display = 'none'; }
}

function renderRoutes() {
  if (!state.routes.length) { $('route-list').innerHTML = '<p>' + esc(t('noRoutes')) + '</p>'; }
  else {
    $('route-list').innerHTML = '<table><thead><tr><th>' + esc(t('routeName')) + '</th><th>' + esc(t('routeFrom')) + '</th><th>' + esc(t('routeTo')) + '</th><th>' + esc(t('defaultMode')) + '</th><th>' + esc(t('distance')) + '</th><th>' + esc(t('colActions')) + '</th></tr></thead><tbody>' +
      state.routes.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.from) + '</td><td>' + esc(r.to) + '</td><td>' + esc(r.mode) + '</td><td>' + (r.distanceKm === null ? '-' : fmtNum(r.distanceKm)) + '</td>' +
          '<td><button class="edit-route" data-id="' + esc(r.id) + '">' + esc(t('editBtn')) + '</button> <button class="delete-route" data-id="' + esc(r.id) + '">' + esc(t('deleteBtn')) + '</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  document.querySelectorAll('.edit-route').forEach(function (b) {
    b.addEventListener('click', function () { startEditRoute(b.getAttribute('data-id')); });
  });
  document.querySelectorAll('.delete-route').forEach(function (b) {
    b.addEventListener('click', function () { deleteRoute(b.getAttribute('data-id')); });
  });
  // mode select options
  var modeSel = $('route-mode');
  modeSel.innerHTML = '<option value=""></option>' + MODES.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
}
function startEditRoute(id) {
  var r = state.routes.filter(function (x) { return x.id === id; })[0];
  if (!r) return;
  editingRouteId = id;
  $('route-name').value = r.name; $('route-from').value = r.from; $('route-to').value = r.to;
  $('route-mode').value = r.mode || ''; $('route-distance').value = r.distanceKm === null ? '' : r.distanceKm;
  $('route-submit').textContent = t('saveRoute');
  $('route-cancel').style.display = 'inline-block';
}
function cancelEditRoute() {
  editingRouteId = null;
  $('route-form').reset();
  $('route-submit').textContent = t('addRoute');
  $('route-cancel').style.display = 'none';
  $('route-error').textContent = '';
}
function deleteRoute(id) {
  var r = state.routes.filter(function (x) { return x.id === id; })[0];
  if (!r) return;
  var n = state.trips.filter(function (x) { return x.routeId === id; }).length;
  var msg = n > 0 ? t('deleteRouteTrips').replace('{n}', String(n)) : t('deleteRouteConfirm');
  if (!confirm(msg)) return;
  state.routes = state.routes.filter(function (x) { return x.id !== id; });
  state.trips = state.trips.filter(function (x) { return x.routeId !== id; });
  if (editingRouteId === id) cancelEditRoute();
  saveState(); renderRoutes(); renderDashboard(); renderTripForm(); renderHistory();
}
function submitRoute(e) {
  e.preventDefault();
  var input = { name: $('route-name').value, from: $('route-from').value, to: $('route-to').value, mode: $('route-mode').value, distanceKm: $('route-distance').value };
  var errs = validateRoute(input);
  if (errs.length) { $('route-error').textContent = errs[0]; return; }
  if (editingRouteId) {
    var r = state.routes.filter(function (x) { return x.id === editingRouteId; })[0];
    if (r) { var nr = normalizeRoute(input); r.name = nr.name; r.from = nr.from; r.to = nr.to; r.mode = nr.mode; r.distanceKm = nr.distanceKm; }
  } else {
    state.routes.push(normalizeRoute(input));
  }
  saveState(); cancelEditRoute(); renderRoutes(); renderTripForm();
  $('route-error').textContent = '';
}

function renderTripForm() {
  var sel = $('trip-route');
  if (!state.routes.length) {
    sel.innerHTML = '<option value=""></option>';
    $('trip-empty-state').textContent = t('tripEmptyRoutes');
    $('trip-empty-state').style.display = 'block';
  } else {
    sel.innerHTML = state.routes.map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'; }).join('');
    $('trip-empty-state').style.display = 'none';
  }
  var modeSel = $('trip-mode');
  if (!modeSel.options.length) {
    modeSel.innerHTML = MODES.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
  }
  if (!$('trip-date').value) $('trip-date').value = appToday();
}
function submitTrip(e) {
  e.preventDefault();
  if (!state.routes.length) { $('trip-error').textContent = t('tripEmptyRoutes'); return; }
  var costPaisa = parseCostToPaisa($('trip-cost').value);
  var input = {
    date: $('trip-date').value, routeId: $('trip-route').value, mode: $('trip-mode').value,
    durationMin: $('trip-duration').value, costPaisa: costPaisa, costBdt: $('trip-cost').value,
    traffic: $('trip-traffic').value, note: $('trip-note').value
  };
  if (costPaisa === null) { $('trip-error').textContent = 'Cost must be between 0 and 100000 BDT with at most 2 decimal places.'; return; }
  var errs = validateTrip(input, state.routes, appToday());
  if (errs.length) { $('trip-error').textContent = errs[0]; return; }
  state.trips.push(normalizeTrip(input));
  saveState(); renderDashboard(); renderHistory();
  $('trip-error').textContent = '';
  $('trip-form').reset(); $('trip-date').value = appToday();
}

function currentFilter() {
  return { routeId: $('filter-route').value, mode: $('filter-mode').value, from: $('filter-from').value, to: $('filter-to').value };
}
function renderHistory() {
  var fSel = $('filter-route');
  fSel.innerHTML = '<option value="">' + esc(t('allRoutes')) + '</option>' + state.routes.map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'; }).join('');
  var mSel = $('filter-mode');
  if (!mSel.options.length) mSel.innerHTML = '<option value="">' + esc(t('allModes')) + '</option>' + MODES.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
  var f = currentFilter();
  var ferr = validateHistoryFilter(f);
  if (ferr.length) { $('filter-error').textContent = ferr[0]; return; }
  $('filter-error').textContent = '';
  var rows = filterTrips(state, f);
  $('history-count').textContent = fmtNum(rows.length) + ' ' + (state.lang === 'bn' ? '' : 'trip(s)');
  if (!rows.length) { $('history-body').innerHTML = '<tr><td colspan="8">' + esc(t('noFilter')) + '</td></tr>'; return; }
  var routeName = function (id) { var r = state.routes.filter(function (x) { return x.id === id; })[0]; return r ? r.name : '(deleted route)'; };
  $('history-body').innerHTML = rows.map(function (tr) {
    return '<tr><td>' + esc(fmtDateLabel(tr.date)) + '</td><td>' + esc(routeName(tr.routeId)) + '</td><td>' + esc(tr.mode) + '</td><td>' + fmtNum(tr.durationMin) + ' min</td><td>' + fmtMoney(tr.costPaisa) + '</td><td>' + (tr.traffic === null ? '-' : fmtNum(tr.traffic) + '/5') + '</td><td>' + esc(tr.note) + '</td><td><button class="delete-trip" data-id="' + esc(tr.id) + '">' + esc(t('deleteBtn')) + '</button></td></tr>';
  }).join('');
  document.querySelectorAll('.delete-trip').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm(t('deleteTripConfirm'))) return;
      state.trips = state.trips.filter(function (x) { return x.id !== b.getAttribute('data-id'); });
      saveState(); renderDashboard(); renderHistory();
    });
  });
}
function clearAll() {
  if ($('clear-all-input').value !== 'DELETE') { $('clear-all-error').textContent = 'Type DELETE exactly to erase all data.'; return; }
  state = emptyState();
  state.lang = (function () { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').lang || 'en'; } catch (e) { return 'en'; } })();
  // keep chosen language: re-read lang before wipe is lost, so preserve current UI lang
  saveState();
  $('clear-all-input').value = '';
  $('clear-all-error').textContent = t('clearAllDone');
  renderStaticText(); renderDashboard(); renderRoutes(); renderTripForm(); renderHistory();
}

function doExport() {
  var text = exportState(state);
  $('export-text').value = text;
  $('import-error').textContent = ''; $('import-success').textContent = '';
  try {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'commute-tracker-bd-export.json';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { /* download unavailable in some contexts; textarea still holds JSON */ }
}
function doImport() {
  var text = $('import-text').value.trim();
  if (!text) { $('import-error').textContent = 'Paste an export JSON or choose a file first.'; return; }
  var before = exportState(state);
  var res = validateImport(text, appToday());
  if (!res.ok) {
    // data intact: state untouched
    if (exportState(state) !== before) { state = JSON.parse(before); saveState(); }
    $('import-error').textContent = res.error;
    $('import-success').textContent = '';
    return;
  }
  state = res.state;
  saveState();
  $('import-error').textContent = '';
  $('import-success').textContent = t('importDone');
  renderStaticText(); renderDashboard(); renderRoutes(); renderTripForm(); renderHistory();
}

function init() {
  state = loadState();
  renderStaticText();
  $('lang-toggle').addEventListener('click', function () {
    state.lang = state.lang === 'en' ? 'bn' : 'en';
    saveState(); renderStaticText(); renderDashboard(); renderRoutes(); renderTripForm(); renderHistory();
  });
  document.querySelectorAll('[data-tab-btn]').forEach(function (b) {
    b.addEventListener('click', function () { setTab(b.getAttribute('data-tab-btn')); });
  });
  $('route-form').addEventListener('submit', submitRoute);
  $('route-cancel').addEventListener('click', cancelEditRoute);
  $('trip-form').addEventListener('submit', submitTrip);
  $('filter-btn').addEventListener('click', renderHistory);
  $('filter-clear').addEventListener('click', function () {
    $('filter-route').value = ''; $('filter-mode').value = ''; $('filter-from').value = ''; $('filter-to').value = '';
    renderHistory();
  });
  $('clear-all-btn').addEventListener('click', clearAll);
  $('export-btn').addEventListener('click', doExport);
  $('import-btn').addEventListener('click', doImport);
  $('import-file').addEventListener('change', function () {
    var f = $('import-file').files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { $('import-text').value = reader.result; };
    reader.readAsText(f);
  });
  renderDashboard(); renderRoutes(); renderTripForm(); renderHistory();
}
document.addEventListener('DOMContentLoaded', init);
