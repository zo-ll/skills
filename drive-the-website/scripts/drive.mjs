#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, readdirSync, existsSync, appendFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const HELP = `usage: drive.mjs <plan.json> [--out dir] [--only unit[,unit]] [--attach port] [--headful] [--browser path]
       drive.mjs --snapshot <url> [--attach port] [--wait-text text]`

const argv = process.argv.slice(2)
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? undefined : argv.splice(i, 2)[1] }
const bool = (name) => { const i = argv.indexOf(name); return i === -1 ? false : (argv.splice(i, 1), true) }
const outArg = flag('--out')
const only = flag('--only')?.split(',')
const attach = flag('--attach')
const browserArg = flag('--browser') ?? process.env.CDP_BROWSER
const snapshotUrl = flag('--snapshot')
const waitText = flag('--wait-text')
const headful = bool('--headful')
if (bool('--help') || (!snapshotUrl && !argv[0])) { console.log(HELP); process.exit(0) }

const plan = snapshotUrl ? { origin: new URL(snapshotUrl).origin, units: [{ name: 'snapshot', steps: [{ goto: snapshotUrl }, ...(waitText ? [{ wait: { text: waitText } }] : []), { dump: 'snapshot' }] }] } : JSON.parse(readFileSync(argv[0], 'utf8'))
const TIMEOUT = plan.timeout ?? 20000
const IDLE_MS = plan.idleMs ?? 500
const ignore = (plan.ignoreConsole ?? []).map((p) => new RegExp(p))
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const out = resolve(outArg ?? join(process.cwd(), 'drive-out', stamp))
mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) => String(s ?? '').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim()

function findBrowser () {
  if (browserArg) return browserArg
  const base = `${homedir()}/.cache/ms-playwright`
  if (existsSync(base)) {
    for (const dir of readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      const bin = [`${base}/${dir}/chrome-linux64/chrome`, `${base}/${dir}/chrome-linux/chrome`, `${base}/${dir}/chrome-mac/Chromium.app/Contents/MacOS/Chromium`].find(existsSync)
      if (bin) return bin
    }
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) return p
  throw new Error('no Chromium found; pass --browser or set CDP_BROWSER')
}

let proc
let port = attach
if (!attach) {
  port = 9300 + Math.floor(Math.random() * 500)
  proc = spawn(findBrowser(), [...(headful ? [] : ['--headless=new']), `--remote-debugging-port=${port}`, '--no-sandbox', '--no-first-run', `--user-data-dir=${out}/.profile`, 'about:blank'], { stdio: 'ignore' })
}
const http = `http://127.0.0.1:${port}`
let target
for (let i = 0; i < 75 && !target; i++) {
  try {
    target = attach ? await (await fetch(`${http}/json/new?about:blank`, { method: 'PUT' })).json() : (await (await fetch(`${http}/json`)).json()).find((t) => t.type === 'page')
  } catch { await sleep(200) }
}
if (!target) { console.error('browser did not expose a page target on port ' + port); proc?.kill(); process.exit(2) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
let seq = 0
const pending = new Map()
const listeners = new Set()
let diagnostics = []
const inflight = new Map()
let lastNet = Date.now()
const originOf = (u) => { try { return new URL(u).origin } catch { return '' } }
const note = (kind, text, url = '') => {
  const line = norm(text).slice(0, 400)
  if (ignore.some((re) => re.test(line) || re.test(url))) return
  diagnostics.push({ kind, text: line, url, sameOrigin: originOf(url) === plan.origin || !url })
}
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return }
  const p = msg.params ?? {}
  switch (msg.method) {
    case 'Network.requestWillBeSent': inflight.set(p.requestId, p.request.url); lastNet = Date.now(); break
    case 'Network.loadingFinished': inflight.delete(p.requestId); lastNet = Date.now(); break
    case 'Network.loadingFailed':
      if (!p.canceled && p.blockedReason !== 'inspector') note('netfail', p.errorText, inflight.get(p.requestId))
      inflight.delete(p.requestId); lastNet = Date.now(); break
    case 'Network.responseReceived': if (p.response.status >= 400) note('http', `${p.response.status} ${p.response.url}`, p.response.url); break
    case 'Runtime.exceptionThrown': {
      const d = p.exceptionDetails
      const frames = (d.stackTrace?.callFrames ?? []).slice(0, 4).map((f) => `${f.functionName || '?'} ${f.url.replace(plan.origin, '')}:${f.lineNumber}`).join(' < ')
      note('exception', `${d.exception?.description?.split('\n')[0] ?? d.text} @ ${frames}`, d.url ?? '')
      break
    }
    case 'Runtime.consoleAPICalled':
      if (p.type === 'error' || p.type === 'warning') note(p.type, p.args.map((a) => a.value ?? a.description ?? '').join(' '), p.stackTrace?.callFrames?.[0]?.url ?? '')
      break
  }
  for (const fn of listeners) fn(msg)
})
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq
  const t = setTimeout(() => { pending.delete(id); rej(new Error(`${method} timed out`)) }, TIMEOUT)
  pending.set(id, (m) => { clearTimeout(t); m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result) })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error('page eval: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text))
  return r.result.value
}
const once = (method, ms) => new Promise((res) => {
  const fn = (m) => { if (m.method === method) { listeners.delete(fn); clearTimeout(t); res(true) } }
  const t = setTimeout(() => { listeners.delete(fn); res(false) }, ms)
  listeners.add(fn)
})

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: !!plan.disableCache })
const version = await send('Browser.getVersion')
const setViewport = (v) => send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: v.scale ?? 1, mobile: !!v.mobile })
await setViewport(plan.viewport ?? { width: 1366, height: 900 })

