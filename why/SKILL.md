---
name: why
description: >-
  Investigate why code or a design decision has its current shape. Use for
  "why does X work this way", "why did we pick Y", design rationale, tradeoffs,
  regression history, defensive code, incident context, and the origin of
  thresholds. Search historical evidence, cite sources, and separate
  documented intent from inference. Use how for implementation and runtime flow.
license: MIT
---

# Why

Reconstruct the forces that shaped the code.
Do not replace missing history with a plausible explanation.

Code shows behavior, not the reason someone chose that behavior.
Motivation can exist in commits, reviews, issues, documents, conversations, and operational records.
Those records can be incomplete, outdated, or contradictory.
An honest unknown is more useful than false certainty.

Use `how` for implementation and runtime flow.
Keep historical rationale separate from whether the current design is still appropriate.

Read [references/epistemics.md](references/epistemics.md) before you assess the evidence.
Use [references/evidence-sources.md](references/evidence-sources.md) to guide source searches.

## Establish the question

Identify the target: code, pattern, feature, constant, or named decision.
Identify the question: rationale, tradeoff, edge case, constraint, regression, or history.

If the target is vague, state your interpretation from the conversation.
Ask only when ambiguity prevents a useful investigation.
Treat a hypothesis in the user's question as a candidate, not a conclusion.

## Establish a code anchor

1. Read enough code to identify the exact target.
2. Record relevant file paths, line ranges, symbols, constants, and error strings.
3. Inspect available history for the target's introduction and substantive changes.
4. Record commit identifiers, review references, linked issues, authors, and dates.
5. Use those identifiers as search seeds across other sources.

Do not stop at the last change.
The current design can combine decisions from several earlier changes.
If history is absent, shallow, or inaccessible, record the limitation.
Do not assume that source control or a remote review service is available.

## Establish source coverage

Check which evidence sources are accessible through local files, commands, APIs, search tools, or supplied records.
Access does not require a particular integration.

Account for these categories:

- Source control, reviews, comments, and tests.
- Issues and requirements.
- Design documents and decision records.
- Team conversations.
- Infrastructure telemetry and incident records.
- Error history and release records.
- Product analytics, experiments, and data lineage.

For each category, record one status:
**searched**, **unavailable**, **not relevant**, or **not searched within scope**.
Give a concrete reason for each category that you do not search.
An empty result differs from an unavailable source.

Start with sources tied directly to the code.
Search additional relevant categories before you treat the first explanation as complete.
A narrow question can stop when direct evidence answers it and further searches would be redundant.
State that limit; do not claim exhaustive coverage.

Independent source searches can run in parallel or use delegated investigators when available.
Delegation is optional.
Keep evidence collection separate from conclusions, even when one agent performs both.

## Collect evidence

1. Search broadly with identifiers, domain terms, error strings, and wording variants.
2. Narrow searches by author, component, and dates when useful.
3. Read relevant records and threads in full, not only their titles.
4. Follow links to decisions, parent issues, earlier changes, and incident reports.
5. Capture exact quotes when the wording matters.
6. Record each citation, author, date, and connection to the target.
7. Preserve conflicting evidence and alternative interpretations.
8. Record search queries, date limits, empty results, and access limits.
9. Pursue cross-source leads or mark them as unresolved.

Keep the investigation read-only.
Do not modify code, post messages, or change external state.

For defensive code, examine incident history and corrective actions.
For a numeric threshold, examine external limits, documented commitments, measurements, and experiments.
A matching metric or date is evidence of correlation, not proof of intent.

## Assess the evidence

Deduplicate records that repeat the same original claim.
Repeated copies are not independent confirmation.

Classify claims as **Direct**, **Supported**, **Inferred**, **Speculative**, or **Unknown**.
Explain the evidence chain for derived claims.
Check citations that determine the answer.
Resolve contradictions only when evidence supports a resolution.
Otherwise, present both accounts.

Do not infer motivation from function names, code style, or present-day usefulness.
Do not treat a plan as proof of the implementation or a successful outcome.
Do not treat a recent explanation as the original rationale without date checks.

## Present

Scale the length to the question, but preserve the separation between evidence and inference.

- **Question and target:** the question, symbols, and file:line references.
- **What we found:** Direct and Supported claims, with adjacent citations and appropriate confidence language.
- **What we infer:** Inferred claims, with explicit evidence chains.
- **Competing hypotheses:** plausible alternatives, evidence for each, and missing or contrary evidence.
- **What we do not know:** unanswered questions and specific search or access limits.
- **Sources consulted:** one line per category, with searches or the reason for no search.
- **Confidence:** which parts have strong evidence and which remain uncertain.

Omit empty inference or hypothesis sections.
State when the relevant evidence answers the question without a known gap.
Never invent a gap merely to match the format.

If the user intends to change the code, translate the evidence into:
**Preserve**, **Change**, **Avoid**, and **Risk** constraints.
Distinguish documented obligations from inferred constraints.
Do not implement the change unless requested.

## Final check

Make sure every factual rationale claim has a citation.
Make sure each inference or hypothesis has an explicit label.
Retain contradictions, coverage limits, and uncertainty.
The goal is a useful account of the evidence, not a decisive-sounding story.

## Source

Adapted from [pstack's why skill](https://github.com/backnotprop/pstack/tree/124f622bcaeac490e7e9dac6af83f3ef9611d554/skills/why).
Copyright (c) 2026 Lauren Tan. See [LICENSE](LICENSE).
