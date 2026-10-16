// commute-tracker-bd -- headless-Chrome smoke test via raw CDP, zero dependencies.
// Run: node tests/smoke.js   (uses /opt/meta-chromium/chrome, file:// + ?asof=2026-10-16)
'use strict';
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var CHROME = '/opt/meta-chromium/chrome';
var PORT = 9223;
var ASOF = '2026-10-16';
var ROOT = path.resolve(__dirname, '..');
var URL = 'file://' + path.join(ROOT, 'index.html') + '?asof=' + ASOF;

var passed = 0, failed = 0;
var failures = [];
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS: ' + name); }
  else { failed++; failures.push(name); console.log('FAIL: ' + name + (detail ? ' :: ' + detail : '')); }
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function cdp(ws) {
  var id = 0;
  var pending = new Map();
  ws.onmessage = function (ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.id && pending.has(msg.id)) {
      var p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result || {});
    } else if (msg.method) {
      cdp.onEvent(msg.method, msg.params || {});
    }
  };
  cdp.onEvent = function () {};
  return {
    send: function (method, params) {
      return new Promise(function (resolve, reject) {
        var mid = ++id;
        pending.set(mid, { resolve: resolve, reject: reject });
        ws.send(JSON.stringify({ id: mid, method: method, params: params || {} }));
      });
    }
  };
}

