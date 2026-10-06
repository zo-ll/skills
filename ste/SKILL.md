---
name: ste
description: >-
  Write explanations in ASD-STE100 Simplified Technical English, the controlled
  language from aerospace maintenance manuals: short sentences, one instruction
  per sentence, active voice, one word one meaning. Default is full STE (100%):
  the writing rules plus the approved-word rules. Use on "ste", "simplified
  technical english", "asd-ste100", "explain plainly", "make this readable",
  "100% ste", or when the user asks to rewrite text so it is easier to read.
metadata:
  purpose: personal host-agent skill
  version: "1.0.0"
---

# STE

Write so a tired reader understands on the first pass, with no way to
misread it. Apply this to your own explanations, or rewrite text that the user gives you.

## Levels

- `full` / `100%` (default): use the writing rules below and the approved-word
  rules. Use each word with one meaning only, and use only the approved parts
  of speech.
- `lite` / `80%`: use the writing rules only. Use normal vocabulary, but
  prefer the simplest common word. Use this level only when the user asks for it.

The user can set the level with words like "ste lite" or "full ste". If no
level is given, use full.

## Writing rules

**Sentences**
- Procedural sentence (an instruction): 20 words maximum.
- Descriptive sentence: 25 words maximum.
- Write one instruction per sentence. If two actions happen together, put
  them in one sentence.
- Write instructions in the imperative ("Run the migration.").

**Verbs**
- Use the active voice. Use the passive only in descriptive text, and only
  if you do not know who or what does the action.
- Use only these tenses: simple present, simple past, simple future, the imperative.
- Use the past participle only as an adjective ("the cached value").
- Do not use -ing forms as verbs or nouns ("Caching the result is…" becomes
  "When you cache the result…").
- Do not use phrasal verbs ("set up" → "configure", "find out" → "find").

**Words**
- One word = one meaning. If you use "start" for a process, do not also use
  "launch", "boot" or "spin up" for the same thing.
- Keep the same name for the same thing everywhere. Use the exact identifier
  for code symbols.
- Noun clusters: three words maximum. "user session token refresh handler"
  becomes "the handler that refreshes the session token".
- Keep articles ("the", "a"). Do not drop them in telegraphic style.
- Do not use contractions or idioms. Do not use words that weaken a
  statement ("basically", "simply", "just", "quite").

**Structure**
- Descriptive paragraph: one topic, six sentences maximum.
- Put the main point in the first sentence of the paragraph.
- Use numbered lists for a sequence of steps, and bullet lists for
  items that have no order.
- Put a warning or caution before the step it applies to, never after.
  Start with the command, then give the reason:
  `WARNING: Do not run this on main. It rewrites published history.`
- Give the conditions before the action: "If the test fails, read the log."

## Approved-word rules (full)

Use these replacements:

| Do not use | Use |
|---|---|
| utilize, leverage | use |
| commence, initiate | start |
| terminate | stop |
| ensure | make sure |
| prior to | before |
| subsequent to | after |
| in order to | to |
| approximately | about |
| sufficient | enough |
| facilitate | help |
| a number of | some / [count] |
| it is necessary to | you must |

Use "can" for ability and "must" for obligation. Do not use "should" for
obligation.

## Output

- Do not announce the mode. Give only the text.
- Do not add a summary that repeats the text.
- If the source is ambiguous, do not make up a meaning. Add one line
  `NOTE: The source does not say whether X or Y.` and continue.
- Keep code blocks, identifiers, commands and quoted errors exactly as they are.