async function settle () {
  const end = Date.now() + TIMEOUT
  while (Date.now() < end) {
    if (inflight.size === 0 && Date.now() - lastNet >= IDLE_MS) return true
    await sleep(100)
  }
  return false
}

const PAGE_LIB = `(() => {
  if (window.__drive) return
  const norm = (s) => String(s ?? '').replace(/[\\u00a0\\u202f\\u2009]/g, ' ').replace(/\\s+/g, ' ').trim()
  const visible = (el) => {
    if (!el?.isConnected) return false
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e)
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
    }
    return true
  }
  const INTERACTIVE = 'a[href],button,input,select,textarea,summary,label,[role=button],[role=link],[role=tab],[role=menuitem],[role=option],[role=checkbox],[role=radio],[role=switch],[role=combobox],[role=gridcell],[role=cell],[tabindex]:not([tabindex="-1"])'
  const textOf = (el) => norm(el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '')
  const matches = (t, spec) => spec.regex ? new RegExp(spec.regex, spec.flags ?? '').test(t) : spec.exact === false ? t.includes(norm(spec.text)) : t === norm(spec.text)
  const scope = (spec) => spec.in ? [...document.querySelectorAll(spec.in)].filter(visible) : [document]
  const byLabel = (label) => {
    const out = []
    for (const l of document.querySelectorAll('label')) {
      if (norm(l.innerText) !== norm(label)) continue
      const c = l.htmlFor ? document.getElementById(l.htmlFor) : l.querySelector('input,select,textarea')
      if (c) out.push(c)
    }
    for (const c of document.querySelectorAll('input,select,textarea')) {
      if ([c.getAttribute('aria-label'), c.placeholder].some((v) => v && norm(v) === norm(label))) out.push(c)
    }
    return out
  }
  const find = (spec) => {
    let found = []
    for (const root of scope(spec)) {
      if (spec.label) found.push(...byLabel(spec.label).filter((e) => root.contains(e)))
      else if (spec.selector) found.push(...[...root.querySelectorAll(spec.selector)].filter((e) => spec.text === undefined && !spec.regex ? true : matches(textOf(e), spec)))
      else {
        const hits = [...root.querySelectorAll(INTERACTIVE)].filter((e) => matches(textOf(e), spec))
        found.push(...(hits.length ? hits : [...root.querySelectorAll('body *')].filter((e) => matches(textOf(e), spec) && ![...e.children].some((c) => matches(textOf(c), spec)))))
      }
    }
    found = [...new Set(found)].filter(spec.hidden ? () => true : visible)
    if (!found.length && spec.selector && !spec.hidden) {
      const hiddenInputs = [...document.querySelectorAll(spec.selector)].filter((e) => e.matches('input[type=checkbox],input[type=radio]'))
      const proxies = hiddenInputs.map((e) => e.closest('label') || (e.id && document.querySelector('label[for="' + e.id + '"]'))).filter((e) => e && visible(e))
      found = proxies
    }
    return found
  }
  const describe = (el) => {
    if (!el) return null
    const id = el.id ? '#' + el.id : ''
    const name = el.getAttribute('name') ? '[name=' + el.getAttribute('name') + ']' : ''
    const cls = !id && !name && typeof el.className === 'string' ? el.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2).map((c) => '.' + c).join('') : ''
    return el.tagName.toLowerCase() + id + name + cls
  }
  window.__drive = {
    norm, visible, find, describe, textOf,
    pick (spec) {
      const all = find(spec)
      const el = all[spec.nth ?? (spec.last ? all.length - 1 : 0)]
      if (!el) return { error: 'no visible element for ' + JSON.stringify(spec), count: 0 }
      window.__driveTarget = el
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      const hit = document.elementFromPoint(x, y)
      const reachable = !!hit && (el.contains(hit) || hit.contains(el) || (el.tagName === 'LABEL' && el.control && (el.control === hit || el.control.contains(hit))))
      return { x, y, count: all.length, target: describe(el), text: textOf(el).slice(0, 80), disabled: !!(el.disabled || el.getAttribute('aria-disabled') === 'true'), covered: reachable ? null : describe(hit) + ' "' + norm(hit?.innerText).slice(0, 60) + '"' }
    },
    text (sel) { return [...document.querySelectorAll(sel || 'body')].filter(visible).map((e) => norm(e.innerText)).join('\\n') },
    controls () {
      return [...document.querySelectorAll(INTERACTIVE)].filter(visible).map((e) => {
        const t = textOf(e).slice(0, 70)
        const href = e.getAttribute('href')
        return describe(e) + (e.type && e.tagName === 'INPUT' ? '[type=' + e.type + ']' : '') + (t ? ' "' + t + '"' : '') + (href ? ' -> ' + href : '') + (e.disabled ? ' (disabled)' : '')
      })
    }
  }
})()`

