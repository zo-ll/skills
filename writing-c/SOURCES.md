# Sources

This ledger formalizes the source material behind an existing skill. The five
projects were analyzed at the skill's creation (predates this session);
re-verified against the skill's claims on the date below.

| Source | Type | Trust tier | Retrieved | Contribution |
| --- | --- | --- | --- | --- |
| SQLite | canonical library | canonical (upstream) | 2026-08-27 (re-verified) | Contracts, self-contained headers, error conventions, testing at scale |
| Redis | canonical single-purpose system | canonical (upstream) | 2026-08-27 (re-verified) | Ownership discipline, allocation-failure handling, module boundaries |
| kilo | minimal editor | canonical (upstream) | 2026-08-27 (re-verified) | Minimal single-file structure, readability |
| linenoise | small line-editing library | canonical (upstream) | 2026-08-27 (re-verified) | realloc discipline, state-machine shape, portability |
| curl | long-lived portable tool | canonical (upstream) | 2026-08-27 (re-verified) | Platform isolation, portability boundary, maintenance discipline |

## Method

The five projects were analyzed with topic-guided sampling (key modules, public
headers, error paths, style-critical spots), not full traversal. Lessons were
synthesized into opinionated principles; no code was copied. This file pins
what was read and when, so a later session can re-verify against newer versions.