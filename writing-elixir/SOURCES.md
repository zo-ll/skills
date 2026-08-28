# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `elixir-lang/elixir` standard library + official guides | framework source | canonical (upstream) | 2026-08-27 | Immutability, Enum/Stream, pattern matching, OTP core |
| `phoenixframework/phoenix` | web framework | canonical (upstream) | 2026-08-27 | Routing, controllers, contexts, supervision in an app |
| `elixir-ecto/ecto` | data layer | canonical (upstream) | 2026-08-27 | Changesets, queries, preloads, `multi` |
| `elixir-lang/plug` | small flawless library | canonical (upstream) | 2026-08-27 | Function-based middleware, `Plug.Conn` design |
| `dashbitco` (broadway, nimble_*, livebook) | reference packages | canonical (upstream) | 2026-08-27 | DSL design, supervision trees, production package shape |
| `oban-bg/oban` | reference package | canonical (upstream) | 2026-08-27 | Job semantics, idempotency, retry discipline |
| `supabase/realtime` | real-world app | analyzed at bounded depth | 2026-08-27 | Phoenix at production scale, channel/OTP patterns |
| `rrrene/credo` ruleset + `christopheradams/elixir_style_guide` | style catalogs | canonical (upstream) | 2026-08-27 | Idiom/anti-idiom inventory, naming conventions |
| Official docs: Elixir guides, Phoenix and Ecto docs, Hex writing-documentation guide | docs | canonical, verbatim spec | 2026-08-27 | Intended idioms, process model, documentation norms |
| Books (consulted, not adopted): Designing Elixir Systems with OTP; Programming Ecto | prose canon | consulted | 2026-08-27 | OTP discipline, Ecto semantics |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
docs, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. This file pins what was read, when,
so a later session can re-verify against newer versions.