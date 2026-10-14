---
name: drive-the-app
description: >-
  Drive an app's actual UI, compare its behavior with its contracts, and keep
  evidence for each result. Use for "drive the app", "check every screen",
  "test it on my phone", "UI acceptance", or an end-to-end app check.
  Applies to mobile, browser, and desktop apps.
license: MIT
---

# Drive the app

Test the actual artifact through its UI. A build, a unit test, and a screenshot alone do not prove a workflow.
Use source tests as support, not as a substitute for device observations.

## 1. Establish the boundary

1. Identify the target app, account, device, and environment.
2. Record the user's authorization for install, synthetic records, edits, deletion, reset, and publication.
3. Prefer a test account or an isolated app package.
4. List the existing records that must remain intact.
5. Ask the user to leave the target available and avoid concurrent use.
6. Define the implemented scope and the acceptance criteria.

Do not infer reset permission from permission to test. Do not touch another app, account, or database.
If a workflow can send messages, charge money, or publish content, get explicit permission before that action.
Stop if isolation or artifact identity is uncertain.

## 2. Identify the artifact

1. Record the source commit and the current worktree state.
2. Record the build variant, configuration, and artifact hash when available.
3. Read the installed version from the target.
4. Compare the installed artifact with the intended artifact when the platform permits it.
5. Record the relevant source-test results and their exact commit.

Keep modified builds distinct from reviewed builds. A verdict for an older commit does not approve a new artifact.
A test variant can prove its shared behavior. It does not automatically prove production-specific behavior.

## 3. Make a feature map

Read the routes, forms, service contracts, and existing verification document before the first mutation.
Keep business rules in their existing service or core layer. Do not invent UI rules to make a test pass.

For each implemented feature, record:

| Feature | Starting state | Action | Expected observation | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Example | Empty test account | Save one item | One durable item | Native snapshot and reload | Not run |

Use `pass`, `fail`, `blocked`, or `not run`. Treat unimplemented features separately.
Select applicable cases from `references/cases.md`. Do not test irrelevant cases to increase the assertion count.

Use independent expected values. For numerical facts, choose a small dataset with values you can calculate independently.
Include different units or comparison groups when the contract separates them.
Do not use the app's displayed total as the expected total.

## 4. Configure a safe driver

Use available platform tools: native accessibility automation, browser automation, or a desktop accessibility API.
Prefer semantic labels and native roles over fixed coordinates.
If only coordinates are available, derive them from a fresh snapshot of the actual viewport.

Before each action:

1. Confirm the target app or page is in the foreground.
2. Confirm the target control exists and is enabled.
3. Confirm the snapshot still matches the current screen.
4. Remove an obstructive overlay only through its known safe action.
5. Execute one action.
6. Capture the resulting state before the next action.

A keyboard, modal, scroll offset, animation, or changed layout can invalidate coordinates.
An accessibility tree can expose controls beneath an overlay. Inspect actual window state when necessary.
Do not send Back blindly to hide a keyboard. A second Back can leave the form.
A rapid second tap can hit a different control after the layout changes.

Keep the driver narrow. Give commands timeouts and bounded retries.
Reuse an existing authorized connection identity before a new pairing attempt.
If an endpoint changes, use the current advertised endpoint or ask the user. Do not scan arbitrary addresses.
Never print, copy, or publish private connection keys.

## 5. Work in small units

Start each unit from an observed state. End it with a checkable result.
Run the smallest destructive case against one clearly identified synthetic record first.
Advance to the next dependent unit only after the current unit passes.

A useful order is:

1. Empty states, navigation, catalog, and preferences.
2. Entry, input errors, conventions, and duplicate actions.
3. Draft recovery, corrections, confirmation, and deletion.
4. History, filters, facts, and exact source navigation.
5. Process restart, explicit close, and durable records.
6. Pagination, scale, and runtime diagnostics.

Adapt the order to dependencies. Verify the side effect, not just the success message.
After a write, inspect the durable record through reload, navigation, or a new process.
After deletion, inspect both the record list and its dependent facts.
After a correction, compare the exact old and new values.

## 6. Separate driver errors from app defects

If a check fails, inspect the observation method before the app implementation.
Compare the foreground identity, snapshot, overlay state, control bounds, action, and resulting values.

