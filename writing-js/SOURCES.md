# Sources

All sources first-class inputs to the same distillation pass that produced this
skill; none were copied. Retrieval dates recorded per source.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| `microsoft/TypeScript` | real-world system | analyzed at bounded depth | 2026-08-27 | Type shaping, narrowing, API design |
| `evanw/esbuild` | canonical single-purpose project | canonical (upstream) | 2026-08-27 | Performance discipline, minimal surface |
| `vitejs/vite` or `vitest-dev/vitest` | real-world system | canonical (upstream) | 2026-08-27 | Module conventions, ESM, testing seams |
| Official docs: TypeScript Handbook, MDN JS guide | docs | canonical, verbatim spec | 2026-08-27 | Intended idioms, strict-mode semantics |
| Google TypeScript Style Guide | docs | canonical (upstream) | 2026-08-27 | Naming, formatting conventions |
| Effective TypeScript (book) | prose canon | consulted, not adopted | 2026-08-27 | Type-level best practices, narrowing discipline |
| `typescript-eslint` + ESLint recommended | style catalog | canonical (upstream) | 2026-08-27 | Idiom/anti-idiom inventory |
| On-stack pairing: own Vue/TS code, `koel` frontend | real-world code | first-hand / bounded depth | 2026-08-27 | The Vue+TS seam (used by writing-vue too) |

## Method

Repos and docs were read with topic-guided sampling (key modules, public APIs,
docs, style-critical spots), not full traversal. Lessons were synthesized into
opinionated principles; no code was copied. This file pins what was read, when,
so a later session can re-verify against newer versions.