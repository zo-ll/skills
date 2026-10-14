---
name: drive-the-website
description: >-
  Drive a website in a real browser over CDP, compare each page and flow with
  its acceptance criteria, and keep evidence for each result. Use for "drive
  the website", "pilot localhost", "check the changes in the browser", "click
  through the flow", copy or price acceptance, or an end-to-end web check.
  Browser-only companion of drive-the-app.
license: MIT
---

# Drive the website

Test the served website through its UI. A build, a lint run, and a file diff do not prove what a visitor sees.
The page can show a value from a database, a cache, or a stale bundle instead of the edited file.

The driver is `scripts/drive.mjs`. It needs Node 22 or later and a local Chromium. It has no dependencies.

## 1. Establish the boundary

1. Identify the origin, the locales, the currencies, and the test account.
2. Record the user's permission for form submissions, account changes, and payments.
3. List the records and sessions that must stay intact.
4. Define the scope from the ticket. Write one acceptance check for each ticket item.

Stop before a step that charges money, sends an email to a real address, or publishes content, unless the user permits it.
Use a reserved test address, such as `test@example.com`, for forms.
Do not log in with a real customer account.

## 2. Identify the artifact

1. Record the commit and the worktree state of each repo that feeds the page.
2. Record how the origin serves the code: dev server, preview build, or deployed build.
3. Record which process owns the port. A second dev server on the same port is a common cause of stale pages.
4. Record the data source for each checked value: lang file, database row, API, or CMS.

A page check proves only the data source that served it.
If production reads copy from a database, a pass on a local seeded database does not prove production.
Report that gap.

## 3. Make the check map

Read the ticket, the routes, and the changed files before the first run.
For each ticket item, record:

| Item | Route and locale | Starting state | Actions | Expected observation | Status |
| --- | --- | --- | --- | --- | --- |
| Banner price | `/en/vignette/austria/car/` | New session | None | `€39.90/month`, no `39.99` | not run |

Use `pass`, `fail`, `blocked`, or `not run`.
Write the expected values from the ticket, not from the page. Do not copy a displayed price into the plan.
Check each locale and currency that the ticket names. Add a negative check for each old value that must disappear.
Select more cases from `references/cases.md`. Do not add irrelevant cases to increase the count.

## 4. Discover controls before you script them

Run a snapshot of each page before you write its steps:

```sh
node scripts/drive.mjs --snapshot http://localhost:3000/en/pricing/ --wait-text "Pricing"
```

The snapshot prints the visible controls, their text, their `href`, and the page text.
Use this output to pick the click and type targets. Do not guess selectors from the source alone.

## 5. Write the plan

A plan is a JSON file with units. Each unit starts from a known state, usually a `goto`.
A failed action stops its unit, because the page state is then unknown. The next unit starts again.

```json
{
  "origin": "http://localhost:3000",
  "artifact": { "frontend": "abc123 + local changes", "server": "vite dev, port owned by pm2" },
  "viewport": { "width": 1366, "height": 900 },
  "ignoreConsole": ["Download the Vue Devtools"],
  "units": [
    { "name": "pricing-en", "steps": [
      { "goto": "/en/pricing/" },
      { "wait": { "text": "Pricing", "exact": false } },
      { "check": "one plan at the new price", "expect": { "text": ["Monthly", "€39.90"] } },
      { "check": "old prices are gone", "expect": { "noText": ["39.99", "69.90", "0.50 €"] } },
      { "shot": "pricing-en" },
      { "check": "no page errors", "expect": { "noErrors": true } }
    ] }
  ]
}
```

Run it:

```sh
node scripts/drive.mjs plan.json --out <evidence dir> [--only unit-a,unit-b] [--attach 9222] [--headful]
```

Exit code 0 means all checks passed. Exit code 1 means a check failed. Exit code 2 means a step was blocked.

### Steps

| Step | Meaning |
| --- | --- |
| `{ "goto": "/path" }` | Navigate and wait for the load event and network idle. |
| `{ "reload": true }` | Reload without cache. |
| `{ "click": TARGET }` | Scroll the target into view and send a real mouse click at its center. |
| `{ "type": TARGET + "value" }` | Click the field, replace its value with real text input, then blur. Add `"mask": true` when the field formats the value. |
| `{ "select": TARGET + "value" or "option" }` | Choose an option in a native `select`. |
| `{ "key": "Enter" }` | Press one key. |
| `{ "wait": TARGET or { "gone": TARGET } or { "url": "..." } or { "ms": 500 } }` | Poll until the condition is true. |
| `{ "viewport": { "width": 390, "height": 844, "mobile": true } }` | Change the viewport. |
| `{ "clearStorage": true }` | Clear cookies and storage for the origin. |
| `{ "eval": "js expression" }` | Read a value for the log. Use it to read, not to act. |
| `{ "shot": "name" }` or `{ "shot": { "name", "selector" } }` | Save a screenshot. |
| `{ "dump": "name" }` | Save the controls list and the page text. |

