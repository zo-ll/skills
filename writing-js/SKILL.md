---
name: writing-js
description: >-
  Write or review clean, maintainable JavaScript and TypeScript (TypeScript as JS with types). Lessons from the TypeScript compiler, esbuild, Vite, Vitest, and the official TypeScript docs and style guides. Use for JS/TS code: types and narrowing, async, modules and Node conventions, error handling, testing, and code review. Pairs with writing-vue for Vue components.
---

# Writing JS/TS

## Read what maps

- types, narrowing, casts -> Design around types
- promises, async, error paths -> Handle async deliberately
- modules, imports, Node -> Respect modules and the runtime
- data, mutation, state -> Keep data honest
- tests -> Test failure as well as success
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read AGENTS.md, package.json, tsconfig, lint config (ESLint/typescript-eslint), test runner (Vitest/node:test), ESM vs CJS.
- Preserve conventions unless they cause a concrete correctness or maintainability problem. New projects: simplest config that fits.

## Design around types (TS)

- `strict` stays on. No `any`; prefer `unknown` + narrowing; typed params/returns.

  ```ts
  // Incorrect: any disables the type system
  export function lookup(id: any): any { ... }

  // Correct
  export function lookup(id: string): User | undefined { ... }
  ```

- Discriminated unions over stringly-typed unions.

  ```ts
  // Incorrect: no compiler-checkable shape
  type Result = { kind: string; value?: unknown }

  // Correct
  type Result = { kind: "ok"; value: User } | { kind: "error"; reason: string }
  ```

- Narrow before use: `typeof`, `in`, discriminated unions. No `!` non-null assertions unless the invariant is proven locally; no `as` casts to silence the compiler.

  ```ts
  // Incorrect: asserts an invariant the compiler can't check
  const name = user!.name

  // Correct
  if (user !== null) {
    const name = user.name
  }
  ```

- `noUncheckedIndexedAccess` on; handle `undefined` from indexing.

## Handle async deliberately

- Every promise awaited, handled, or explicitly kept alive — no floating promises.

  ```ts
  // Incorrect: floating promise; rejection unhandled
  fetchData(url)

  // Correct
  await fetchData(url)
  // or, fire-and-forget with a handled rejection:
  void fetchData(url).catch(log)
  ```

- Prefer `async`/`await`; handle rejection paths (`try`/`catch` or `.catch`); no swallowing `catch` blocks.
- No sync I/O in request handlers or hot async paths; know the event loop.

## Respect modules and the runtime

- ESM by default; `node:` prefix for builtins; explicit imports.
- Errors: typed error paths; `Error` subclasses or discriminated causes; never throw non-Errors; catch and re-throw with context.
- Node: `node:` builtins, no hidden global mutation, no unbounded caches.
- Dates/numbers: `Intl`, `Date`/`Temporal` where available; no hand-rolled formatting.

## Keep data honest

- Mutation only when local and owned; copy on share; no shared mutable module state.
- `null`/`undefined` explicit; `??` and `?.` deliberate — avoid truthy/falsy pitfalls (`0`, `""`).
- One meaning per name; no dead code left in place.

## Test failure as well as success

- Vitest or node:test per project; name tests for behavior; test failure and empty states.
- Deterministic: no timers/randomness/network without fakes; fake clock where needed.
- Tests earn their place: revert the fix and watch it fail. Suspect tests that pass only after loosening a mock.
- Test through the public API, assert behavior not internals.

## Respect the version boundary

- Pin engines/TS/ESM settings; features of the installed version; check deprecations before upgrading.
- Lint and typecheck as authority: ESLint + typescript-eslint per project config; `tsc --noEmit` clean; warnings are defects unless consciously deferred.

## Review in risk order

1. Types: `any`, unsafe casts, non-null assertions, unhandled narrowing.
2. Async: floating promises, swallowed rejections, untyped error paths.
3. Data: shared mutable state, truthy/falsy bugs, mutation leakage.
4. Runtime/Node: sync I/O in async paths, wrong module semantics, unbounded caches.
5. Tests: internals assertions, loosened mocks, missing failure-path coverage.
6. Style/modules: naming, `any`-spray, dependency sprawl.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run tests, lint, `tsc --noEmit` (or the project's checks).
- Confirm no `any`, no floating promises, no non-null assertions without a proven invariant.
- State which verification ran; disclose what could not be tested.