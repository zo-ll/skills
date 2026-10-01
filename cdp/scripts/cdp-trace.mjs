#!/usr/bin/env node
// cdp-trace - drive a real Chrome over the Chrome DevTools Protocol and print
// what the DevTools Network/Console panels would show: every request, its
// status/protocol/size/time, failures, console errors, and Core Web Vitals.
//
//   node cdp-trace.mjs <url> [--attach <port|ws>] [--port 9222]
//                            [--browser <path>] [--headful] [--wait 1200]
//                            [--out trace.json]
//
// Zero dependencies: Node >=22 (global WebSocket) + a Chromium/Chrome binary.
// Exits 1 when the page had a failed request, a >=400 resource, or an uncaught
// exception. Read-only against the target; launches its own browser unless
// told to attach.

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { port: 9222, wait: 1200, headful: false, top: 50 };
const URLs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--attach') opt.attach = argv[++i];
  else if (a === '--port') opt.port = Number(argv[++i]);
  else if (a === '--browser') opt.browser = argv[++i];
  else if (a === '--wait') opt.wait = Number(argv[++i]);
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--headful') opt.headful = true;
  else if (a === '--all') opt.top = Infinity;
  else if (a === '--top') opt.top = Number(argv[++i]);
  else URLs.push(a);
}
if (!URLs.length) {
  console.error('usage: cdp-trace.mjs <url> [--attach <port|ws>] [--port 9222] [--browser <path>] [--headful] [--wait ms] [--all|--top n] [--out file]');
  process.exit(2);
}
const url = /^https?:\/\//.test(URLs[0]) ? URLs[0] : `https://${URLs[0]}`;

// ---- find a browser -------------------------------------------------------
function findBrowser() {
  if (opt.browser) return opt.browser;
  if (process.env.CDP_BROWSER) return process.env.CDP_BROWSER;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
  }
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) {
    const dirs = fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort();
    for (let i = dirs.length - 1; i >= 0; i--) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        const c = path.join(cache, dirs[i], sub);
        if (fs.existsSync(c)) return c;
      }
    }
  }
  throw new Error('no Chrome/Chromium found; pass --browser <path> or set CDP_BROWSER');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function endpointAlive(port) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); return r.ok ? r.json() : null; } catch { return null; }
}

// ---- bring up a page target ----------------------------------------------
let launched = null, udir = null, port = opt.port;

