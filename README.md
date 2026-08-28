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
- `critic/` — independent verification-first review with a structured verdict
  contract; spawned per surviving PR (read-only, starved input).
- `learn-by-building/` — learn a subject by building a real project.
- `shipwright/` — delegate work to an external coding-agent CLI in
  tmux/Herdr and supervise it.
- `work-report/` — full grounded report of session/branch work.
- `writing-c/` — clean, maintainable C.
- `writing-elixir/` — Elixir/OTP/Ecto base (stack-agnostic).
- `writing-go/` — idiomatic Go.
- `writing-js/` — JavaScript + TypeScript (TS as JS with types).
- `writing-laravel/` — Laravel applications and packages.
- `writing-phoenix/` — thin Phoenix layer over `writing-elixir` (routes,
  contexts, LiveView, channels).
- `writing-rust/` — clean, maintainable Rust.
- `writing-vue/` — Vue 3 applications and components (pairs with
  `writing-laravel`).

`harness/` additionally holds the pi subagent extension (scoped skill
manifests via `--no-skills --skill`) and the `worker`/`critic` agent
definitions; `bin/bootstrap.sh` installs everything on a new machine.

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
./bin/bootstrap.sh      # skills into all harnesses + pi extension & agents
```

Bootstrap links the skills into every harness skill dir, symlinks the
`subagent` extension into `~/.pi/agent/extensions/`, and the `worker`/`critic`
agents into `~/.pi/agent/agents/` - all as symlinks to this repo, so edits here
stay live everywhere. After it runs, restart pi or run `/reload` inside it.

Keep the clone in place: the symlinks point at it. If you move it, re-run
bootstrap. Installing a new harness later? Re-run bootstrap so the new harness
gets the skills too.

The subagent tool spawns workers and critics with scoped skill manifests, so a
worker only sees the skills named per task:

```
{ agent: "worker", task: <brief>, skills: ["writing-laravel", "writing-vue"], cwd: <worktree> }
{ agent: "critic",  task: <brief>, skills: ["critic", "writing-laravel"],  cwd: <worktree> }
```
