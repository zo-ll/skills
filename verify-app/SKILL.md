---
name: verify-app
description: >-
  Make an app verifiable with one runnable command and one short document.
  Generates scripts/verify.sh (or reuses the existing test target), VERIFY.md,
  and a pointer in AGENTS.md, plus a feature map. Use when a project has no
  scripted way to prove app behavior.
license: MIT
---

# Verify app

An app needs one runnable command that drives it and proves behavior. The
command is the artifact. It works in every agent harness and in CI. A
project-local skill is optional and holds no unique content.

Find the harness the repo already has first. Do not duplicate it.

## 1. Find the existing harness

Search the repo before you write anything:

- A test or end-to-end suite: Playwright, Cypress, a Go or Rust integration
  test, or end-to-end pytest tests.
- A task runner target: `make verify`, `npm run e2e`, or a Justfile recipe.
- A container setup: `docker-compose.yml`, or a Compose profile that starts
  the stack.
- A documented quickstart in `README.md` or `CONTRIBUTING.md`.

If the repo can already drive the app, use that command. Your job is then the
document and the pointer, not a new script.
Add the parts that are absent: a readiness check, evidence capture, and
cleanup.

If the repo cannot drive the app, build the smallest command that can.

## 2. Write one runnable command

Put it at `scripts/verify.sh`, or use the repo's existing target.
The command must:

1. Launch the app from an empty data dir, with migrations and seed data.
2. Doctor the instance: process up, right build, port owned by us, auth valid.
3. Drive the mapped features that the command can automate.
4. Capture evidence, and keep it after cleanup.
5. Clean up. Stop only the processes the run started. Never kill by process
   name.
6. Exit non-zero on any failure.

Answer these points from the code, not from the user:

- **Surface:** what does a user touch? A web UI, a CLI, a service, a library,
  or a mobile app.
- **Run:** the exact start command. Note the port, the environment variables,
  the seed data, and the auth.
- **Drive:** how an agent controls the app. Use the repo's harness first. Then
  a generic recipe: browser/CDP for web, tmux or a PTY for a CLI, HTTP for a
  service.
- **Observe:** the evidence. Screenshots, terminal transcripts, response
  bodies, logs, exit codes, or database state.
- **Isolate:** can two instances run side by side? If not, refuse to
  double-drive, and say so in the document.

If the app does not build or start, fix that first, or report it.
A command written against a broken base teaches wrong steps.

## 3. Write one document

Write `VERIFY.md` at the repo root. Keep it short. A human and a cold agent,
mid-task, read it. Give these sections:

- **Launch:** the exact command, and the visible sign of readiness. Ready
  means usable, not just a live process.
- **Doctor:** the read-only health check. Run it before the first drive and
  after a surprise.
- **Drive:** the interactive recipe with real selectors and commands. Prefer
  stable handles: ARIA labels, data attributes, route paths.
- **Evidence:** what to capture, where it goes, and the proof standard.
  Exercise the real user path, not a test-only endpoint. Capture the action
  and the resulting state. Verify the side effects too.
- **Cleanup:** stop only what the run started. The evidence survives the
  cleanup.
- **Helpers:** every helper script is executable, and its invocation is shown.

## 4. Map the features

Put the feature map in the document. Start with the top three to five
user-facing features, taken from routes, commands, menus, or docs. Each entry
has four headings: `Sub-features`, `How to get to it (user POV)`, `Driving it
with <harness>`, and `Gotchas`.

When the map grows past a few features, move each feature to its own file under
`docs/verification/`, and index the files from `VERIFY.md`.

## 5. Add the pointer

Add one line to `AGENTS.md`, or to the repo's existing agent instructions:

> To verify the app, run `scripts/verify.sh`. Read `VERIFY.md` for the feature map.

Without the pointer, a cold agent does not find the command.

## 6. Prove it, then stop

Run the command end to end once: launch, doctor, drive one feature, capture
evidence, clean up. Confirm the evidence still exists after the cleanup.
A command that was never run is a draft, not a deliverable.

Add a project-local skill only when a harness needs one. The skill body points
at the command and the document. It holds no unique content. Do not make the
skill the source of truth.

## Related

- Use `check-the-check` to keep the command and the map honest as the app
  changes.
- Use `prove-it` for the evidence standard.
