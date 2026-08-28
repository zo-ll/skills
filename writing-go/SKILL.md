---
name: writing-go
description: >-
  Write or review clean, maintainable Go using lessons from the Go standard library, etcd, prometheus, caddy, and the official Go docs and style guides. Use for Go programs and packages: structure, naming, error handling, concurrency, interfaces, the standard library, testing, performance-sensitive code, and Go code review.
---

# Writing Go

## Read what maps

- packages, layout, naming -> Structure and style
- errors, failure paths -> Handle errors deliberately
- goroutines, channels, mutexes -> Own your concurrency
- maps, slices, hot paths -> Data and performance
- net/http, io, context -> Keep the standard library first
- tests -> Test with the standard library
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read AGENTS.md, go.mod, package layout, tests. Determine Go version, module path, linter config (golangci-lint), test commands.
- Preserve established conventions unless they cause a concrete correctness or maintainability problem. New projects: simplest layout that fits.

## Structure and style

- Package by responsibility, not layer. `internal/` for code that must not leak; `cmd/` for entrypoints. Short, meaningful package names.
- MixedCaps, not snake_case; short local names; nouns for types, verbs for functions.
- Small interfaces; accept interfaces when behavior varies, return concrete types so callers keep the full surface.
- Export only what is API; document every exported name.
- Small focused functions; return early; avoid deep nesting.

## Handle errors deliberately

- Errors are values: return them, wrap with context, let callers decide. No panic for expected failures.

  ```go
  // Incorrect: failure silently disappears
  rows.Close()

  // Correct
  if err := rows.Close(); err != nil {
      return fmt.Errorf("closing rows: %w", err)
  }
  ```

- `%w` preserves the chain for `errors.Is`/`As`.

  ```go
  // Incorrect: the original error is unrecoverable
  return fmt.Errorf("read config: %v", err)

  // Correct
  return fmt.Errorf("read config: %w", err)
  ```

- Sentinel errors + `errors.Is` for stable categories; `errors.As` for typed details. Error strings lowercase, no period.
- Never silence errors with `_ =` unless intentional and documented. Cleanup failures (`Close`) get at least a log or merged into the returned error.

## Own your concurrency

- Every goroutine has an owner that decides when it ends: wait, cancel, or bound it. No fire-and-forget.

  ```go
  // Incorrect: goroutine outlives the function; no wait, no cancel
  go worker(ch)
  return

  // Correct
  g, ctx := errgroup.WithContext(ctx)
  g.Go(func() error { return worker(ctx, ch) })
  if err := g.Wait(); err != nil {
      ...
  }
  ```

- Channels for communication; immutable data shared; mutable state behind mutexes/atomics.
- Propagate `context.Context` as the first parameter; cancel cleanly on shutdown.
- `errgroup` and bounded fan-out; cap concurrency.

## Data and performance

- Slices with capacity when order matters or the collection is small; never rely on map iteration order.

  ```go
  // Incorrect: iteration order is random
  for k := range m { fmt.Println(k) }

  // Correct
  keys := slices.Sorted(maps.Keys(m))
  for _, k := range keys { fmt.Println(k) }
  ```

- Watch allocations in hot paths: reuse buffers, avoid `fmt` in tight loops, prefer `strconv`.
- Value semantics for small types; pointers for mutability, not by default.
- Benchmark with `testing.B` before guessing about performance.

## Keep the standard library first

- Stdlib before third-party: `net/http`, `io`, `encoding/json`, `context`, `sync`.
- `http.Server` timeouts; clients with explicit timeouts; close bodies/resources in all paths.
- Stream with `io.Reader`/`io.Writer` instead of buffering whole payloads.

## Test with the standard library

- Table-driven tests with `t.Run` subtests; name tests for behavior.
- Failure and empty cases, not just happy paths; `httptest` for HTTP. Fuzzing and benchmarks where they pay.
- Deterministic: no sleeps, fixed time, seeded randomness. `-race` in CI.
- Suspect tests that pass only after loosening a mock.

## Respect the version boundary

- Match the `go` directive and stdlib features of the installed version; check deprecations on upgrades.
- `gofmt`-consistent style and the project's linter set; lint findings are defects unless consciously deferred.

## Review in risk order

1. Data races, goroutine leaks, unbounded fan-out, missed cancellation.
2. Ignored errors, panics on expected failures, unwrapped error chains.
3. Context misuse; missing timeouts on servers and clients.
4. Performance: allocations in hot paths, unbounded buffers, order-dependent code.
5. API design: oversized interfaces, pointer-by-default, undocumented exports.
6. Test gaps: missing failure-path coverage; nondeterministic tests.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run `go test -race`, `go vet`, and the project's lint set.
- Every goroutine owned; every error handled or consciously recorded; no panic for expected failures.
- HTTP servers/clients have timeouts; no map-order reliance; no hot-path allocations introduced.
- State which verification ran; disclose what could not be tested.