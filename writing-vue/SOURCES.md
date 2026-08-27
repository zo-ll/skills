# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `vuejs/core` (3.x) | framework source | canonical (upstream) | 2026-08-27 | Composition API semantics, reactivity system, component contracts |
| `vueuse/vueuse` | reference library | canonical (upstream) | 2026-08-27 | Composables, `computed`/`watch` discipline, effect scopes |
| `element-plus` | component library | canonical (upstream) | 2026-08-27 | Component architecture, typed props/emits, expose patterns |
| `directus/directus` | real-world app | analyzed at bounded depth | 2026-08-27 | App-scale Vue 3 + TS, Pinia, store/view boundaries |
| `koel/koel` | real-world app (Laravel + Vue) | analyzed at bounded depth | 2026-08-27 | The Laravel + Vue seam, component boundaries |
| Official docs: Guide, Style Guide (priority rules), Best Practices | docs | canonical, verbatim spec | 2026-08-27 | Intended data flow, style priorities, production concerns |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
docs, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. This file pins what was read, when,
so a later session can re-verify against newer versions.