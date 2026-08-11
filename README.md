# skills

Personal agent skills. This repo is the **single source of truth**: every
skill is symlinked into every agent-harness skill directory on this machine,
so editing/committing here makes the change live in all harnesses.

## Layout

One directory per skill, each with a `SKILL.md` (Agent Skills standard):

- `coordinator/` — turn the current agent into a coordinator: decompose a
  goal into small tasks, publish them as visible issues, spawn one focused
  worker per task on an isolated git worktree (harness-agnostic), supervise,
  review, and merge their PRs.
- `learn-by-building/` — learn a subject by building a real project.
- `shipwright/` — delegate work to an external coding-agent CLI in
  tmux/Herdr and supervise it.
- `work-report/` — full grounded report of session/branch work.
- `writing-c/` — clean, maintainable C.

## Installing / re-linking

After cloning or adding a new skill:

```sh
./scripts/link.sh            # link all skills into all harnesses found
./scripts/link.sh foo        # link only skill "foo"
```

The script only touches what it owns: existing symlinks to this repo are left
alone, identical copies are replaced, and divergent copies are skipped with a
warning. It is safe to run repeatedly.
