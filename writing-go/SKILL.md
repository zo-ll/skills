---
name: writing-go
description: >-
  Write or review clean, maintainable Go using lessons from the Go standard library, etcd, prometheus, caddy, and the official Go docs and style guides. Use for Go programs and packages: structure, naming, error handling, concurrency, interfaces, the standard library, testing, performance-sensitive code, and Go code review.
---

# Writing Go

Write Go that reads like the standard library, keeps errors first-class, and
makes concurrency ownership explicit. Draw lessons from etcd, prometheus, and
caddy without copying any one project's conventions mechanically.

## Read what maps

Read only the section that maps to the change; a small slice needs one section,
not the whole file.

- packages, layout, naming -> Structure and style
- errors, failure paths -> Handle errors deliberately
- goroutines, channels, mutexes -> Own your concurrency
- maps, slices, hot paths -> Data and performance
- net/http, io, context -> Keep the standard library first
- tests -> Test with the standard library
- reviewing a PR -> Review in risk order

## Start with the codebase

Before changing code:

1. Read repository instructions, `go.mod`, package layout, and tests.
2. Determine the Go version, module path, linter configuration
   (golangci-lint), and test commands.
3. Preserve established conventions unless they cause a concrete correctness or
   maintainability problem. For new projects, choose the simplest layout that
   fits the expected size.

## Structure and style

- Package by responsibility, not by layer. Use `internal/` for code that must
  not leak and `cmd/` for entrypoints. Keep package names short and meaningful.
- Name things for their role: MixedCaps, not snake_case; short local names,
  nouns for types, verbs for functions.
- Prefer small interfaces; accept interfaces when behavior varies, return
  concrete types so callers keep the full surface.
- Keep the exported surface honest: export what is API, hide the rest, and
  document every exported name.
- Keep functions small and focused; return early; avoid deep nesting.

## Handle errors deliberately

- Errors are values: return them, wrap with context, and let callers decide.
  Do not panic for expected failures.

  ```go
  // Incorrect: failure silently disappears
  rows.Close()

  // Correct: handle it, wrap with context
  if err := rows.Close(); err != nil {
      return fmt.Errorf("closing rows: %w", err)
  }
  ```

- Use `%w` to preserve the chain when callers may need `errors.Is`/`As`.

  ```go
  // Incorrect: the original error is unrecoverable
  return fmt.Errorf("read config: %v", err)

  // Correct: wrapping keeps the chain
  return fmt.Errorf("read config: %w", err)
  ```

- Prefer sentinel errors with `errors.Is` for stable categories; use
  `errors.As` for typed details. Error strings start lowercase, no period.
- Never silence errors with `_ =` unless intentional and documented. Cleanup
  failures (`Close`) deserve at least a log or a merge into the returned
  error.

## Own your concurrency

- Every goroutine has an owner that decides when it ends: wait on it, cancel
  it, or bound its lifetime. No fire-and-forget goroutines.

  ```go
  // Incorrect: goroutine outlives the function; no wait, no cancel
  go worker(ch)
  return

  // Correct: owned lifecycle
  g, ctx := errgroup.WithContext(ctx)
  g.Go(func() error { return worker(ctx, ch) })
  if err := g.Wait(); err != nil {
      ...
  }
  ```

- Communicate with channels, share immutable data, and protect mutable state
  with mutexes or atomics - not by casually copying values between goroutines.
- Propagate `context.Context` as the first parameter; cancel cleanly on
  shutdown.
- Prefer `errgroup` and bounded fan-out over hand-rolled coordination; cap
  concurrency.

## Data and performance

- Prefer slices with capacity when order matters or the collection is small;
  never rely on map iteration order.

  ```go
  // Incorrect: iteration order is random
  for k := range m { fmt.Println(k) }

  // Correct: sort when order matters
  keys := slices.Sorted(maps.Keys(m))
  for _, k := range keys { fmt.Println(k) }
  ```

- Watch allocations in hot paths: reuse buffers, avoid `fmt` in tight loops,
  prefer `strconv` for conversions.
- Use value semantics for small types; use pointers for mutability, not as a
  default for every type.
- Prefer testing over guessing about performance: benchmark with `testing.B`.

## Keep the standard library first

- Reach for the standard library before third-party dependencies: `net/http`,
  `io`, `encoding/json`, `context`, `sync`.
- Configure `http.Server` timeouts; create clients with explicit timeouts;
  close bodies and resources in all paths.
- Stream with `io.Reader`/`io.Writer` instead of buffering whole payloads
  where streams are natural.

## Test with the standard library

- Table-driven tests with `t.Run` subtests cover the matrix; name tests for
  behavior.
- Test failure and empty cases, not just happy paths; use `httptest` for HTTP.
  Use fuzzing and benchmarks where they pay.
- Keep tests deterministic: no sleeps, fixed time, seeded randomness. Run
  `-race` in CI.
- Suspect weakened tests: a test that only passes after loosening a mock.

## Respect the version boundary

- Match the `go` directive and the standard library features available in the
  installed version; check deprecations on upgrades.
- Keep `gofmt`-consistent style and the project's linter set; treat lint
  findings as defects unless consciously deferred.

## Review in risk order

When reviewing Go, prioritize:

1. Data races, goroutine leaks, unbounded fan-out, missed cancellation.
2. Ignored errors, panics on expected failures, unwrapped error chains.
3. Context misuse and missing timeouts on servers and clients.
4. Performance: allocations in hot paths, unbounded buffers, order-dependent
   code.
5. API design: oversized interfaces, pointer-by-default, undocumented exports.
6. Test gaps: missing failure-path coverage, nondeterministic tests.

Report concrete findings before preferences. Cite the location, explain the
failure mode, and suggest the smallest robust fix.

## Final check

Before finishing:

- Run `go test -race`, `go vet`, and the project's lint set.
- Confirm every goroutine is owned, every error is handled or consciously
  recorded, and no panic is used for expected failures.
- Confirm HTTP servers and clients have timeouts, no reliance on map order,
  and no hot-path allocations introduced.
- State which verification ran and disclose anything that could not be tested.