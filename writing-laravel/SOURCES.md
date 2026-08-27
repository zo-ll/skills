# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `laravel/framework` (12.x) | framework source | canonical (upstream) | 2026-08-27 | Request flow, container, facades/contracts, routing and binding conventions |
| `laravel/horizon`, `laravel/telescope`, `laravel/cashier`, `laravel/fortify` | first-party packages | canonical (upstream) | 2026-08-27 | Real app-of-the-framework shapes: job design, service classes, auth flows |
| `spatie/*` (laravel-permission, laravel-medialibrary) | reference packages | canonical (upstream) | 2026-08-27 | Provider/facade patterns, integration isolation |
| `monicahq/monica` | real-world app | analyzed at bounded depth | 2026-08-27 | Controller/action boundaries, testing at app scale |
| `koel/koel` | real-world app (Laravel + Vue) | analyzed at bounded depth | 2026-08-27 | App structure and the Laravel+Vue seam |
| Official docs: Architecture Concepts, Validation, Authorization, Testing, Eloquent, Database, Queues, Blade | docs | canonical, verbatim spec | 2026-08-27 | The framework's own intended flow and test ergonomics |
| Pint default ruleset | style catalog | canonical (upstream) | 2026-08-27 | Formatting conventions and version boundary |
| `laravel/boost` `laravel-best-practices` | official skill collection | canonical (upstream) | 2026-08-27 | Cross-check for validation, mass assignment, N+1, and transaction guidance; used to confirm or contradict the four code pairs |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
tests, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. `laravel/boost` was consulted as
criticism of this skill's drafting, not adopted. This file pins what was read,
when, so a later session can re-verify against newer versions.