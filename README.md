# skills

Personal agent skills. This repo is the **single source of truth**: every
skill is symlinked into every agent-harness skill directory on this machine,
so editing/committing here makes the change live in all harnesses.

## Layout

One directory per skill, each with a `SKILL.md` (Agent Skills standard):

- `learn-by-building/` — learn a subject by building a real project.
- `validator/` — adversarially validate an idea before implementation by
  researching existing solutions, trying to disprove the premise, and proposing
  cheaper alternatives.
- `code-review/` — coverage-accountable, precision-first review of Git changes
  with deterministic scope, rule resolution, and evidence-backed findings.
- `work-report/` — full grounded report of session/branch work.
- `cdp/` — drive a real Chrome over the Chrome DevTools Protocol to trace a
  page's requests, console, and Core Web Vitals, and grade the response
  headers the browser enforces.
- `ste/` — write or rewrite text in ASD-STE100 Simplified Technical English
  (default "80% STE": the writing rules without the full dictionary).
- `diagram/` — explain with a grounded diagram instead of prose; picks the
  form from the content's shape, renders inline Mermaid or an HTML/SVG file.
- `explainer/` — build a throwaway, interactive single-file HTML page that
  explains one thing (a PR, a system, a decision), opened and discarded.

This repository contains only active skills.

## Installing / re-linking

After cloning or adding a new skill:

```sh
./scripts/link.sh            # link all skills into all harnesses found
./scripts/link.sh foo        # link only skill "foo"
```

The script only touches what it owns: existing symlinks to this repo are left
alone, identical copies are replaced, and divergent copies are skipped with a
warning. It is safe to run repeatedly.

## Bootstrapping a new machine

One command makes every resource in this repo live on a fresh machine:

```sh
git clone https://github.com/zo-ll/skills.git
cd skills
./bin/bootstrap.sh      # active skills into all discovered harnesses
```

Bootstrap links active skills into every discovered harness skill directory.
After it runs, restart the harness if it does not detect the changes.

Keep the clone in place: the symlinks point at it. If you move it, re-run
bootstrap. Installing a new harness later? Re-run bootstrap so it gets the
active skills too.
