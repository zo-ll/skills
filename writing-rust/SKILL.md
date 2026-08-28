---
name: writing-rust
description: >-
  Write or review clean, maintainable Rust using lessons from ripgrep, serde, tokio, rust-analyzer, and the official Rust docs and clippy lints. Use for Rust programs and libraries: ownership and borrowing, type-driven design, error handling, iterators, traits, unsafe, async, performance-sensitive code, testing, and Rust code review.
---

# Writing Rust

## Read what maps

- types, modules, APIs -> Design around types
- errors, fallible code -> Handle errors deliberately
- iterators, collections, hot paths -> Keep control flow idiomatic
- unsafe, FFI -> Treat unsafe as a contract
- async, concurrent work -> Own async flows
- tests -> Test failure as well as success
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read AGENTS.md, Cargo.toml, edition, layout (lib/bin, workspace), tests. Determine edition/MSRV, feature flags, clippy/rustfmt config, test commands.
- Preserve established conventions unless they cause a concrete correctness or maintainability problem. New projects: simplest layout that fits the expected size.

## Design around types

- Make invalid states unrepresentable: enums for exclusive states, newtypes for units/ids, `Option` for absent, `Result` for fallible.

  ```rust
  // Incorrect: any string accepted; wrong values compile
  fn set_mode(mode: &str) { ... }          // set_mode("delet") compiles

  // Correct: the type rules out the whole class of mistakes
  enum Mode { Read, Write }
  fn set_mode(mode: Mode) { ... }          // set_mode(Mode::Red) does not compile
  ```

- Public APIs type-safe and self-documenting: named types over bools/strings; builders for many-argument constructors.
- Enums over trait objects until behavior genuinely varies at runtime. Small public surface; internals behind `pub(crate)`.

## Own the data

- One owner per value; borrow where ownership is not required; clone only when the caller must own a copy.
- No clones in hot loops; borrow and slice.

  ```rust
  // Incorrect: allocates per element just to read a length
  let total: usize = list.iter().map(|s| s.to_string().len()).sum();

  // Correct
  let total: usize = list.iter().map(|s| s.len()).sum();
  ```

- Lifetimes: explicit at API boundaries, elided inside. Prefer owned data + borrowing over long-lived references held across scopes.
- Interior mutability (`RefCell`, `Mutex`) only with a documented invariant; prefer ownership and passed-in parameters.
- No `Arc`/`Rc` until sharing genuinely demands it.

## Handle errors deliberately

- `Result` for recoverable errors; `panic`/`expect`/`unwrap` reserved for programmer bugs and invariants that must hold.

  ```rust
  // Incorrect: panics on any failure; callers cannot react
  let cfg = read_config(path).unwrap();

  // Correct
  let cfg = read_config(path).context("reading config")?;
  ```

- Wrap errors with context at boundaries. thiserror for libraries, anyhow for applications — match the project.
- Never panic in library code on user input, I/O, or resource exhaustion; return errors. Document every panic an API can trigger.
- Success path readable; failure handling explicit, not scattered sentinels.

## Keep control flow idiomatic

- Iterators/combinators over manual loops and index arithmetic; `match` over if-else chains past two branches.
- `Option`/`Result` combinators (`map`, `and_then`, `ok_or`) to keep chains linear.
- Small functions that return values over command-style functions with step comments.
- Comment decisions, invariants, non-obvious constraints — not syntax.

## Treat unsafe as a contract

- Unsafe blocks small, encapsulated, documented with their safety invariants; never scattered.

  ```rust
  // Incorrect: undocumented preconditions; the caller must guess
  unsafe { *ptr = value; }

  // Correct
  /// # Safety
  /// `ptr` must be valid for writes for the duration of the call.
  unsafe fn store(ptr: *mut T, value: T) {
      unsafe { ptr.write(value); }
  }
  ```

- Safe abstractions (`Vec`, slices, `Mutex`, atomics) before raw pointers; unsafe only for FFI, layout, or measured reasons.
- Verify invariants with `debug_assert`/`assert` near the unsafe boundary.
- FFI isolated behind one module with a safe API and documented ownership of foreign resources.

## Own async flows

- The project's runtime (tokio by default): pin features; blocking work off async paths (`spawn_blocking`); cancellation explicit.
- Every spawned task owned: awaited, aborted, or bounded — no unbounded spawn-and-forget.
- Owned data across await points; don't hold references through awaits where ownership is simpler. Limit fan-out with `JoinSet`.

## Test failure as well as success

- Unit tests inline; integration tests in `tests/`; doc-tests that must stay true.
- Error paths, boundary values, empty input — not just happy paths.
- Deterministic: no wall-clock, no unordered-iteration assumptions; seed randomness.
- Property-test invariants where they pay; regression tests for fixed bugs, focused tests for new invariants.

## Respect the version boundary

- Pin edition/MSRV; use features of the installed toolchain.
- Clippy with the project's lint set and rustfmt; warnings are defects unless consciously deferred.

## Review in risk order

1. Unsafe correctness and undocumented invariants; unsafe beyond its minimal site.
2. Panic paths: `unwrap`/`expect`/indexing on fallible data in library code.
3. Error handling: swallowed or contextless errors; wrong error types at boundaries.
4. Ownership/perf: clones in hot paths, over-allocation, unnecessary `Arc`, unbounded spawn-and-forget tasks.
5. API design/types: stringly-typed and bool-parameter APIs; exposed internals.
6. Test gaps: missing failure-path coverage; nondeterministic tests.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run `cargo test`, clippy, rustfmt (or the project's checks).
- No fallible access panics in library code; no unsafe without a documented contract; no hot-loop clones.
- Every spawned task owned and cancelled/awaited; blocking work off async paths.
- State which verification ran; disclose what could not be tested.