---
name: explainer
description: >-
  Build a throwaway, interactive HTML page that explains something: a PR, a
  codebase area, a design decision, a concept, an agent's own work. One
  self-contained file, opened in the browser, discarded when understood. Use on
  "explainer", "explain this as a web page", "in html", "make me a page that
  explains", "help me understand this diff/branch/system", or when the thing to
  explain has layers a reader should be able to expand, step through, or toggle.
metadata:
  purpose: personal host-agent skill
  version: "1.0.0"
---

# Explainer

Code is cheap, but the reader's attention is not. Build a page whose only job is to
put an understanding of one thing into the reader's head quickly. The page is
disposable: optimize it for one reading, not for maintenance.

## 1. Pin the question

Before you build, state in one sentence what the reader must understand at the
end ("why the cache invalidation misses deletes"). If the request is too
broad to state that way, ask one question, or pick the most useful sentence and
put it at the top of the page.

## 2. Gather the real material

Read the actual code, diff, logs or docs. Every claim on the page must point
to a source (`file:line`, commit, URL). Do not show invented numbers or
example data as if they were real. Label illustrative data as illustrative.

## 3. Structure (top to bottom)

1. **Answer first**: the one-sentence claim and a 2–4 line TL;DR.
2. **The picture**: one diagram of the mechanism (see the `diagram` skill
   rules: grounded, labeled edges, ≤15 nodes).
3. **Walkthrough**: the details, layered so the page starts out shallow. Use
   `<details>` for depth, and stepper or tab controls for sequences.
4. **Evidence**: source snippets with `file:line`, collapsed by default.
5. **Open questions / risks**: what is unknown or fragile. This section is short.

## 4. Interaction must serve understanding

Add interactivity only where it removes reading:
- Step through a sequence (Prev/Next highlights the active node in the diagram).
- Toggle before/after, or between options in a comparison.
- Hover or click a diagram node to show its code and description.
- Sliders for parameters, when the point is "how X behaves as Y changes".
- Do not add decorative animation, hero sections or marketing layouts.

## 5. Build rules

- One `.html` file with inline CSS/JS. CDN scripts only from cdnjs,
  jsdelivr or unpkg (for example Mermaid, highlight.js). Fonts from Google Fonts only.
- Define colors as CSS variables on `:root`, with a
  `@media (prefers-color-scheme: dark)` override. Set an explicit
  `body` background.
- Use a readable measure (~70ch for prose), and system UI or one good font.
  The layout must work at phone width without horizontal scroll.
- Keep each passage of prose short. If the prose runs long, apply the `ste` skill's writing
  rules at the 80% level.
- `<title>`: 2–4 words naming the subject.

## 6. Deliver

- Write to the session scratchpad dir if one exists, else
  `./explainers/<slug>.html`.
- Open it. On WSL: `explorer.exe "$(wslpath -w <file>)"`. On macOS: `open`.
  On Linux: `xdg-open`.
- If the host has an artifact/publish tool and the user wants a link, publish
  the file. Otherwise keep it local.
- In chat, give the path and one line that states the claim. Do not repeat the
  page's content.
