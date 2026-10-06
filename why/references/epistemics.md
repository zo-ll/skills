# Evidence and confidence

Historical evidence does not automatically establish intent.
Use these tiers for each claim, not one confidence label for the entire answer.

## Direct

A source explicitly states a reason for the target decision.
Examples include a review description, decision record, author comment, or incident corrective action.

State the reason plainly and cite the exact source.
Example: "[Direct] The cap follows the upstream limit. The author states this in the review: <citation>."

An explanatory code comment can state intent.
Executable code alone cannot.
A direct statement documents someone's account; it does not prove that account was accurate or that the change achieved its goal.

## Supported

Several independent pieces of indirect evidence point to the same explanation.
No single record states the full rationale.
Name what each source contributes.

Example: "[Supported] The evidence points strongly to large-input failures: the issue report, review discussion, and added regression test. <citations>"

Do not count a document and its copied summary as independent evidence.
Check whether a competing explanation fits the same records.

## Inferred

The context supports a reasonable interpretation, but it does not establish the rationale.
Use "suggests", "appears", or "likely".
Show the step between the evidence and the claim.

Example: "[Inferred] The incident date and urgent release suggest a corrective change. Neither record explicitly connects the decision to the incident. <citations>"

Do not use author-intent language such as "the team decided" for an inference.

## Speculative

A hypothesis is possible, but the evidence is weak or several accounts fit equally well.
Label it as a possibility.
State what evidence would distinguish it from alternatives.

Example: "[Speculative] The threshold could reflect a service commitment, but no accessible commitment document confirms this."

A useful hypothesis guides the next search.
It does not replace an answer.

## Unknown

The relevant record does not answer the question, or you cannot access it.
State the question, sources, queries, time range, and limitation.

Example: "[Unknown] No threshold rationale appeared in the six target reviews or the issue search for <terms>."

Distinguish "no result within this search" from "no record exists".
Missing access or expired retention is not evidence of absence.

## Prevent a false account

- Do not assume a design was correct and invent a reason that makes it sensible.
- Do not assume a repeated pattern was deliberate; it could originate from copied code.
- Do not confirm the user's hypothesis without an independent evidence check.
- Do not confuse timing correlation with causation.
- Do not confuse a proposed design with the final decision.
- Do not confuse a stated reason with proof that the change worked.
- Do not discard an inconvenient source to make the account more coherent.
- Do not attribute intent from executable code alone.

If records disagree, cite both.
Dates, scope, or later changes can explain the difference, but that explanation also needs evidence.

## Language check

Use causal or author-intent language only when the cited evidence supports it.
Examples include "because", "the reason", and "the team decided".
For Supported claims, make the derived nature explicit.
For Inferred claims, use qualified language and show the evidence chain.
For Speculative claims, state the lack of confirmation.

Avoid "obviously", "clearly", and dismissive descriptions.
Specific uncertainty is better than vague caution.

Before the answer, check each claim's tier, citation, and wording.
Keep strong evidence strong.
Keep weak evidence visibly weak.
