---
name: writing-ts
description: >-
  Write clear, type-safe TypeScript with minimal abstractions. Use for new TypeScript code, changes to TypeScript code, or "writing-ts".
license: MIT
---

# Write TypeScript

Use these defaults unless the repository requires a different approach.
Preserve local conventions, public contracts, and the supported runtime.
Do not add a framework or change repository configuration to satisfy this skill.

## Ten rules

1. **Keep types strict.** Use `strict` for new projects. Consider `noUncheckedIndexedAccess` for unchecked array and dictionary access. Never weaken checks to remove an error.

2. **Validate external data.** Treat untrusted input as `unknown`. Validate it at the boundary with the existing parser or schema. Infer types from schemas when possible. Type assertions do not validate runtime values.

3. **Use inference without type tricks.** Infer local types. Annotate public contracts when callers need a stable type. Use `satisfies` to check compatibility without a type assertion. Add generics only when they express a relationship between types.

4. **Represent valid states.** Use discriminated unions instead of independent flags and optional fields for mutually exclusive states. Check exhaustive branches with `never`. Handle absent values explicitly.

5. **Do not bypass type safety.** Prefer guards and control-flow checks to `any`, casts, or non-null assertions. If an exception is necessary, isolate it. Document the invariant that makes it safe.

6. **Keep modules small.** Give each module one responsibility. Export only what callers need. Respect the existing dependency direction. Pass dependencies explicitly rather than access hidden globals. Reuse existing helpers before you add abstractions.

7. **Control mutation.** Do not mutate data that another component owns. Use `readonly` where callers must not mutate data. Derive values instead of duplicate state. Keep core calculations separate from I/O.

8. **Own every promise and resource.** Await or return promises, or give detached tasks an explicit rejection handler. `void` alone does not handle rejection. Release listeners, timers, and handles when their owner stops.

9. **Keep failures explicit.** Catch errors only where you can recover or add useful context. Preserve the original cause. Use the repository's error convention. Never convert failure into a success value without an explicit contract.

10. **Test the contract.** Test observable results, invalid inputs, and relevant failure paths. Add type tests when inference or assignability forms part of the API. Run the relevant tests, type checks, and lint checks. Report checks that you cannot run.
