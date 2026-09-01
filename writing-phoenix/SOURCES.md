# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `phoenixframework/phoenix` | web framework | canonical (upstream) | 2026-08-27 | Router, controllers, plugs, contexts, connections |
| `phoenixframework/phoenix_live_view` | live view framework | canonical (upstream) | 2026-08-27 | Assigns, events, forms, streams, lifecycle |
| `fly-apps/live-beats` | real-world LiveView app | analyzed at bounded depth | 2026-08-27 | Listen-in app structure, channels + presence at scale |
| Official docs: Phoenix and LiveView guides + HexDocs | docs | canonical, verbatim spec | 2026-08-27 | Intended data flow, LiveView lifecycle semantics |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
docs, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. This skill assumes the `writing-elixir`
base (changesets, OTP, processes); it intentionally does not re-teach them.
This file pins what was read, when, so a later session can re-verify against
newer versions.