Classify the result as one of these:

- **App defect:** a valid action violates the contract on the actual artifact.
- **Driver error:** automation acted on the wrong target or observed the wrong state.
- **Environment block:** transport, permissions, lock state, or dependencies prevent the action.
- **Unverified risk:** the source suggests a defect that the live attempt did not reproduce.

Correct a driver error, restore an observed state, and repeat the affected checks.
Keep the original interruption and the repeat result. Do not count a driver error as an app failure.
Do not convert an environment block into a pass.
Three successful race attempts do not disprove a source-level race.

For a confirmed defect, keep the failed-before state, exact steps, values, artifact identity, and evidence.
Continue independent checks only after you restore a safe state. Do not hide the defect in the pass count.

## 7. Test lifecycle explicitly

Navigation, background resume, activity relaunch, process restart, and data reset are different operations.
Record which operation ran. Prove a process restart with a new process identity when available.
A launch command can return to an existing process instead of starting a new one.

Test committed records separately from unsaved drafts.
State the contract for draft survival; do not assume that memory-only drafts survive process death.
If the app has an explicit close command, test its confirmation, cancellation, closed controls, and documented recovery path.

## 8. Test pagination and scale separately

Use at least one more record than the page size for a pagination check.
Verify the partial last page, boundary controls, reverse navigation, filter reset, and exact detail identity.
Use distinct fixture labels when possible. Duplicate labels do not prove distinct record identities.

A two-page sample is not a large-history benchmark.
Before a scale check, state the dataset size, distribution, target operations, measurements, and acceptance thresholds.
If the project has no threshold, report measurements without a pass claim.

An approved fixture API or import can create a large dataset without thousands of UI actions.
Keep fixture creation distinct from UI verification. Do not claim that seeded records prove the create workflow.
Do not add an unguarded fixture endpoint to production.
Preserve existing data and delete only fixtures that this run owns.

Measure the relevant operation on the actual target.
Record units, sample count, warm/cold state, and device conditions.
Separate query time, render time, frame metrics, and driver overhead.
A screenshot command's duration is not the app's response time.

## 9. Keep evidence private and durable

Keep evidence outside a public source repository unless the user approves a sanitized publication.
Scope logs to the target app, account, process, and time range.
Exclude secrets, unrelated app data, private endpoints, and notification content from public artifacts.

Store each result immediately. A JSON Lines record can use this shape:

```json
{"feature":"history","check":"partial final page","status":"pass","expected":{"items":1},"observed":{"items":1},"artifact":"BUILD_ID","evidence":["snapshots/page-2.xml"],"at":"ISO_TIMESTAMP"}
```

Keep native trees or DOM snapshots for machine-readable values.
Keep screenshots for layout and visible defects.
Keep scoped logs for crashes and errors. Compare historical exits with the test time before attributing them to this run.

Use stable storage for reports, scripts, results, and resume notes. Do not rely only on temporary directories.
Scripts must state their required data and screen. A stateful script is not safe to rerun blindly.

## 10. Pause and resume safely

1. Stop the driver before the user takes the device away.
2. Confirm that no driver process remains active.
3. Record the last completed assertion and the last attempted action separately.
4. Record owned fixtures, pending writes, source identity, and remaining checks.
5. Save the evidence and a resume note outside Git.

An interrupted command can commit after the last saved snapshot.
After reconnection, inspect live state before another write. Do not infer it from the old screenshot.
Do not repeat a whole mutation batch just because its last command did not report success.

## 11. Report and follow through

Report:

- Exact artifact, target, and implemented scope.
- Passed, failed, blocked, and unverified checks.
- Assertion count separately from feature coverage and fixture checks.
- Confirmed defects with steps and evidence paths.
- Measurements with scope and limits.
- Final app state, retained fixtures, cleanup, and background processes.
- Source changes, review status, and any push or merge.

Do not say "everything works" when a feature, scale case, or accessibility check remains unverified.
Do not clear a source-review finding solely because a live attempt did not reproduce it.
Do not merge or publish without authorization.

If the user requests a fix, preserve the failed-before evidence.
Verify the fixed source and the newly installed artifact before the same failed checks run again.
Request an independent exact-head review when required. Honor the user's reviewer and notification preferences.
Keep the passing-after evidence beside the original failure.
