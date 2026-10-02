---
name: diagram
description: >-
  Explain something with a diagram instead of prose: flows, architectures,
  sequences, state machines, data models, dependency graphs, before/after
  diffs. Picks the diagram type from the shape of the content, renders to
  Mermaid or SVG, and opens it. Use on "diagram", "draw this", "visualize",
  "show me how X connects", "sketch the architecture", "explain with a
  picture", or when an explanation has more than ~5 interacting parts.
metadata:
  purpose: personal host-agent skill
  version: "1.0.0"
---

# Diagram

A diagram is worth making when the reader has to keep relationships in
their head: what calls what, what happens in what order, what owns what. If the
answer is a single fact or a short list, do not draw it. Say so and answer in
text.

## 1. Read the shape, pick the form

| Content shape | Form |
|---|---|
| Steps with branches | flowchart |
| Messages between actors over time | sequence diagram |
| Things with states and transitions | state diagram |
| Entities and relations | ER diagram |
| Components and data flow | architecture boxes + arrows |
| What depends on what | directed graph (left→right) |
| Change over time / phases | timeline |
| Options vs. criteria | matrix/table (not a diagram) |
| Before vs. after | two panels, same layout, differences highlighted |

If the content has two shapes (for example, an architecture plus one request
through it), draw two small diagrams. Do not draw one large diagram.

## 2. Ground it

Diagram the real thing. If it concerns code, read the code first. Each node
must map to a real file, function, service or table. Use real identifiers as
labels. If you infer an edge instead of seeing it, draw it dashed and
mark it "inferred".

## 3. Draw rules

- 15 nodes maximum per diagram. If there are more, group the nodes into
  subgraphs or split the diagram.
- Label every edge with a verb or the data it carries ("POST /login", "emits
  OrderPaid"). An unlabeled arrow is a guess.
- Use one direction of flow (TB or LR). Avoid crossing edges.
- Use at most 3 colors, and only to encode meaning (for example: changed / new / external).
  Add a legend if you use color.
- Give a title that states the claim, not the topic: "Auth tokens refresh in
  the gateway, not the client" beats "Auth flow".

## 4. Render

Choose by environment:

1. **Inline Mermaid** (default in a terminal or chat): output a ```mermaid
   block. Most viewers render it, and it is readable as plain text.
2. **File** (when the user wants to look at it, or the diagram is dense): write
   a standalone HTML file that loads Mermaid from a CDN
   (`https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js`). Make it
   work in dark and light mode. Use hand-written SVG instead when the layout matters
   more than Mermaid's auto-layout permits (panels, annotations, callouts).
   - Write to the session scratchpad dir if one exists, else `./diagrams/`.
   - Open it. On WSL: `explorer.exe "$(wslpath -w <file>)"`. On macOS: `open`.
     On Linux: `xdg-open`.
3. **Artifact**: if the host has an artifact/publish tool and the user wants
   to share it, publish the HTML file.

`mmdc` (mermaid-cli) can produce a PNG/SVG if it is installed. Do not install it
unless the user asks.

## 5. After the diagram

Write at most 3 lines of text: what to look at first, and the one thing that the
diagram cannot show (a timing issue, a race, a config flag). Do not narrate the
diagram node by node.
