---
name: how
description: >-
  Explain how code works: subsystem architecture, runtime flow, data changes,
  ownership, and boundaries. Use for "how does X work", code walkthroughs,
  "where should this live", "which package owns this", and "is this the right
  layer". Build a mental model from the implementation before a change.
  Use why for historical motivation and design rationale.
license: MIT
---

# How

Explain the implementation well enough for a reader to work in the subsystem.
Build a mental model, not an annotated copy of the source.

Code names and documentation can mislead.
Trace the implementation before you explain it.
Keep observed behavior separate from historical intent.
Use `why` when the question concerns the reasons behind a decision.

## Scope and effort

If the target is ambiguous, state your interpretation from the conversation.
Ask for clarification only when different interpretations would materially change the answer.

Use a direct pass for a function, utility, or narrow module question.
For a subsystem, divide the exploration into distinct angles:
entry points, data flow, state, dependencies, or ownership.
Use only the angles that the question needs.
When in doubt, use the direct pass.

Independent angles can use parallel searches or delegated exploration when available.
Neither delegation nor a particular tool is required.
Keep one coherent explanation regardless of how you collect the evidence.
Do not modify code or external state.

## Explore

1. Find the entry point: user action, request, event, job, or direct call.
2. Read the implementation rather than infer behavior from names.
3. Trace each relevant call through the actual execution path.
4. Identify inputs, outputs, data transformations, and state changes.
5. Read the definitions of the central types and abstractions.
6. Identify boundaries between modules, services, storage, and external systems.
7. Check configuration, conditional branches, and error paths that materially affect the answer.
8. Read relevant tests to confirm expected behavior and edge cases.
9. Record exact symbols and file:line references for each important claim.
10. State any path or connection that you cannot verify.

Continue until you can explain the relevant flow without an unsupported connection.
Do not expand into unrelated code merely to produce a larger map.

For a placement question, inspect existing responsibility and dependency direction.
Distinguish the current owner from your recommended owner.
Explain the recommendation through the existing boundaries, not a hypothetical architecture.

## Evidence notes

For a broad question, collect these notes before you compose the answer:

- **Components:** name, location, and responsibility.
- **Flow:** trigger, ordered calls, branches, and data at each boundary.
- **Ownership:** which component owns each responsibility and state value.
- **Boundaries:** inputs, outputs, dependencies, and external contracts.
- **Files read:** the files that support the explanation.
- **Gotchas:** surprising behavior and important constraints.
- **Open questions:** anything you could not trace.

If separate explorations overlap, merge duplicate facts.
If they disagree, check the implementation before you choose an account.
Preserve unresolved differences as open questions.
Historical rationale requires its own evidence; do not invent it from a code pattern.

## Explain

Use the sections that help answer the question.
A narrow answer does not need every section.

### Overview

State what the subsystem does and its role in the larger system.
Describe its purpose without an unsupported claim about author intent.

### Key concepts

Define only the types, services, and abstractions that the reader needs.

### How it works

Explain the flow from its trigger to its result.
Include important branches, state changes, and failure paths.
Use concrete symbols: "`UserService` calls `AuthClient.refresh()`", not "the service delegates".

Use prose with precise file references.
Include a small code excerpt only when it clarifies a specific point.
Use a diagram when component interactions or data stages are difficult to explain in prose.

### Where things live

Give a short map of the relevant files, directories, and responsibilities.
For placement questions, state the recommended location and its boundary constraints.

### Gotchas and open questions

State surprising behavior, constraints, and limits of the explanation.
Do not hide gaps behind a complete-looking diagram.

## Final check

Make sure the answer covers the original question.
Check that important flow claims have implementation references.
Separate facts about the current code from recommendations.
Remove detail that does not help the reader understand or work in this area.

## Source

Adapted from [pstack's how skill](https://github.com/backnotprop/pstack/tree/124f622bcaeac490e7e9dac6af83f3ef9611d554/skills/how).
Copyright (c) 2026 Lauren Tan. See [LICENSE](LICENSE).
