# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `golang/go` standard library | framework source | canonical (upstream) | 2026-08-27 | Idiom baseline: `net/http`, `io`, `errors`, `context`, `sync` |
| `etcd-io/etcd` | distributed system | analyzed at bounded depth | 2026-08-27 | Structure, error handling, concurrency at scale |
| `prometheus/prometheus` | real-world system | analyzed at bounded depth | 2026-08-27 | Testing discipline, package boundaries, data ownership |
| `caddyserver/caddy` | canonical project | canonical (upstream) | 2026-08-27 | Interfaces, clean structure, small surfaces |
| Effective Go, `golang/go` CodeReviewComments wiki, Google Go Style Guide (`google/styleguide` go guide and decisions) | docs | canonical, verbatim spec | 2026-08-27 | Naming, formatting, error and concurrency conventions |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
docs, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. This file pins what was read, when,
so a later session can re-verify against newer versions.