async function pageTarget() {
  if (opt.attach && /^wss?:\/\/.*\/devtools\/page\//.test(opt.attach)) return opt.attach;
  if (opt.attach) port = Number(String(opt.attach).replace(/\D/g, '')) || opt.port;

  let info = await endpointAlive(port);
  if (!info && !opt.attach) {
    const bin = findBrowser();
    udir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-trace-'));
    const args = [
      `--remote-debugging-port=${port}`, `--user-data-dir=${udir}`,
      '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--disable-background-networking', 'about:blank',
    ];
    if (!opt.headful) args.unshift('--headless=new', '--no-sandbox', '--disable-gpu');
    launched = spawn(bin, args, { stdio: 'ignore', detached: true });
    for (let i = 0; i < 60 && !info; i++) { await sleep(200); info = await endpointAlive(port); }
    if (!info) throw new Error(`browser did not expose :${port}`);
  }
  if (!info) throw new Error(`nothing listening on :${port}`);
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
  return t.webSocketDebuggerUrl;
}

// ---- CDP client -----------------------------------------------------------
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws connect failed')); });
    const c = new CDP(ws);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && c.pending.has(m.id)) { const { res } = c.pending.get(m.id); c.pending.delete(m.id); res(m); }
      else if (m.method) for (const h of c.handlers) h(m);
    };
    return c;
  }
  send(method, params = {}) { return new Promise((res) => { const id = ++this.id; this.pending.set(id, { res }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(fn) { this.handlers.push(fn); }
  close() { try { this.ws.close(); } catch {} }
}

// ---- capture --------------------------------------------------------------
const reqs = new Map();
let navError = null, loadFired = false, t0 = null;
const console_ = [], exceptions = [];

function track(cdp) {
  cdp.on((m) => {
    const p = m.params || {};
    switch (m.method) {
      case 'Page.loadEventFired': loadFired = true; break;
      case 'Network.requestWillBeSent': {
        if (t0 == null) t0 = p.timestamp;
        reqs.set(p.requestId, { url: p.request.url, method: p.request.method, type: p.type, start: p.timestamp, initiator: p.initiator?.type, bytes: 0, status: 0, proto: '', mime: '', cache: false, sw: false });
        break;
      }
      case 'Network.responseReceived': {
        const r = reqs.get(p.requestId); if (!r) break;
        r.status = p.response.status; r.proto = p.response.protocol; r.mime = p.response.mimeType;
        r.cache = !!p.response.fromDiskCache || !!p.response.fromPrefetchCache;
        r.sw = !!p.response.fromServiceWorker; r.headers = p.response.headers;
        break;
      }
      case 'Network.loadingFinished': {
        const r = reqs.get(p.requestId); if (r) { r.end = p.timestamp; r.bytes = p.encodedDataLength || r.bytes; }
        break;
      }
      case 'Network.loadingFailed': {
        const r = reqs.get(p.requestId); if (r) { r.failed = p.errorText; r.aborted = /ABORTED/.test(p.errorText || ''); r.end = p.timestamp; }
        break;
      }
      case 'Page.navigate': if (p.errorText) navError = p.errorText; break;
      case 'Runtime.consoleAPICalled':
        if (p.type === 'error' || p.type === 'warning') console_.push({ level: p.type, text: (p.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 200) });
        break;
      case 'Runtime.exceptionThrown':
        exceptions.push((p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception').slice(0, 200));
        break;
    }
  });
}

const VITALS = `window.__v={lcp:0,cls:0,lt:[]};
new PerformanceObserver(l=>{for(const e of l.getEntries())window.__v.lcp=Math.round(e.startTime)}).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__v.cls+=e.value}).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())window.__v.lt.push(Math.round(e.duration))}).observe({type:'longtask',buffered:true});`;

async function evalJSON(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
  try { return JSON.parse(r.result?.result?.value ?? 'null'); } catch { return null; }
}

// ---- format ---------------------------------------------------------------
const bytes = (n) => (n == null ? '-' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'MB' : n >= 1024 ? (n / 1024).toFixed(1) + 'KB' : n + 'B');
const short = (u, n = 64) => { try { const x = new URL(u); return (x.pathname + x.search).slice(0, n) || x.host; } catch { return u.slice(0, n); } };

async function main() {
  const wsurl = await pageTarget();
  const cdp = await CDP.connect(wsurl);
  track(cdp);
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Performance.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: VITALS });

  const nav = await cdp.send('Page.navigate', { url });
  if (nav.errorText) navError = nav.errorText;
  for (let i = 0; i < 300 && !loadFired; i++) await sleep(100);
  await sleep(opt.wait);

  const navTiming = await evalJSON(cdp, `(()=>{const n=performance.getEntriesByType('navigation')[0];return JSON.stringify(n&&{ttfb:Math.round(n.responseStart),dom:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)})})()`);
  const vitals = await evalJSON(cdp, 'JSON.stringify(window.__v)');
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`).catch(() => null))?.json?.().catch(() => null);
  const ck = await cdp.send('Network.getAllCookies').catch(() => ({}));
  const cookieJar = ck.result?.cookies || [];
  cdp.close();

  // ---- report -------------------------------------------------------------
  const list = [...reqs.values()].filter((r) => r.type !== 'Preflight').sort((a, b) => a.start - b.start);
  const failed = list.filter((r) => !r.aborted && (r.failed || r.status >= 400));
  const aborted = list.filter((r) => r.aborted).length;
  const totalBytes = list.reduce((s, r) => s + (r.bytes || 0), 0);
  const protos = [...new Set(list.map((r) => r.proto).filter(Boolean))];
  console.log(`\n== CDP trace: ${url}`);
  if (version) console.log(`   browser ${version.Browser}   requests ${list.length}   transferred ${bytes(totalBytes)}   protocols ${protos.join(',') || '-'}`);
  if (navTiming) console.log(`   navigation: ttfb ${navTiming.ttfb}ms  dom ${navTiming.dom}ms  load ${navTiming.load}ms`);
  if (vitals) {
    const lt = vitals.lt || [];
    console.log(`   vitals: LCP ${vitals.lcp}ms  CLS ${(vitals.cls || 0).toFixed(3)}  long-tasks ${lt.length}${lt.length ? ` (max ${Math.max(...lt)}ms)` : ''}`);
  }
  if (navError) console.log(`   NAVIGATION ERROR: ${navError}`);

  console.log('\n   #   st  proto  type        size     ms  name');
  const shown = list.slice(0, opt.top);
  shown.forEach((r, i) => {
    const ms = r.end && r.start ? Math.round((r.end - r.start) * 1000) : '-';
    const tag = r.aborted ? 'abt' : r.failed ? 'ERR' : String(r.status || '-');
    const flags = (r.cache ? ' [cache]' : '') + (r.sw ? ' [sw]' : '');
    console.log(`   ${String(i + 1).padStart(2)}  ${tag.padStart(3)}  ${(r.proto || '-').padEnd(5)}  ${(r.type || '-').padEnd(10)}  ${bytes(r.bytes).padStart(6)}  ${String(ms).padStart(5)}  ${short(r.url)}${flags}`);
  });
  if (list.length > shown.length) console.log(`   ... ${list.length - shown.length} more rows (use --all)`);

  const badTags = console_.filter((c) => c.level === 'error');
  if (exceptions.length) console.log(`\n   EXCEPTIONS (${exceptions.length})\n${exceptions.slice(0, 15).map((e) => '     - ' + e).join('\n')}`);
  if (badTags.length) console.log(`\n   CONSOLE ERRORS (${badTags.length})\n${badTags.slice(0, 15).map((c) => '     - ' + c.text).join('\n')}`);
  const cached = list.filter((r) => r.cache).length;
  console.log(`\n   summary: ${list.length} requests, ${failed.length} failed/4xx-5xx, ${aborted} aborted, ${cached} cached, ${bytes(totalBytes)} transferred`);

  // ---- document header grade ----------------------------------------------
  const host = new URL(url).hostname;
  const doc = list.find((r) => r.type === 'Document') || list[0];
  const H = doc?.headers || {};
  const secured = url.startsWith('https://');
  let hdrFail = 0;
  const hp = (state, name, detail) => console.log(`   ${name.padEnd(10)} ${String(detail).padEnd(32)} ${state}`);
  console.log('\n   headers (document)');
  if (secured) {
    const hsts = H['strict-transport-security'];
    const age = Number((hsts || '').match(/max-age=(\d+)/)?.[1] || 0);
    hp(hsts ? (age >= 15552000 ? 'PASS' : 'WARN') : 'WARN', 'hsts', hsts ? hsts.slice(0, 32) : 'missing: no forced HTTPS');
  }
  const nosniff = /nosniff/i.test(H['x-content-type-options'] || '');
  hp(nosniff ? 'PASS' : 'WARN', 'nosniff', nosniff ? 'present' : 'missing: MIME sniffing allowed');
  const csp = H['content-security-policy'];
  hp(csp ? 'PASS' : 'WARN', 'csp', csp ? 'present' : H['content-security-policy-report-only'] ? 'report-only' : 'missing: no injected-script policy');
  hp(H['referrer-policy'] ? 'PASS' : 'WARN', 'referrer', H['referrer-policy'] || 'missing: full URL leaks cross-origin');
  hp(H['cross-origin-opener-policy'] ? 'PASS' : '-', 'coop', H['cross-origin-opener-policy'] || 'not isolated');
  hp(H['cache-control'] ? 'PASS' : 'WARN', 'cache', H['cache-control'] || 'missing: browser heuristics');
  hp(H['etag'] || H['last-modified'] ? 'PASS' : 'WARN', 'validators', H['etag'] ? 'ETag' : H['last-modified'] ? 'Last-Modified' : 'none: no 304 revalidation');
  const cenc = H['content-encoding'];
  const texty = /text\/|json|javascript|svg/.test(H['content-type'] || '');
  if (texty && (doc?.bytes || 0) > 1024) {
    const ok = /br|gzip|zstd/.test(cenc || '');
    if (!ok) hdrFail++;
    hp(ok ? 'PASS' : 'FAIL', 'compression', ok ? cenc : 'text served uncompressed');
  } else hp('-', 'compression', cenc || 'n/a');

  const cookies = cookieJar.filter((c) => { const d = String(c.domain).replace(/^\./, ''); return host === d || host.endsWith('.' + d) || d.endsWith('.' + host); });
  if (cookies.length) {
    console.log(`\n   cookies (${cookies.length})`);
    for (const c of cookies) {
      const insecure = secured && !c.secure;
      const weak = !c.httpOnly || !c.sameSite || c.sameSite === 'None';
      if (insecure) hdrFail++;
      hp(insecure ? 'FAIL' : weak ? 'WARN' : 'PASS', String(c.name).slice(0, 10), `Secure=${!!c.secure} HttpOnly=${!!c.httpOnly} SameSite=${c.sameSite || 'none'}`);
    }
  }

  const textAssets = list.filter((r) => /^(Script|Stylesheet|Document)$/.test(r.type) && (r.bytes || 0) > 1024);
  const comp = textAssets.filter((r) => /br|gzip|zstd/.test((r.headers || {})['content-encoding'] || ''));
  const assets = list.filter((r) => /^(Script|Stylesheet|Image|Font|Media)$/.test(r.type));
  const cacheable = assets.filter((r) => (r.headers || {})['cache-control'] && !/no-store/.test(r.headers['cache-control']));
  console.log(`\n   assets: ${comp.length}/${textAssets.length} text compressed, ${cacheable.length}/${assets.length} cacheable`);

  if (opt.out) {
    fs.writeFileSync(opt.out, JSON.stringify({ url, navError, navTiming, vitals, protos, requests: list, console: console_, exceptions }, null, 2));
    console.log(`   artifact: ${opt.out}`);
  }

  if (launched) { try { process.kill(-launched.pid, 'SIGKILL'); } catch {} }
  if (udir) fs.rmSync(udir, { recursive: true, force: true });
  process.exit(failed.length || exceptions.length || hdrFail || navError ? 1 : 0);
}

main().catch((e) => {
  if (launched) { try { process.kill(-launched.pid, 'SIGKILL'); } catch {} }
  if (udir) fs.rmSync(udir, { recursive: true, force: true });
  console.error(`cdp-trace: ${e.message}`);
  process.exit(2);
});
