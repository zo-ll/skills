# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `BurntSushi/ripgrep` | canonical single-purpose project | canonical (upstream) | 2026-08-27 | Ownership, borrow discipline, error handling, performance without contortion |
| `serde-rs/serde` | reference library | canonical (upstream) | 2026-08-27 | API design, traits, precise error types, derive ergonomics |
| `tokio-rs/tokio` | async runtime | canonical (upstream) | 2026-08-27 | Async ownership, cancellation, task lifecycle |
| `rust-analyzer/rust-analyzer` | real-world system | analyzed at bounded depth | 2026-08-27 | Module architecture, incremental design at scale |
| `rust-lang/rust-clippy` lint catalog | style catalog | canonical (upstream) | 2026-08-27 | Idiom/anti-idiom catalog; version boundary |
| Official docs: Rust Book, Rust API Guidelines (`rust-lang/api-guidelines`), rustfmt style guide | docs | canonical, verbatim spec | 2026-08-27 | API guidelines, naming, unsafety documentation convention |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
docs, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. This file pins what was read, when,
so a later session can re-verify against newer versions.