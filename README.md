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
- `work-report/` — full grounded report of session/branch work.

The multi-agent **coordinator** flow (coordinator, critic, worker, researcher)
lives in its own repository:
[zo-ll/coordinator](https://github.com/zo-ll/coordinator).

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
./bin/bootstrap.sh      # skills into all harnesses
```

Keep the clone in place: the symlinks point at it. If you move it, re-run
bootstrap. Installing a new harness later? Re-run bootstrap so the new harness
gets the skills too.