const pageLib = async () => evaluate(PAGE_LIB)
const pick = async (spec) => { await pageLib(); return evaluate(`window.__drive.pick(${JSON.stringify(spec)})`) }
async function pickWait (spec) {
  const end = Date.now() + (spec.timeout ?? TIMEOUT)
  let r
  while (Date.now() < end) {
    r = await pick(spec)
    if (!r.error && !r.covered && !r.disabled) return r
    await sleep(250)
  }
  return r
}
const mouse = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}
const KEYS = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Space: 32 }
const key = async (k) => {
  const params = { key: k === 'Space' ? ' ' : k, code: k, windowsVirtualKeyCode: KEYS[k] ?? k.toUpperCase().charCodeAt(0), text: k === 'Enter' ? '\r' : undefined }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
}

const resultsFile = join(out, 'results.jsonl')
const counts = { pass: 0, fail: 0, blocked: 0, skipped: 0 }
const record = (r) => {
  const row = { ...r, at: new Date().toISOString() }
  appendFileSync(resultsFile, JSON.stringify(row) + '\n')
  counts[r.status] = (counts[r.status] ?? 0) + 1
  const mark = { pass: 'PASS', fail: 'FAIL', blocked: 'BLOCK', skipped: 'SKIP' }[r.status]
  console.log(`${mark.padEnd(5)} ${r.unit} #${r.step} ${r.check}${r.status === 'pass' ? '' : '\n      ' + String(JSON.stringify(r.observed ?? r.reason ?? null)).slice(0, 600)}`)
}
const safe = (s) => String(s).replace(/[^a-z0-9._-]+/gi, '-').slice(0, 80)
async function shot (name, selector) {
  let clip
  if (selector) {
    clip = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, scale: 1 } })()`)
  }
  if (!clip) {
    const m = await evaluate('({ w: document.documentElement.scrollWidth, h: Math.min(document.documentElement.scrollHeight, 10000) })')
    clip = { x: 0, y: 0, width: m.w, height: m.h, scale: 1 }
  }
  const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
  const file = join(out, safe(name) + '.png')
  writeFileSync(file, Buffer.from(res.data, 'base64'))
  return file
}
async function dumpText (name) {
  await pageLib()
  const file = join(out, safe(name) + '.txt')
  const [url, title, text, controls] = await Promise.all([evaluate('location.href'), evaluate('document.title'), evaluate('window.__drive.text()'), evaluate('window.__drive.controls()')])
  writeFileSync(file, `URL ${url}\nTITLE ${title}\n\n--- controls ---\n${controls.join('\n')}\n\n--- text ---\n${text}\n`)
  return { file, url, controls }
}

async function check (exp) {
  const scopeSel = exp.in ?? 'body'
  await pageLib()
  const body = norm(await evaluate(`window.__drive.text(${JSON.stringify(scopeSel)})`))
  const list = (v) => (Array.isArray(v) ? v : [v]).map(norm)
  if (exp.text !== undefined) { const missing = list(exp.text).filter((t) => !body.includes(t)); return { ok: !missing.length, observed: missing.length ? { missing, excerpt: body.slice(0, 300) } : 'all present' } }
  if (exp.noText !== undefined) {
    const found = list(exp.noText).filter((t) => body.includes(t)).map((t) => { const i = body.indexOf(t); return `${t} :: …${body.slice(Math.max(0, i - 60), i + t.length + 60)}…` })
    return { ok: !found.length, observed: found.length ? { found } : 'none present' }
  }
  if (exp.regex !== undefined) { const m = body.match(new RegExp(exp.regex, exp.flags ?? '')); return { ok: exp.absent ? !m : !!m, observed: m?.[0] ?? null } }
  if (exp.url !== undefined) { const u = await evaluate('location.href'); return { ok: u.includes(exp.url), observed: u } }
  if (exp.count !== undefined) { const n = await evaluate(`window.__drive.find(${JSON.stringify(exp.count)}).length`); return { ok: exp.count.equals !== undefined ? n === exp.count.equals : n >= (exp.count.min ?? 1), observed: n } }
  if (exp.visible !== undefined) { const r = await pick(exp.visible); return { ok: !r.error, observed: r.error ?? r.target } }
  if (exp.attr !== undefined) {
    const v = await evaluate(`(() => { const e = window.__drive.find(${JSON.stringify(exp.attr)})[0]; return e ? e.getAttribute(${JSON.stringify(exp.attr.name)}) : null })()`)
    return { ok: exp.attr.value === undefined ? v !== null : exp.attr.includes ? String(v).includes(exp.attr.value) : v === exp.attr.value, observed: v }
  }
  if (exp.eval !== undefined) { const v = await evaluate(exp.eval); return { ok: exp.equals === undefined ? !!v : JSON.stringify(v) === JSON.stringify(exp.equals), observed: v } }
  if (exp.noErrors !== undefined) {
    const bad = diagnostics.filter((d) => (exp.noErrors === 'all' || d.sameOrigin) && ['exception', 'error', 'http', 'netfail'].includes(d.kind))
    return { ok: !bad.length, observed: bad.length ? bad : 'clean' }
  }
  throw new Error('unknown expect ' + JSON.stringify(exp))
}

async function run (step) {
  if (step.goto !== undefined) {
    const url = new URL(step.goto, plan.origin).href
    const loaded = once('Page.loadEventFired', TIMEOUT)
    const nav = await send('Page.navigate', { url })
    if (nav.errorText) throw new Error('navigate: ' + nav.errorText)
    await loaded
    return { observed: await evaluate('location.href') }
  }
  if (step.reload) { const loaded = once('Page.loadEventFired', TIMEOUT); await send('Page.reload', { ignoreCache: true }); await loaded; return {} }
  if (step.click) {
    const r = await pickWait(step.click)
    if (r.error) throw Object.assign(new Error(r.error), { status: 'blocked' })
    if (r.disabled) throw Object.assign(new Error(`target ${r.target} is disabled`), { status: 'blocked' })
    if (r.covered && !step.click.force) throw Object.assign(new Error(`target ${r.target} is covered by ${r.covered}`), { status: 'blocked' })
    await mouse(r.x, r.y)
    return { observed: `${r.target} "${r.text}"${r.count > 1 ? ` (1 of ${r.count})` : ''}` }
  }
  if (step.type) {
    const r = await pickWait(step.type)
    if (r.error) throw Object.assign(new Error(r.error), { status: 'blocked' })
    await mouse(r.x, r.y)
    await evaluate('(() => { const e = window.__driveTarget; e.focus(); e.select?.() })()')
    if (step.type.clear !== false) { await key('Backspace') }
    await send('Input.insertText', { text: String(step.type.value) })
    if (step.type.blur !== false) await evaluate('window.__driveTarget.blur()')
    const v = await evaluate('window.__driveTarget.value')
    if (norm(v) !== norm(step.type.value) && !step.type.mask) throw Object.assign(new Error(`field ${r.target} holds "${v}" after typing "${step.type.value}"`), { status: 'blocked' })
    return { observed: `${r.target} = "${v}"` }
  }
  if (step.select) {
    const r = await pickWait(step.select)
    if (r.error) throw Object.assign(new Error(r.error), { status: 'blocked' })
    const v = await evaluate(`(() => { const e = window.__driveTarget; const o = [...e.options].find((o) => o.value === ${JSON.stringify(step.select.value)} || window.__drive.norm(o.text) === ${JSON.stringify(norm(step.select.option ?? ''))}); if (!o) return null; e.value = o.value; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return o.value })()`)
    if (v === null) throw Object.assign(new Error('no such option'), { status: 'blocked' })
    return { observed: v }
  }
  if (step.key) { await key(step.key); return {} }
  if (step.wait) {
    const w = step.wait
    if (w.ms) { await sleep(w.ms); return {} }
    const end = Date.now() + (w.timeout ?? TIMEOUT)
    while (Date.now() < end) {
      await pageLib()
      const ok = w.gone ? (await evaluate(`window.__drive.find(${JSON.stringify(w.gone)}).length`)) === 0
        : w.url ? (await evaluate('location.href')).includes(w.url)
          : (await evaluate(`window.__drive.find(${JSON.stringify(w)}).length`)) > 0
      if (ok) return {}
      await sleep(250)
    }
    throw Object.assign(new Error('wait timed out: ' + JSON.stringify(w)), { status: 'blocked' })
  }
  if (step.viewport) { await setViewport(step.viewport); return {} }
  if (step.clearStorage) { await send('Storage.clearDataForOrigin', { origin: plan.origin, storageTypes: 'all' }); return {} }
  if (step.eval) return { observed: await evaluate(step.eval) }
  if (step.shot) { const s = typeof step.shot === 'string' ? { name: step.shot } : step.shot; return { evidence: [await shot(s.name, s.selector)] } }
  if (step.dump) { const d = await dumpText(step.dump); if (snapshotUrl) console.log(readFileSync(d.file, 'utf8')); return { evidence: [d.file] } }
  throw new Error('unknown step ' + JSON.stringify(step))
}

writeFileSync(join(out, 'run.json'), JSON.stringify({ plan: snapshotUrl ? 'snapshot' : resolve(argv[0]), origin: plan.origin, artifact: plan.artifact ?? null, browser: version.product, attach: !!attach, startedAt: new Date().toISOString() }, null, 2))
console.log(`browser ${version.product}  origin ${plan.origin}  evidence ${out}`)

for (const unit of plan.units) {
  if (only && !only.includes(unit.name)) continue
  diagnostics = []
  let stopped = null
  for (const [i, step] of unit.steps.entries()) {
    const label = step.check ?? (step.expect ? 'expect ' + JSON.stringify(step.expect) : Object.keys(step).filter((k) => k !== 'check')[0] + ' ' + JSON.stringify(Object.values(step)[0]))
    if (stopped) { if (step.expect) record({ unit: unit.name, step: i, check: label, status: 'skipped', reason: 'after ' + stopped }); continue }
    try {
      if (step.expect) {
        if (step.expect.retry !== false) await settle()
        let r = await check(step.expect)
        const end = Date.now() + (step.expect.within ?? 0)
        while (!r.ok && Date.now() < end) { await sleep(250); r = await check(step.expect) }
        const evidence = []
        if (!r.ok) evidence.push((await dumpText(`${unit.name}-${i}-fail`)).file, await shot(`${unit.name}-${i}-fail`))
        record({ unit: unit.name, step: i, check: label, status: r.ok ? 'pass' : 'fail', expected: step.expect, observed: r.observed, evidence })
      } else {
        const r = await run(step)
        if (!step.wait && !step.shot && !step.dump && !step.eval) await settle()
        if (step.log || step.eval) console.log(`      ${label.slice(0, 60)} => ${JSON.stringify(r.observed).slice(0, 800)}`)
      }
    } catch (e) {
      const evidence = []
      try { evidence.push((await dumpText(`${unit.name}-${i}-blocked`)).file, await shot(`${unit.name}-${i}-blocked`)) } catch {}
      record({ unit: unit.name, step: i, check: label, status: e.status ?? 'blocked', reason: e.message, evidence })
      stopped = `step ${i}`
    }
  }
  const diagFile = join(out, safe(unit.name) + '.diagnostics.json')
  writeFileSync(diagFile, JSON.stringify(diagnostics, null, 2))
  const own = diagnostics.filter((d) => d.sameOrigin && d.kind !== 'warning')
  if (own.length) console.log(`      diagnostics: ${own.length} same-origin error(s) -> ${diagFile}\n      ` + own.slice(0, 3).map((d) => `${d.kind}: ${d.text.slice(0, 160)}`).join('\n      '))
}

console.log(`\n${counts.pass} pass, ${counts.fail} fail, ${counts.blocked} blocked, ${counts.skipped} skipped  -> ${resultsFile}`)
ws.close()
if (attach) await fetch(`${http}/json/close/${target.id}`).catch(() => {})
proc?.kill()
process.exit(counts.fail ? 1 : counts.blocked ? 2 : 0)
