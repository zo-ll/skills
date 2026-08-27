---
name: writing-rust
description: Write or review clean, maintainable Rust using lessons from ripgrep, serde, tokio, rust-analyzer, and the official Rust docs and clippy lints. Use for Rust programs and libraries: ownership and borrowing, type-driven design, error handling, iterators, traits, unsafe, async, performance-sensitive code, testing, and Rust code review.
---

# Writing Rust

Write Rust that makes invalid states unrepresentable, handles errors
deliberately, and stays fast without contorting the code. Draw lessons from
ripgrep, serde, tokio, and rust-analyzer without copying any one project's
conventions mechanically.

## Read what maps

Read only the section that maps to the change; a small slice needs one section,
not the whole file.

- types, modules, APIs -> Design around types
- errors, fallible code -> Handle errors deliberately
- iterators, collections, hot paths -> Keep control flow idiomatic
- unsafe, FFI -> Treat unsafe as a contract
- async, concurrent work -> Own async flows
- tests -> Test failure as well as success
- reviewing a PR -> Review in risk order

## Start with the codebase

Before changing code:

1. Read repository instructions, `Cargo.toml`, edition, layout (lib/bin,
   workspace), and tests.
2. Determine the edition and MSRV, feature flags, clippy/rustfmt config, and
   test commands.
3. Preserve established conventions unless they cause a concrete correctness or
   maintainability problem. For new projects, choose the simplest layout that
   fits the expected size.

## Design around types

- Make invalid states unrepresentable: enums for mutually exclusive states,
  newtypes for units and ids, `Option` for absent, `Result` for fallible.

  ```rust
  // Incorrect: any string is accepted; wrong values compile fine
  fn set_mode(mode: &str) { ... }          // set_mode("delet") compiles

  // Correct: the type rules out the whole class of mistakes
  enum Mode { Read, Write }
  fn set_mode(mode: Mode) { ... }          // set_mode(Mode::Red) does not compile
  ```

- Keep public APIs type-safe and self-documenting: named types over bools and
  strings, builder patterns for many-argument constructors.
- Prefer enums over trait objects until behavior genuinely varies at runtime;
  keep the public surface small and internals behind `pub(crate)`.

## Own the data

- Assign one owner per value; borrow where ownership is not required, clone
  only when the caller must own a copy.
- Avoid clones in hot loops; borrow and slice instead of allocating.

  ```rust
  // Incorrect: allocates per element just to read a length
  let total: usize = list.iter().map(|s| s.to_string().len()).sum();

  // Correct: borrowed access, no allocation
  let total: usize = list.iter().map(|s| s.len()).sum();
  ```

- Keep lifetimes simple: explicit at API boundaries, elided inside. Prefer
  owned data plus borrowing over long-lived references held across scopes.
- Use interior mutability (`RefCell`, `Mutex`) only with a documented
  invariant; prefer ownership and parameters passed in.
- Avoid `Arc`/`Rc` until sharing genuinely demands it.

## Handle errors deliberately

- Represent fallibility in the type: `Result` for recoverable errors; reserve
  `panic`/`expect`/`unwrap` for programmer bugs and invariants that must hold.

  ```rust
  // Incorrect: panics on any failure; callers cannot react
  let cfg = read_config(path).unwrap();

  // Correct: propagate with context; the caller decides
  let cfg = read_config(path).context("reading config")?;
  ```

- Wrap errors with context at boundaries. Use thiserror for library error
  types and anyhow for applications, matching the project convention.
- Never panic in library code on user input, I/O, or resource exhaustion;
  return errors. Document every panic an API can trigger.
- Keep the success path readable; failure handling explicit, not scattered
  sentinel values.

## Keep control flow idiomatic

- Prefer iterators and combinators over manual loops and index arithmetic;
  use `match` over if-else chains once more than two branches exist.
- Use `Option`/`Result` combinators (`map`, `and_then`, `ok_or`) to keep
  chains linear instead of nested.
- Prefer small, focused functions that return values over command-style
  functions with comments explaining steps.
- Comment decisions, invariants, and non-obvious constraints - not syntax.

## Treat unsafe as a contract

- Keep unsafe blocks small, encapsulated, and documented with their safety
  invariants; never scattered through the codebase.

  ```rust
  // Incorrect: undocumented preconditions; the caller must guess
  unsafe { *ptr = value; }

  // Correct: one contract, documented at the only unsafe site
  /// # Safety
  /// `ptr` must be valid for writes for the duration of the call.
  unsafe fn store(ptr: *mut T, value: T) {
      unsafe { ptr.write(value); }
  }
  ```

- Prefer safe abstractions (`Vec`, slices, `Mutex`, atomics) over raw
  pointers; reach for unsafe only for FFI, layout, or measured reasons.
- Verify invariants with `debug_assert`/`assert` near the unsafe boundary.
- Isolate FFI behind one module with a safe API and documented ownership of
  foreign resources.

## Own async flows

- Keep async code on the project's chosen runtime (tokio by default): pin
  runtime features, keep blocking work off async paths (`spawn_blocking`),
  and make cancellation explicit.
- Own every spawned task: it is awaited, aborted, or bounded; no unbounded
  spawn-and-forget.
- Keep owned data across await points; don't hold references through awaits
  where ownership is simpler. Limit fan-out with `JoinSet`.

## Test failure as well as success

- Unit-test modules inline, integration-test public behavior in `tests/`, and
  doc-test examples that must stay true.
- Test error paths, boundary values, and empty input, not just happy paths.
- Keep tests deterministic: no wall-clock timing, no unordered iteration
  assumptions; seed randomness.
- Property-test invariants where they pay; keep the property precise. Add
  regression tests for fixed bugs and focused tests for new invariants.

## Respect the version boundary

- Pin the edition and MSRV; use features available in the installed toolchain.
- Run clippy with the project's lint set and rustfmt; treat warnings as
  defects unless a lint is consciously deferred.

## Review in risk order

When reviewing Rust, prioritize:

1. Unsafe correctness and undocumented invariants; unsafe spread beyond its
   minimal site.
2. Panic paths: `unwrap`/`expect`/indexing on fallible data in library code.
3. Error handling: swallowed or contextless errors, wrong error types at
   boundaries.
4. Ownership and performance: clones in hot paths, over-allocation,
   unnecessary `Arc`, unbounded spawn-and-forget tasks.
5. API design and types: stringly-typed and bool-parameter APIs, exposed
   internals.
6. Test gaps: missing failure-path coverage, nondeterministic tests.

Report concrete findings before preferences. Cite the location, explain the
failure mode, and suggest the smallest robust fix.

## Final check

Before finishing:

- Run `cargo test`, clippy, and rustfmt (or the project's checks).
- Confirm no fallible access panics in library code, no unsafe without a
  documented contract, and no clone in a hot loop.
- Confirm every spawned task is owned and cancelled or awaited, and blocking
  work stays off async paths.
- State which verification ran and disclose anything that could not be tested.