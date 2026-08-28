---
name: writing-elixir
description: >-
  Write or review clean, maintainable Elixir using lessons from the Elixir standard library, Phoenix, Ecto, Plug, Dashbit packages (Broadway, Livebook), Oban, and the official Elixir docs and style guides. Use for Elixir applications and libraries: functional design, pattern matching, OTP processes and supervision, Ecto, Phoenix, error handling, testing, and Elixir code review.
---

# Writing Elixir

## Read what maps

- data, types, pattern matching -> Design around data
- processes, agents, supervisors -> Shape state with OTP
- ok/error tuples, failures -> Handle errors deliberately
- Ecto, schemas, queries -> Keep data access honest
- lists, streams, pipelines -> Keep control flow idiomatic
- tests -> Test failure as well as success
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read AGENTS.md, mix.exs, dependencies, `lib/` structure, tests. Determine Elixir/OTP versions, formatter/Credo config, test commands.
- Preserve established conventions unless they cause a concrete correctness or maintainability problem. New projects: simplest structure that fits.

## Design around data

- Build new values; no mutation. `%{old | key: value}` over stateful reshaping.
- Pattern match over conditionals; function clauses over `if`/`cond` chains. Atoms and tagged tuples so illegal states do not exist at the data level.
- Protocols for behavior that varies per struct, not `case` on type. Small public surface; `@moduledoc false`, `defp`, `defmacrop` for the rest.
- Binaries over charlists; `String` for text; `Date`/`DateTime`/`NaiveDateTime` for time.

## Shape state with OTP

- One process per stateful concern: `GenServer`/`Agent` own state; `Task` owns short-lived work. Never module attributes as runtime state — they are compile-time constants shared by every caller.

  ```elixir
  # Incorrect: module attributes are compile-time, not mutable
  defmodule Counter do
    @count 0
    def inc, do: @count + 1    # always returns 1
  end

  # Correct: runtime state belongs to the process
  defmodule Counter do
    use Agent
    def start_link(initial), do: Agent.start_link(fn -> initial end, name: __MODULE__)
    def inc, do: Agent.update(__MODULE__, &(&1 + 1))
    def value, do: Agent.get(__MODULE__, & &1)
  end
  ```

- Own every process: supervision tree, deliberate name, bounded work. Fire-and-forget via `Task.Supervisor`, never raw `spawn`.
- `GenServer` callbacks short and synchronous; slow work offloaded; timeouts set.
- No process dictionary; pass state explicitly. Link only when the failure semantics are intended.

## Handle errors deliberately

- `{:ok, value}` / `{:error, reason}` tuples for fallibility. Bare `{:ok, x} = ...` only when failure is truly impossible.

  ```elixir
  # Incorrect: a bare match crashes the caller on any error result
  {:ok, user} = Accounts.fetch_user(id)

  # Correct
  with {:ok, user} <- Accounts.fetch_user(id),
       {:ok, session} <- Sessions.create(user) do
    {:ok, session}
  else
    {:error, :not_found} -> {:error, 404}
    {:error, reason} -> {:error, reason}
  end
  ```

- Handle both arms of `case`/`with`; a catch-all `_ ->` that swallows failures hides bugs.
- Failure semantics per boundary: `raise` for programmer errors; tuples for expected failures the caller decides on.
- Side effects out of `Repo.transaction` where possible; jobs idempotent and retryable (Oban `unique`, explicit attempts).

## Keep data access honest

- Every write through a changeset: `cast`, `validate`, `Repo.insert`. Never structs from external params.

  ```elixir
  # Incorrect: params bypass validation - no casts, no constraints
  struct(Account, params) |> Repo.insert()

  # Correct
  Account.changeset(%Account{}, params) |> Repo.insert()
  ```

- No N+1: `Repo.preload` / query `:loading` options; audit list rendering.
- Bulk work: `insert_all`/`stream`/`Repo.stream` — never per-row inserts in a loop. `select` only the fields you need.
- Schema and database constraints aligned; migrations additive and reviewed.

## Keep control flow idiomatic

- `Enum`/`Stream` pipelines over manual recursion for transforms; recursion + pattern matching for stateful traversal where `Enum` does not fit.
- No full-list scans to test emptiness — `length(list) > 0` traverses.

  ```elixir
  # Incorrect: full traversal just to ask "is it empty?"
  if length(items) > 0 do ... end

  # Correct
  if items != [] do ... end
  ```

- Guards where a clause applies conditionally; pipelines top to bottom, one transformation per step.
- Small functions with clear names over comments that narrate steps.

## Respect the version boundary

- Pin Elixir/OTP versions; features of the installed version; check deprecations before upgrading.
- `mix format`, `mix compile --warnings-as-errors`, Credo with the project's config; findings are defects unless consciously deferred.

## Test failure as well as success

- ExUnit against the public seam: include error arms, changeset validation failures, empty states.
- Deterministic: no sleeps, wall-clock, or randomness; freeze time where it matters; Mox for externals.
- Tests earn their place: revert the fix and watch it fail. Suspect tests that pass only after loosening a mock.
- Property-test invariants (StreamData) where they pay; regression tests for fixed bugs, focused tests for new invariants.

## Review in risk order

1. OTP/process correctness: state ownership, un-supervised processes, process dictionary, missing timeouts, mailbox growth, race conditions.
2. Data integrity: changesets bypassed, N+1, per-row bulk writes, schema/DB mismatch, non-idempotent jobs.
3. Error handling: bare `{:ok, _} =`, swallowing catch-alls, crashes in callbacks, side effects inside transactions.
4. Concurrency/perf: unbounded spawn, full-list scans, binary concatenation in loops, ETS leaks.
5. Idiom/style: case-on-type instead of protocols, mutation-style code, Credo violations, undocumented public functions.
6. Test gaps: happy-path-only coverage, nondeterministic tests, weakened assertions.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run `mix test`, `mix format --check-formatted`, Credo (or the project's checks).
- Every write path uses a changeset; relations preloaded; every process supervised with bounded work.
- Error paths handled, not swallowed; jobs idempotent.
- State which verification ran; disclose what could not be tested.