async function ev(client, expression) {
  var r = await client.send('Runtime.evaluate', { expression: expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('evaluate exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result ? r.result.value : undefined;
}
async function waitFor(client, expr, timeoutMs) {
  var deadline = Date.now() + (timeoutMs || 5000);
  while (Date.now() < deadline) {
    var v = await ev(client, expr).catch(function () { return false; });
    if (v) return true;
    await sleep(150);
  }
  return false;
}

async function main() {
  var consoleErrors = [];
  var pageErrors = [];
  var httpRequests = [];
  var chrome = child_process.spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-proxy-server', '--remote-debugging-port=' + PORT, 'about:blank'
  ], { stdio: 'ignore' });
  try {
    // wait for DevTools endpoint
    var version = null;
    for (var i = 0; i < 50 && !version; i++) {
      await sleep(200);
      try {
        var out = child_process.execSync('curl -s http://127.0.0.1:' + PORT + '/json/version', { encoding: 'utf8' });
        version = JSON.parse(out);
      } catch (e) { /* not up yet */ }
    }
    if (!version) throw new Error('Chrome DevTools did not come up');
    // Connect to a PAGE target (browser-level socket has no Page.* methods).
    var listOut = child_process.execSync('curl -s http://127.0.0.1:' + PORT + '/json/list', { encoding: 'utf8' });
    var targets = JSON.parse(listOut);
    var pageTarget = targets.filter(function (t) { return t.type === 'page'; })[0];
    if (!pageTarget) throw new Error('No page target found');
    var ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(function (res, rej) { ws.onopen = res; ws.onerror = rej; });
    var client = cdp(ws);
    client.onEvent = function (method, params) {
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') consoleErrors.push(JSON.stringify(params.args).slice(0, 300));
      if (method === 'Runtime.exceptionThrown') pageErrors.push(JSON.stringify(params.exceptionDetails).slice(0, 500));
      if (method === 'Log.entryAdded' && params.entry && params.entry.level === 'error') pageErrors.push(params.entry.text);
      if (method === 'Network.requestWillBeSent') {
        var u = params.request && params.request.url || '';
        if (/^https?:\/\//.test(u)) httpRequests.push(u);
      }
    };
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Log.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm = function(){ return true; };' });
    await client.send('Page.navigate', { url: URL });
    var loaded = await waitFor(client, "document.readyState === 'complete' && !!document.getElementById('stat-trips')", 10000);
    check('page loads', loaded);
    await sleep(300);

    // 1. empty state
    check('empty: 0 trips on dashboard', await ev(client, "document.getElementById('stat-trips').textContent.trim()") === '0');
    check('empty: chart svg renders with 0 trips', await ev(client, "!!document.querySelector('#chart svg')"));
    check('empty: chart empty message shown', await ev(client, "document.getElementById('chart-empty').style.display === 'block'"));
    // trips tab empty-state with zero routes
    await ev(client, "document.querySelector('[data-tab-btn=\"trips\"]').click()");
    await sleep(200);
    check('empty: trip empty-state points to Routes tab', await ev(client, "document.getElementById('trip-empty-state').style.display === 'block' && document.getElementById('trip-empty-state').textContent.indexOf('Routes') !== -1"));

    // 2. add route via UI
    await ev(client, "document.querySelector('[data-tab-btn=\"routes\"]').click()");
    await sleep(200);
    await ev(client, "document.getElementById('route-name').value='Home-Office'; document.getElementById('route-from').value='Mirpur'; document.getElementById('route-to').value='Motijheel'; document.getElementById('route-mode').value='Bus'; document.getElementById('route-distance').value='8.5'; document.getElementById('route-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
    await sleep(300);
    check('route added via UI', await ev(client, "document.getElementById('route-list').textContent.indexOf('Home-Office') !== -1"));
    check('route validation: empty name rejected', await (async function () {
      await ev(client, "document.getElementById('route-name').value=''; document.getElementById('route-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
      await sleep(200);
      return await ev(client, "document.getElementById('route-error').textContent.length > 0");
    })());

    // 3. future date rejected inline
    await ev(client, "document.querySelector('[data-tab-btn=\"trips\"]').click()");
    await sleep(200);
    var routeId = await ev(client, "document.getElementById('trip-route').value");
    await ev(client, "document.getElementById('trip-date').value='2026-10-17'; document.getElementById('trip-mode').value='Bus'; document.getElementById('trip-duration').value='30'; document.getElementById('trip-cost').value='40'; document.getElementById('trip-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
    await sleep(200);
    check('future trip date rejected inline', await ev(client, "document.getElementById('trip-error').textContent.indexOf('future') !== -1"));
    await ev(client, "document.querySelector('[data-tab-btn=\"dashboard\"]').click()");
    await sleep(200);
    check('rejected trip not counted', await ev(client, "document.getElementById('stat-trips').textContent.trim()") === '0');

    // 4. add two trips via UI
    await ev(client, "document.querySelector('[data-tab-btn=\"trips\"]').click()");
    await sleep(200);
    await ev(client, "document.getElementById('trip-date').value='2026-10-16'; document.getElementById('trip-mode').value='Bus'; document.getElementById('trip-duration').value='45'; document.getElementById('trip-cost').value='50.25'; document.getElementById('trip-traffic').value='4'; document.getElementById('trip-note').value='Morning commute'; document.getElementById('trip-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
    await sleep(300);
    await ev(client, "document.getElementById('trip-date').value='2026-10-15'; document.getElementById('trip-mode').value='Walk'; document.getElementById('trip-duration').value='60'; document.getElementById('trip-cost').value='0'; document.getElementById('trip-traffic').value=''; document.getElementById('trip-note').value='Evening walk'; document.getElementById('trip-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
    await sleep(300);
    await ev(client, "document.querySelector('[data-tab-btn=\"dashboard\"]').click()");
    await sleep(300);
    check('dashboard trips = 2', await ev(client, "document.getElementById('stat-trips').textContent.trim()") === '2');
    check('dashboard total cost 50.25', await ev(client, "document.getElementById('stat-cost').textContent.indexOf('50.25') !== -1"));
    check('dashboard total time 1h 45m', await ev(client, "document.getElementById('stat-time').textContent.indexOf('1h 45m') !== -1"));
    check('dashboard per-route row renders', await ev(client, "document.getElementById('route-stats-body').textContent.indexOf('Home-Office') !== -1"));
    check('dashboard per-mode row renders', await ev(client, "document.getElementById('mode-stats-body').textContent.indexOf('Bus') !== -1"));
    check('chart has 7 bars', await ev(client, "document.querySelectorAll('#chart-svg rect').length") === 7);

    // 5. history filter narrows rows
    await ev(client, "document.querySelector('[data-tab-btn=\"history\"]').click()");
    await sleep(300);
    check('history shows 2 rows', await ev(client, "document.querySelectorAll('#history-body tr').length") === 2);
    await ev(client, "document.getElementById('filter-mode').value='Walk'; document.getElementById('filter-btn').click();");
    await sleep(300);
    check('history filter Walk narrows to 1 row', await ev(client, "document.querySelectorAll('#history-body tr').length") === 1);
    await ev(client, "document.getElementById('filter-clear').click();");
    await sleep(300);
    check('history clear filter restores 2 rows', await ev(client, "document.querySelectorAll('#history-body tr').length") === 2);
    // invalid date range
    await ev(client, "document.getElementById('filter-from').value='2026-10-16'; document.getElementById('filter-to').value='2026-10-10'; document.getElementById('filter-btn').click();");
    await sleep(200);
    check('history from>to rejected', await ev(client, "document.getElementById('filter-error').textContent.length > 0"));
    await ev(client, "document.getElementById('filter-clear').click();");
    await sleep(200);

    // 6. delete works (delete one trip)
    await ev(client, "document.querySelector('#history-body .delete-trip').click();");
    await sleep(300);
    check('delete trip reduces rows to 1', await ev(client, "document.querySelectorAll('#history-body tr').length") === 1);

    // 7. export -> erase -> import round-trip
    await ev(client, "document.querySelector('[data-tab-btn=\"data\"]').click()");
    await sleep(200);
    await ev(client, "document.getElementById('export-btn').click();");
    await sleep(300);
    var exported = await ev(client, "document.getElementById('export-text').value");
    check('export produces commute-tracker-bd JSON', typeof exported === 'string' && exported.indexOf('"app": "commute-tracker-bd"') !== -1 && exported.indexOf('Home-Office') !== -1, (exported || '').slice(0, 120));
    await ev(client, "document.querySelector('[data-tab-btn=\"history\"]').click()");
    await sleep(200);
    await ev(client, "document.getElementById('clear-all-input').value='DELETE'; document.getElementById('clear-all-btn').click();");
    await sleep(300);
    check('erase-all wipes trips', await ev(client, "document.querySelectorAll('#history-body tr').length") === 1 && (await ev(client, "document.getElementById('history-body').textContent")).indexOf('No trips') !== -1);
    await ev(client, "document.querySelector('[data-tab-btn=\"data\"]').click()");
    await sleep(200);
    await ev(client, "document.getElementById('import-text').value = document.getElementById('export-text').value; document.getElementById('import-btn').click();");
    await sleep(300);
    check('import round-trip restores data', await ev(client, "document.getElementById('import-success').textContent.length > 0"));
    await ev(client, "document.querySelector('[data-tab-btn=\"dashboard\"]').click()");
    await sleep(300);
    check('imported trip counted on dashboard', await ev(client, "document.getElementById('stat-trips').textContent.trim()") === '1');

    // 8. malformed import rejected, data intact
    await ev(client, "document.querySelector('[data-tab-btn=\"data\"]').click()");
    await sleep(200);
    await ev(client, "document.getElementById('import-text').value='{\"app\":\"other-app\",\"version\":1,\"routes\":[],\"trips\":[]}'; document.getElementById('import-btn').click();");
    await sleep(300);
    check('malformed import rejected with error', await ev(client, "document.getElementById('import-error').textContent.length > 0"));
    await ev(client, "document.querySelector('[data-tab-btn=\"dashboard\"]').click()");
    await sleep(200);
    check('data intact after malformed import', await ev(client, "document.getElementById('stat-trips').textContent.trim()") === '1');

    // 9. BN toggle: Bengali digits + persists across reload
    await ev(client, "document.getElementById('lang-toggle').click();");
    await sleep(300);
    check('BN toggle renders Bengali digit', await ev(client, "document.getElementById('stat-trips').textContent.indexOf('\\u09E7') !== -1"), await ev(client, "document.getElementById('stat-trips').textContent"));
    check('BN toggle translates title', await ev(client, "document.getElementById('app-title').textContent.indexOf('\\u0995\\u09AE\\u09BF\\u0989\\u099F') !== -1"));
    await client.send('Page.reload');
    await waitFor(client, "document.readyState === 'complete' && !!document.getElementById('stat-trips')", 10000);
    await sleep(300);
    check('BN language persists across reload', await ev(client, "document.getElementById('stat-trips').textContent.indexOf('\\u09E7') !== -1"));

    // 10. 390px no horizontal overflow
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(300);
    check('390px no horizontal overflow (dashboard)', await ev(client, "document.documentElement.scrollWidth <= 390"), 'scrollWidth=' + await ev(client, "document.documentElement.scrollWidth"));
    await ev(client, "document.querySelector('[data-tab-btn=\"history\"]').click()");
    await sleep(300);
    check('390px no horizontal overflow (history)', await ev(client, "document.documentElement.scrollWidth <= 390"), 'scrollWidth=' + await ev(client, "document.documentElement.scrollWidth"));
    await client.send('Emulation.clearDeviceMetricsOverride');

    // 11. zero console/page errors, zero http requests
    check('0 console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));
    check('0 page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));
    check('0 http(s) network requests', httpRequests.length === 0, httpRequests.join(', '));
    check('localStorage key used', await ev(client, "localStorage.getItem('commute-bd-v1') !== null"));

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total');
  if (failures.length) { console.log('Failures:'); failures.forEach(function (f) { console.log(' - ' + f); }); }
  process.exit(failed ? 1 : 0);
}
main().catch(function (e) { console.error('SMOKE HARNESS ERROR:', e && e.stack || e); process.exit(2); });
