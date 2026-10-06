# Evidence sources

Search the categories that can answer the question.
Use available records and tools without a required vendor or integration.
Record what each search covers and what it cannot cover.

## Source control and reviews

Inspect introduction commits, later changes, review discussions, comments, tests, and release notes.
Follow file renames and earlier versions of copied patterns.

Useful Git commands, when available:

```sh
git blame -L <start>,<end> -- <file>
git log --follow -p -- <file>
git log -S '<exact_text>' -p -- <file>
git log -G '<pattern>' -p -- <file>
git show <commit>
```

Read substantive review descriptions and discussions through the available interface.
Inspect related files in the same change.
Find linked issues, documents, and incidents.

A last-touch commit can obscure the original decision.
Squashed history can omit earlier deliberation.
A vague commit message does not override the patch or review evidence.
Tests show expected behavior; they do not necessarily state the original motivation.

Return identifiers, dates, authors, relevant quotes, and precise locations.

## Issues and requirements

Start with linked issues.
Search feature names, domain terms, symbols, and error strings.
Read descriptions, comments, parent issues, duplicate chains, milestones, and attached requirements.

This category often explains the customer, business, or compliance constraint.
Labels are clues, not a complete rationale.
Check scope changes and dates against the code change.
A closed issue does not prove that its proposed solution reached production.

Return issue identifiers, links, quoted requirements, and decision context.

## Documents and decision records

Search specifications, decision records, proposals, review notes, runbooks, and postmortems.
Read full records and relevant linked sections.
Check status, author, dates, revisions, and rejected alternatives.

Distinguish drafts from accepted decisions.
Compare a planned design with the actual change.
Specific constraints are stronger evidence than a generic template statement.

Return titles, links, section locations, quotes, and document status.

## Team conversations

Search feature terms, change identifiers, error strings, authors, and relevant dates.
Read complete threads rather than isolated messages.
Follow references to meetings or written decisions.

This category can contain deliberation that never entered a formal document.
Casual suggestions do not necessarily record a decision.
Note inaccessible private conversations, archived records, and retention limits.

Return thread references, participants, dates, quotes, and enough context to interpret them.

## Infrastructure telemetry and incidents

Inspect relevant service dependencies, metrics, alerts, dashboards, logs, traces, and incident timelines.
Use bounded dates around the change.
Prefer focused queries and compact summaries over large raw data exports.

Check units, thresholds, environments, and release dates.
A metric's existence shows that someone measured a condition, not why particular code exists.
A before-and-after change can have several causes.
Check nearby deployments and telemetry changes before you attribute an effect.

Return record identifiers, queries, time ranges, measurements, and links to documented decisions.

## Error history and releases

Search exception types, error strings, stack traces, target symbols, and affected releases.
Inspect representative events, first and last occurrence, frequency, comments, and release records.

Check whether traces actually reach the target code.
Account for event samples, retention limits, and changes in error groups.
A resolved status does not prove a code fix.
A release contains several changes; an error's disappearance does not identify the cause by itself.
Treat automated root-cause summaries as hypotheses, not primary evidence.

Return error identifiers, event dates, affected releases, counts, relevant trace excerpts, and author notes.

## Product analytics and data lineage

Find relevant usage, cost, experiment, feature-flag, and data-pipeline records.
Inspect actual schemas before you choose tables or fields.
Use read-only queries with bounded dates.
Prefer verified, deduplicated data sources and aggregate results.

For thresholds, inspect distributions and recorded selection criteria.
For experiments, inspect exposure, outcomes, and the documented decision.
For migrations, inspect dependencies and upstream changes.

Check duplicates, data refresh delays, schema changes, retention, and altered instrumentation.
An event count change can reflect a measurement change rather than different user behavior.
A percentile that matches a constant suggests a connection; it does not prove the choice.

Return source identifiers, exact queries, date windows, compact results, and links to decision records.

## Incident context across categories

For guards, retries, timeouts, fallbacks, and resource limits, search for incident history across relevant categories.
Find the full postmortem and its corrective actions.
Connect incident, issue, review, and release identifiers where possible.

An explicit corrective action tied to the target can establish documented intent.
An error decrease after a release only supports a hypothesis unless other evidence establishes the connection.

## Evidence notes

For each category, retain:

- Queries, records read, date bounds, and access limits.
- Direct statements, with quotes, citations, authors, and dates.
- Indirect evidence, its possible implications, and alternative interpretations.
- Contradictions, with both citations.
- Empty results and missing records.
- Leads that require another source.

Keep these notes factual before you form the final account.
