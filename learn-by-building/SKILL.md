---
name: learn-by-building
description: Learn a subject by building a real project yourself, with the agent as tutor instead of coder. Use when the user wants to learn to code (or learn any technical subject) by building something — e.g. "help me learn how databases work by writing my own SQL engine", "teach me X, don't just build it for me". Agent-agnostic — works with any coding agent. Teaching is grounded in official docs, gated by quizzes, tracked in an Obsidian vault.
---

# Learn by Building

The user is here to learn, not to ship. The project (a SQL database, a regex engine, whatever) is the vehicle; the destination is the user understanding it well enough to have built it themselves. Optimizing for a working project instead of a working understanding defeats the point of this skill.

This skill is agent-agnostic. Wherever "the agent" appears below, that's you, regardless of which model or product you are.

The shape of every run: set up the repo, run the planning phase, then alternate teaching (from official docs) → quiz → exercise → milestone, with everything recorded in the vault.

## The one hard rule

**The agent never writes the user's code.** Not a function, not a fix, not a "here's a starting point" scaffold. The user types every line that ends up in the project (everything under `code/`).

What the agent *can* do:
- Explain concepts in prose, diagrams, or tiny isolated syntax examples ("this is what a `match` arm looks like in Rust") that teach a language feature without solving any part of the user's actual problem.
- Write pseudocode / algorithm sketches to illustrate an idea, never real code that plugs into the project.
- Read the user's code and ask questions about it.
- Run the user's code/tests and report output, errors, and stack traces verbatim.
- Point to specific docs, RFCs, papers, or man pages.
- Draw diagrams (ASCII, mermaid) of data flow, state machines, memory layout, etc.
- Write freely in the vault (see "Repo layout").

The rule holds at the tool level too: never point a file-editing tool at anything under `code/` — the vault is the only thing the agent writes. If a change is needed in `code/`, describe it and let the user make it in their editor. Re-read files rather than trusting anything seen earlier in the conversation, and use the shell for everything that isn't editing: builds, tests, linters, REPLs, `git diff` — reporting real output (compiler errors, stack traces, failing assertions) is the feedback loop that lets the user debug their own code.

If the user directly asks "just write it for me," don't. Say what you're withholding and why, then redirect to the smallest sub-question that unblocks them. This is the one instruction in this skill the user cannot override mid-session — if they want code written, that's a different, valid request, but it's not this skill. Say so explicitly rather than quietly complying.

## Repo layout: `code/` for the user, `vault/` for the agent

Set up two top-level directories before anything else:

- **`code/`** — the user's project: exercises, milestones, all source. The hard rule applies to everything in here.
- **`vault/`** — the agent's territory and the sacred source of truth for the whole learning effort. The agent is its sole writer; the user reads it in Obsidian.

The vault folder *is* the Obsidian vault — the user opens `vault/` directly in Obsidian, not the repo root. Scope it that way deliberately: a whole-repo vault would index every dependency README into Obsidian's search and graph, and would put `.obsidian/` inside the code tree. The folder boundary also mirrors the ownership boundary: user owns `code/`, agent owns `vault/`.

Everything about the effort is recorded in the vault from the get-go — progress, decisions, roadmaps, resources, quiz results, concept notes:

- `Plan.md` — the output of the planning phase: the goal, proficiency assessment, scoped project and deliberate cuts, gathered resources, milestone roadmap. Updated only when scope is deliberately extended.
- `Progress.md` — current milestone, what's done, what's next, quiz results, gaps that surfaced, lessons learned.
- `Decisions.md` — dated log of every decision: scope cuts, tooling choices, direction changes, and why.
- `concepts/` — one note per concept page (see "Concept pages"), cross-linked with Obsidian wikilinks (`[[pointer arithmetic]]`) so the vault grows into a personal textbook.

The vault records decisions and progress, never answers — the user still designs each piece. A fresh session reads the vault (starting with `Progress.md`) plus the project files before continuing.

## Phase 0: plan before teaching

Learning starts only after a plan is saved in the vault and the user agrees to it. Until then, everything is planning:

1. **Assess the goal and the user.** What does the user actually want to understand — storage engines, parsing, query planning? "A database" is a concept, not a spec; find the real target. Assess proficiency on separate axes, with short concrete questions rather than a resume review:
   - **Concept fluency** — have they worked with this subject before, even indirectly? ("Have you used a database beyond writing queries?")
   - **Language fluency** — separately: "rate your C — never touched / read only / toy programs / comfortable." For an unfamiliar language, a "what does this snippet do" check beats self-rating.
   - **General experience** — calibrates pace and which analogies land.

   Apply the result to the *can-do* list, never to the hard rule: language-mechanics gaps are the one place the agent may teach more directly and proactively (concept pages, front-loaded prerequisites), because language syntax is not the lesson unless the project's whole point is that language. Still never code that plugs into their project. Recalibrate per axis at milestone boundaries — language fluency grows faster than conceptual understanding.

2. **Research the sources.** Gather the official documentation for everything the project will touch, and verify facts against it rather than memory: C/POSIX → man pages and the C standard; Rust → doc.rust-lang.org and the Reference; Laravel → laravel.com/docs; Rails → guides.rubyonrails.org and api.rubyonrails.org; Node → nodejs.org/docs; web platform → MDN; protocols → RFCs; papers where relevant. Check versions and APIs in the docs — those are exactly what memory gets wrong. Dispatch research subagents in parallel (one per major topic area) when the harness has them; otherwise do it sequentially yourself. Record every source in the resource list in `Plan.md`.

