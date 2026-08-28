---
name: writing-c
description: Write or review clean, maintainable C using lessons from SQLite, Redis, kilo, linenoise, and curl. Use for C programs and libraries, API and module design, data structures, memory ownership, error handling, portability, testing, performance-sensitive code, and C code review.
---

# Writing C

Write C that is explicit, cohesive, testable, and unsurprising.

## Start with the codebase

Before changing code:

1. Read repository instructions, nearby modules, public headers, build files, and
   tests.
2. Determine the supported C standard, platforms, compiler flags, allocator,
   naming style, error convention, and test commands.
3. Preserve established conventions unless they cause a concrete correctness or
   maintainability problem.

For new projects, choose the simplest structure and tooling that fit the expected
size. Do not impose a large-project architecture on a small program.

## Design around contracts

- Give each module a coherent responsibility. Split it when its state, ownership,
  or reasons to change are no longer related.
- Treat public headers as contracts. Keep them self-contained and expose only
  necessary types, constants, and functions.
- Keep implementation details private with `static`, opaque structs, or internal
  headers where useful.
- Prefix external symbols consistently to avoid namespace collisions.
- For every API, make ownership, lifetime, nullability, mutability, return values,
  and failure behavior clear. Document what callers cannot learn from the type.
- Prefer simple data and direct calls. Add callbacks, type erasure, or vtables only
  when interchangeable behavior or extensibility justifies them.

## Make ownership obvious

- Assign one clear owner to every allocation and resource. Define who transfers,
  borrows, releases, or retains it.
- Initialize objects into a state their cleanup function can safely handle.
- Release resources in reverse acquisition order. Use a forward jump to shared
  cleanup when it makes multi-resource error paths clearer; do not force `goto`
  into simple functions.
- Make destructors NULL-safe only when that is part of the API contract.
- Use `sizeof *ptr` for object allocations. Keep counts and byte sizes distinct.
- Check arithmetic for overflow before allocation, indexing, or pointer movement.
- Handle allocation failure according to the project's allocator contract.
- Never overwrite the only pointer to an allocation with `realloc` before checking
  its result.

## Handle errors deliberately

- Follow the repository's return convention consistently. Common choices include
  status codes, sentinel values, `NULL`, and an output parameter.
- Check every result whose failure affects correctness. Propagate useful error
  information without losing the original cause.
- Keep the success path readable and cleanup complete. Avoid partially initialized
  output unless the contract explicitly permits it.
- Use assertions only for internal invariants whose failure means a programming
  bug. Handle input, I/O, resource exhaustion, and other runtime failures normally.
- Preserve `errno` when cleanup or logging could overwrite an error the caller
  needs.

## Keep data structures honest

- Optimize first for clear invariants, ownership, and locality.
- Store related state together when it has one lifetime; avoid global mutable state
  unless the program's architecture genuinely calls for it.
- Use explicit lengths for buffers and strings. Keep capacity, used length, and
  terminator requirements distinct.
- Choose signed and unsigned types intentionally. Validate conversions and avoid
  relying on signed overflow, invalid shifts, object aliasing violations, or
  out-of-bounds pointer arithmetic.
- Use compile-time assertions for layout or range assumptions when the selected C
  standard supports them.
- Treat embedded metadata, flexible array members, intrusive structures, and
  type-erased containers as specialized tools, not defaults. State their layout
  and ownership invariants close to the implementation.

## Prefer readable control flow

- Keep functions focused and name helpers after the concept they implement.
- Prefer early validation and a linear success path over deep nesting.
- Use one variable per meaning. Remove dead code instead of commenting it out.
- Comment decisions, invariants, ownership, and non-obvious constraints—not syntax.
- Avoid clever macros when a function, enum, or named constant is clearer.

## Respect the language boundary

- Match syntax and library use to the project's declared C standard.
- Use portable C by default; isolate platform-specific behavior behind a narrow
  interface.
- Do not invent identifiers reserved to the implementation, including names that
  begin with two underscores.
- Follow the repository's brace, comment, typedef, and naming style. Treat those as
  consistency choices, not universal correctness rules.
- Prefer bounded operations with explicit sizes. Prove that every buffer access
  and string operation fits, including terminators.
- Minimize casts. Never cast merely to silence a warning without understanding the
  conversion.

## Test failure as well as success

- Test public behavior, boundary values, empty input, malformed input, and every
  documented NULL case.
- Exercise allocation, I/O, and partial-initialization failures when practical.
- Test ownership transitions and repeated create/use/destroy cycles.
- Compile with the project's strict warning set and treat new warnings as defects.
- Run the existing test suite. Use AddressSanitizer, UndefinedBehaviorSanitizer,
  Valgrind, fuzzing, or static analysis when available and proportionate to the
  change.
- Add regression tests for fixed bugs and focused tests for new invariants.

## Review in risk order

When reviewing C, prioritize:

1. Undefined behavior, memory corruption, integer overflow, and invalid lifetime.
2. Leaks, double cleanup, unchecked failures, and broken ownership contracts.
3. API or concurrency invariants and portability assumptions.
4. Missing tests and observability on error paths.
5. Structure, naming, comments, and local style.

Report concrete correctness findings before preferences. Cite the affected
location, explain the failure mode, and suggest the smallest robust fix.

## Final check

Before finishing:

- Build and run the relevant tests.
- Confirm all new allocations, resources, and failure paths have owners.
- Confirm size calculations, conversions, and buffer boundaries are checked.
- Confirm public behavior and error contracts are documented where needed.
- Confirm internal symbols stay private and headers expose only the intended API.
- State which verification ran and disclose anything that could not be tested.
