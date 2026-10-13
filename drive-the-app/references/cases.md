# Applicable UI cases

Select cases from the app's contracts. Record omitted cases and their reason.
One workflow can need several assertions. An assertion count is not a feature count.

## Navigation and state

- Empty account; unavailable service; initial data read; recoverable error.
- Each implemented route; forward/back; modal cancel; hardware back when available.
- Disabled actions with a visible reason; no false empty result after a service failure.
- Light/dark/system preferences where supported; saved preferences after a new process.

## Entry and commands

- Valid values; zero; boundary values; invalid dates; decimal precision; optional field removal.
- Each supported unit or convention; required qualifiers; picker cancel.
- Duplicate start, save, confirm, and page taps with actual UI events.
- One accepted durable write; no duplicate side effect.
- Pending command after navigation; retry after an ambiguous result when safely reproducible.

## Drafts

- Text-only draft; choice-only draft; complete draft.
- Navigation recovery; background recovery; the declared process-death boundary.
- Clear followed by navigation; previous committed defaults versus an unsaved draft.
- Typed filter values before Apply; navigation and background recovery.
- Visible cancel versus hardware back; no unintended commit.

## Records and facts

- Edit current and historical records; clear optional metadata.
- Delete confirmation; safe cancellation; confirmed deletion of only the selected record.
- Parent deletion removes dependent facts from primary data, not just the visible row.
- Separate incompatible comparison groups and units.
- Empty ranges; excluded values; ties; exact units; no invented best value.
- Each fact's source control; exact record identity; same-date sources where relevant.
- Values after correction, deletion, background resume, and a new process.

## Lists and filters

- Each status, date, and entity filter; invalid input; no matches; clear filters.
- Visible typed dates on another filter change; applied filters after navigation.
- Page size plus one; partial last page; disabled boundaries; Older/Newer.
- Filter change resets the cursor; stale cursor recovery when reproducible.
- Source order and duplicate labels; an exact record on a later page.

## Lifecycle, scale, and access

- Background and resume; new process; explicit close and its recovery path.
- Approved scale dataset; query, render, scroll, and source-list measurements.
- Scoped error log; exit history; memory sample; frame or browser metrics.
- Large text; viewport changes; keyboard overlap; accessible labels.
- Screen-reader focus, safe modal choice, and focus return when tools permit them.

## Platform cautions

### Android

Bind the exact package and device. Reuse the existing authorized ADB identity.
Inspect current window and keyboard visibility before coordinate actions.
Check the process ID before and after a restart. Read scoped logs and exit reasons.
A device reconnect does not prove that the app restarted.

### Browser

Bind the origin, account, tab, and build. Prefer DOM roles and labels.
Record viewport and overlay state. Inspect console and network failures for the target origin.
Distinguish page reload, client navigation, browser restart, and storage reset.
Use a disposable profile only if the user authorizes it.

### Desktop and other mobile platforms

Bind the application identity and test account. Prefer accessibility controls and semantic identifiers.
Distinguish window closure from process exit. Inspect native overlays before pointer actions.
Use available lifecycle and diagnostics tools; report unsupported checks instead of inventing a pass.