`TARGET` is one of these:

- `{ "text": "Next" }`: the visible control with this exact text. Add `"exact": false` for a substring.
- `{ "regex": "Next|Suivant" }`: a text match for several locales.
- `{ "selector": "input[name=email]" }`: a CSS selector. Add `"text"` to filter by text.
- `{ "label": "Email" }`: the field with this label, `aria-label`, or placeholder.

Add `"in": ".modal"` to search only inside a container. Add `"nth": 2` or `"last": true` when there are several matches.
The driver refuses a target that is hidden, disabled, or covered by another element. It reports the covering element.
Use `"force": true` only after you inspect the overlay and decide that the click is correct.

### Expectations

| Expect | Passes when |
| --- | --- |
| `{ "text": "a" or ["a", "b"] }` | Each string is in the visible text. |
| `{ "noText": [...] }` | No string is in the visible text. The failure shows the context of each match. |
| `{ "regex": "...", "absent": false }` | The pattern matches, or does not match when `absent` is true. |
| `{ "url": "/fr/" }` | The current URL contains the value. |
| `{ "count": TARGET + "equals" or "min" }` | The number of visible matches is correct. |
| `{ "visible": TARGET }` | The target is visible. |
| `{ "attr": TARGET + "name", "value", "includes" }` | The attribute has the value. |
| `{ "eval": "js", "equals": value }` | The expression returns the value. |
| `{ "noErrors": true }` | The unit has no same-origin exception, console error, failed request, or HTTP error. Use `"all"` to include third parties. |

Add `"in": "selector"` to scope a text check to a section. Add `"within": 3000` to poll a slow value.
The text match normalizes non-breaking spaces. `€ 39.90`, `€39.90`, and `39.90 €` are still different strings. Write the form the page uses.

## 6. Run in small units

1. Run each unit alone with `--only` while you write it.
2. Run the full plan after each unit passes alone.
3. Run the plan again after each code change. Keep the earlier evidence folder.

Verify the side effect, not the message. After a form submission, read the new state on the next page or after a reload.
Test a client navigation and a full page load separately. They can show different values.

## 7. Separate driver errors from site defects

When a check fails, inspect the observation before the code. Open the `*-fail.txt` and `*-fail.png` files.

Classify each result:

- **Site defect:** a valid action gives a result that is not in the contract.
- **Driver error:** the plan used a wrong target, a wrong locale string, or a check that ran too early.
- **Environment block:** the dev server, the database, the auth, or a dependency stopped the run.
- **Unverified risk:** the source suggests a defect that the live run did not show.

Correct a driver error and run the unit again. Keep the first result.
Do not count a driver error as a site failure. Do not convert an environment block into a pass.
A Vite `504 Outdated Optimize Dep`, an empty page with only a loading text, or a port conflict is an environment block.
Find the process that owns the port before you restart a server. Do not stop a server that another person or a process manager owns.

## 8. Keep the evidence

The driver writes these files to the `--out` folder:

- `run.json`: the plan, the origin, the artifact, and the browser version.
- `results.jsonl`: one line for each check, with the expected and observed values.
- `<unit>.diagnostics.json`: console errors, exceptions, and failed requests for each unit.
- Screenshots and text dumps for each `shot`, `dump`, failure, and block.

Keep the evidence and the plan outside the project repository unless the user asks for them in it.
Do not publish screenshots that show personal data, tokens, or a real account.

## 9. Report

Report:

- The origin, the artifact identity, and the data source for each checked value.
- One line for each ticket item: pass, fail, blocked, or not run, with the evidence path.
- Each confirmed defect with its steps, expected value, observed value, and screenshot.
- The same-origin console errors, and whether they existed before the change.
- The gaps: locales, currencies, viewports, or environments that the run did not cover.
- The final state: logged-in sessions, submitted test records, and processes that are still active.

Do not say that the ticket is done when an item is blocked or not run.
