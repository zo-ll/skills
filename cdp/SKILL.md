---
name: cdp
description: >-
  Drives a real Chrome over the Chrome DevTools Protocol and reports what the
  browser actually did: every request with status/protocol/size/time, the load
  waterfall, JS-initiated fetches, console errors, Core Web Vitals, and a grade
  of the security/caching headers the browser enforces. Use for "cdp", "trace
  this page", "what requests does it make", "check the network tab", "check my
  headers", "why is this slow", "console errors", or "core web vitals".
metadata:
  purpose: personal host-agent skill
  version: "1.0.0"
---

# cdp

Drives a real browser over the Chrome DevTools Protocol and reports the whole
load: every request, real waterfall order, JS-initiated fetches, console
output, vitals, and a graded read of the response headers. One tool for the
browser-facing view of a web app.

## Run

```sh
scripts/cdp-trace.mjs <url> [--all] [--headful] [--attach <port|ws>]
                           [--browser <path>] [--wait ms] [--out trace.json]
```

- Launches its own headless Chromium (PATH, then `~/.cache/ms-playwright`,
  then `$CDP_BROWSER`) and kills it after. Zero dependencies — Node >= 22.
- `--attach 9222` uses a Chrome you already run with
  `--remote-debugging-port=9222`, keeping its cookies and login.
- `--out` writes the full trace (every request and its response headers,
  console, vitals). Keep it as the artifact.
- Exit 1 on a failed request, a >= 400 resource, an uncaught exception, an
  uncompressed text document, or a cookie missing `Secure` over HTTPS.
- Rows are capped at 50; `--all` prints every one.

## Read the trace

- Rows are in start order — that is the waterfall. A request that starts after
  a large script finishes is a JS-initiated fetch, not markup.
- `[cache]` / `[sw]` — served from disk cache / service worker. A missing
  `[cache]` on a content-hashed asset is a caching miss seen live.
- `abt` — the browser aborted it (media seek, prefetch, navigation away). Not a bug.
- `ERR`, 4xx, 5xx — real. `st` and `proto` are per request; a page mixing h2
  and h1 to the same host is a config smell.
- `vitals` — LCP, CLS, and long-tasks (main-thread blocking). A long task right
  before LCP is the cause to fix, not the number.

## Headers it grades

The document response, graded `PASS`/`WARN`/`FAIL`, each with the header to set:

| Check | FAIL/WARN when | Header |
|---|---|---|
| `hsts` | missing, or `max-age` < 180d over HTTPS | `Strict-Transport-Security` |
| `nosniff` | missing | `X-Content-Type-Options` |
| `csp` | missing (report-only noted) | `Content-Security-Policy` |
| `referrer` | missing | `Referrer-Policy` |
| `coop` | missing (`-`, informational) | `Cross-Origin-Opener-Policy` |
| `cache` | missing (browser heuristics) | `Cache-Control` |
| `validators` | no `ETag` / `Last-Modified` (no 304) | `ETag` |
| `compression` | text document > 1KB sent raw | `br`/`gzip` at origin/CDN |
| `cookies` | missing `Secure` (FAIL) / `HttpOnly` / `SameSite` (WARN) | `Set-Cookie` flags |
| `assets` | count of text assets compressed, assets cacheable | per asset |

A `WARN` is a decision — some are correct (`Cache-Control: no-store` on a token
endpoint). Say which you accept and why.

## Attach to a live session

For a logged-in app, launch Chrome with a debug port and attach rather than
starting a fresh browser:

```sh
google-chrome --remote-debugging-port=9222
node scripts/cdp-trace.mjs https://yourapp --attach 9222 --headful
```

From WSL2, a Chrome running on the Windows side is not on `localhost`; use the
host IP (`ip route | awk '/default/{print $3}'`) for `--attach`.

## Go further

The tool enables `Network`, `Page`, `Runtime`, `Log`, and `Performance`. Any
other domain is one WebSocket away on the same debugger URL — the protocol
spec is at `chromedevtools.github.io/devtools-protocol`. Useful when the
built-in view is not enough: `Emulation.*` (CPU/network throttling, device
metrics), `Tracing.*` (a full Chrome trace), `Fetch.*` (block or intercept a
request to prove which one causes a symptom).

## Non-goals

Not a load test — one page, one visit. Cross-visit caching and field Core Web
Vitals need a real profile with a persistent `--user-data-dir`.
