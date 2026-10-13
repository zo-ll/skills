---
name: small-units
description: >-
  Break work into small units that each end in a checkable state, and do not
  advance until the current unit is green. Use for multi-step work, sweeps,
  migrations, and how you stack commits and pull requests.
license: MIT
---

# Small units

Order the work as a sequence of small units. Each unit ends in a state you can
check. Do not start the next unit until the current one is green.

**Why:** a break caught at the unit that caused it is cheap to localize. A
break caught after a batch is buried, and you have already built further on a
broken base.

## Check each unit

Each unit is a before/after bracket:

1. A known-good state.
2. One change.
3. Run the check.
4. Continue only on green.

For a sweep or a migration, run the check on every unit. The per-unit check is
nearly free when a script does the edits. Run it anyway.

Rebase onto a clean base first, so every check measures against the real
baseline.

## Stack the commits

Order the commits so the sequence proves the work. The canonical shape is the
failing test first, then the fix on top.
Other good orders: a subtraction before a reshape, a baseline capture before
the treatment, a scaffold before a feature.
Each commit stands alone. The reader replays the sequence and watches red,
then green.

## Related

- Use `prove-it` to keep each check real.
