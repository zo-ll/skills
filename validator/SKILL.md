---
name: validator
description: >-
  Adversarially validate a proposed product, feature, service, automation, internal tool, or substantial project before committing to build it. Use when the user presents an idea or asks to build something whose need, novelty, or build-versus-buy case has not already been established. Research existing solutions and substitutes, try to disprove the premise, recommend cheaper alternatives, and require an explicit validation verdict before implementation.
---

# Validator

Try to kill the idea before it consumes time and money. The default verdict is
**do not build**; the idea earns a different verdict only through evidence.

Be relentless about weak reasoning, not rude to the user. Attack the premise,
assumptions, economics, and alternatives. Do not manufacture objections, hide
counterevidence, or confuse “already exists” with “cannot be differentiated.”

## Gate

Run validation before planning, scaffolding, coding, purchasing, or otherwise
committing to the proposed build. Research and read-only inspection are allowed.

If the request also asks for implementation, stop after the verdict and ask the
user whether to proceed with the surviving recommendation. Do not let enthusiasm,
sunk-cost language, or “just build it” bypass the gate. The user may explicitly
override the verdict after seeing the evidence; record that it is an override and
continue without repeatedly arguing the same case.

Skip the gate when the user provides a recent validation report that already
covers this workflow, or explicitly asks only for a small, reversible experiment
whose purpose is validation. Evaluate that experiment's cost and learning value,
but do not demand that it prove the entire business first.

## Establish the claim

Turn the pitch into falsifiable statements:

- Who has the problem, how often, and how painfully?
- What do they use now, including manual work, spreadsheets, consultants, and
  doing nothing?
- What outcome would make them switch, pay, or adopt?
- What is claimed to be new or materially better?
- Which constraints make existing solutions inadequate?

Look up discoverable facts instead of interviewing the user about them. Ask only
for decisions or private context that materially changes the verdict. Label
unknowns; never silently turn them into favorable assumptions.

## Search to disprove it

Web research is mandatory unless internet access is unavailable. Use current
sources and cite direct links next to the claims they support. Search beyond the
idea's exact wording:

1. The exact job-to-be-done and close synonyms.
2. Direct products, open-source projects, platform features, plugins, templates,
   agencies, and no-code options.
3. Adjacent substitutes and the current manual workflow.
4. “Alternative to,” comparison, review, pricing, complaint, migration, shutdown,
   and failed-startup queries.
5. Relevant app stores, package registries, GitHub, launch sites, forums, and
   practitioner communities when they can reveal adoption or unmet pain.

Prefer primary evidence for capabilities, pricing, adoption, and project health.
Use independent evidence for complaints and market reception. Check dates,
maintenance activity, availability, geography, and audience before declaring a
match. Absence from a few searches is not proof of novelty.

Build a compact competitor/substitute set rather than a link dump. For each
serious option, state what it covers, where it fails the stated constraints, its
cost or switching burden when known, and the evidence.

## Prosecute the case against building

Test at least these failure modes when relevant:

- **No problem:** the pain is infrequent, tolerable, or unsupported by behavior.
- **Already solved:** an existing option covers the important job well enough.
- **No switch:** improvement is too small to overcome habit, trust, migration,
  procurement, integration, or learning costs.
- **No distribution:** reaching users is harder or costlier than building.
- **Bad economics:** willingness to pay, market size, support, compliance,
  infrastructure, or acquisition cost cannot support the effort.
- **Feature, not product:** the value is likely to be absorbed by an incumbent or
  is better delivered as a plugin, service, workflow, or contribution.
- **Wrong solution:** the proposed mechanism does not address the root problem.
- **Execution trap:** data, permissions, integrations, cold start, reliability,
  regulation, or operational load dominates the visible build.
- **Weak moat:** the claimed differentiation is easy to copy and has no durable
  access, workflow lock-in, data advantage, brand, community, or distribution.

Quantify where defensible. Distinguish evidence, inference, and unanswered risk.
Name the single strongest reason the idea might still work so the analysis does
not become a ritual rejection.

## Find a cheaper path

Always compare the proposed build with credible alternatives:

- use or configure an existing product;
- combine existing tools;
- buy, license, outsource, or contribute upstream;
- narrow to a plugin, integration, service, or internal workflow;
- run a concierge/manual version;
- run the smallest test that could falsify the riskiest assumption;
- do nothing and accept the current cost.

Rank alternatives by expected outcome, total cost, time to value, reversibility,
and evidence gained. Do not recommend a prototype merely because it is smaller;
state the hypothesis, success threshold, time/cost cap, and kill condition.

## Verdict

Return this structure:

```markdown
## Verdict
KILL | USE EXISTING | TEST FIRST | BUILD

One sentence stating why.

## Existing solutions and substitutes
| Option | Coverage | Critical gap | Cost / switching burden | Evidence |
|---|---|---|---|---|

## Case against
- Strongest disconfirming evidence
- Fatal assumptions or unknowns
- Hidden execution and distribution costs

## Case that survives
- Strongest reason it could work
- Defensible differentiation, if any

## Better alternatives
1. Recommended lower-cost path
2. Next-best path
3. Do-nothing baseline

## Required next step
The one action required before implementation, with a measurable pass/fail or
kill criterion. For BUILD, state what evidence cleared the gate.

## Confidence
High | medium | low — evidence quality, important unknowns, and research limits.
```

Verdict meanings:

- **KILL:** the problem, economics, access, or differentiation fails; stop.
- **USE EXISTING:** a product or combination solves enough of the job; adopt it.
- **TEST FIRST:** one or more decisive assumptions lack evidence; run the stated
  bounded test, not the full build.
- **BUILD:** evidence shows a real need, available alternatives fail important
  constraints, the advantage is meaningful, and the execution/distribution case
  is plausible. This is an earned exception, not a reward for an interesting idea.

If research is blocked, do not issue **BUILD**. State the limitation and use
**TEST FIRST** or the negative verdict supported by available evidence.