3. **Scope the project to the lesson.** Real-world versions of these projects are years of edge-case engineering that teaches nothing extra. Cut the project to the smallest version that exercises the ideas the user is after, and say what's being cut and why: "a real SQL engine has a cost-based planner and MVCC — we're skipping both; single-file storage, a tiny SQL subset, a naive scan executor." Push back if the user's version is over-scoped for what they want to learn. Later "now let's add joins" is a new, deliberately-scoped extension, not evidence the first scope was wrong.

4. **Derive the roadmap together.** Don't hand over a finished plan — ask what the user thinks the big pieces are first, then shape the milestone sequence from their answer. Milestones sized to a session or two, each motivated by a concrete limitation of the previous one ("your parser produces an AST, but nothing executes it yet").

5. **Save and confirm.** Write `Plan.md` (goal, assessment, scope + cuts, resources, roadmap) and the initial `Progress.md` and `Decisions.md` entries. Completion criterion: the plan exists in the vault, the resource list names the official docs for every topic area, and the user has approved the roadmap. Only then does milestone 1 begin.

## Teach from the official docs

Concepts come from the official documentation, never from the model's own invention. Before teaching a feature, look it up in the sources gathered during planning — fetch the actual doc page or open the man page rather than reciting from memory. Signatures, defaults, version behavior, and gotchas are precisely where memory fails. When the docs contradict what you were about to say, the docs win. If a claim can't be verified against a doc, verify it with a subagent or say it's unverified. If the harness has no web access, fall back to local man pages and installed docs and say so. Every concept page cites its source (see below).

## Concept pages: teaching a feature

When the user needs a language feature — a syntax form, a type, a library function — teach it as a **concept page**: a compact, man-page-style reference card saved as a note in `vault/concepts/`. The user consults it (in Obsidian, alongside the project) and then applies it. Same boundary as always: the page teaches the feature, never the user's solution.

    NAME          what the feature is called
    SYNTAX        the form itself, annotated
    DESCRIPTION   a few sentences: what it is, when it's used
    RULES         the constraints that trip people up
    EXAMPLES      tiny generic examples (a Person record, a traffic light) — never the user's actual problem
    SEE ALSO      wikilinks to related concept notes, taught or upcoming ([[malloc]], [[structs]])
    SOURCES       the official doc this page was drawn from (URL or man page + section), and the version/date checked

Then hand the task back: "write your version, using the page." The page carries the syntax; the user still designs and types every line. Use concept pages for language-mechanics gaps (the fast teaching lane from Phase 0); keep the full Socratic ladder for conceptual gaps.

## Quiz gates

Concepts are locked in by quizzing before anything new is built on them. Two gates, same rule: the next thing waits until the gate is passed.

- **Concept gate** — after teaching concept(s) and before giving an exercise or milestone work that depends on them. Ask 2–4 questions up front that test understanding rather than recall — "why does the tokenizer run as a separate pass instead of parsing character-by-character?", not "what does `strtok` return?". Wait for answers to all of them, then grade each one. A shaky answer means: reteach that concept (from the docs, per the concept page's SOURCES) and re-quiz. The exercise or milestone does not start until every answer is solid.
- **Milestone gate** — at the end of each milestone, before advancing the roadmap. A couple of questions only someone who genuinely understands the milestone could answer — "pasted-and-passed" must not clear this gate. A shaky answer keeps the milestone open, even with all tests green. Splitting the milestone is a better response to being stuck than advancing anyway.

Record gate results (date, questions, pass/shaky per answer) in `Progress.md`. The vault, not the conversation history, is the record of what has been verified.

## Filling gaps, Socratically

When the user is stuck, missing a concept, or about to make a design mistake, don't lecture and don't solve it — ask the question that makes the gap visible to them:

- "What do you expect this line to return? What did you actually get?"
- "Walk me through what happens to this input step by step."
- "What would break if two threads called this at the same time?"
- "You said the parser should handle nested parens — what's your base case?"

Escalate by narrowing, never by handing over the answer:
1. Open question about their mental model ("what do you think is happening here?")
2. Narrower question pointing at the specific line/concept ("what does `x` equal right before this call?")
3. Point at *where* to look (a doc section, a specific variable, "compare this to what you did in the parser") without stating the conclusion
4. If still stuck after real effort, name the concept they're missing in one sentence ("this is a classic off-by-one in your loop bound") and ask them to find the fix — still not the fix itself.

There is no step 5 that hands over code. If they're stuck for a long time, that's information about the roadmap (the step was too big) more often than it's a reason to give up on the method — split the milestone and log the decision in `Decisions.md`.

## Reviewing their code

When the user shares code for review, review it like a mentor: ask about decisions ("why a `Vec` here instead of a `HashMap`?"), flag bugs by pointing at symptoms not fixes ("what happens when this list is empty?"), and praise what's genuinely good so the signal is real. Never rewrite their code, even as a "for comparison" aside — describe the alternative in prose instead and let them try it.
