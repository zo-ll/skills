---
name: writing-vue
description: >-
  Write or review clean, maintainable Vue 3 using lessons from vuejs/core, VueUse, Element Plus, Directus, koel, and the official Vue docs and style guide. Use for Vue applications and components: composition API, components, props and events, state, templates and styles, forms, performance, testing, and Vue code review. Pairs with writing-laravel for Laravel + Vue applications.
---

# Writing Vue

Write Vue 3 that follows the composition API and the framework's intended data
flow, stays testable, and is unsurprising to a Vue developer. Draw lessons from
the framework, its reference libraries, and real applications without copying
any one project's conventions mechanically.

## Read what maps

Read only the section that maps to the change; a small slice needs one section,
not the whole file.

- components, props, events -> Composition API idioms, Components
- state, shared data -> State and data flow
- templates, styles, forms -> Templates and styles
- performance, large lists -> Rendering and performance
- tests -> Testing
- reviewing a PR -> Review in risk order

## Start with the codebase

Before changing code:

1. Read repository instructions, `package.json`, src entry, routes, and tests.
2. Determine the Vue version and TypeScript setup, Vite/build tool, ESLint and
   Prettier config, test commands (Vitest), and state and router libraries.
3. Preserve established conventions unless they cause a concrete correctness or
   maintainability problem. For new projects, choose the simplest structure
   that fits the expected size.

## Composition API idioms

- Prefer `<script setup>` and the composition API. Keep setup blocks readable:
  props first, then state, derived values, and functions.
- Use `ref` for primitives and single values, `reactive` for object-shaped
  state, `computed` for derived state. Never derive state with watchers.
- Prefer computed over watch. Use watchers for side effects (persistence,
  sync, refetch) and nothing else. Mind `watch` options: flush, deep, immediate.
- Use typed `defineProps` and `defineEmits` so contracts are checkable. Expose
  template refs and `defineExpose` only when a parent genuinely needs them.
- Keep composables named after the concept (`useOrders`) and bound to one
  responsibility, like components.

## Components

- One component, one job: presentational components render props and emit
  events; containers own state and data fetching.
- Split components when they outgrow a scroll of template and logic, by
  responsibility, not by convenience.
- Never mutate props. Communicate changes by emitting events or through
  v-model; let the parent own the state.

  ```ts
  // Incorrect: child mutating a prop changes parent state behind its back
  const props = defineProps<{ items: string[] }>()
  props.items.push('new')

  // Correct: emit, and let the parent own the state
  const emit = defineEmits<{ added: [item: string] }>()
  function add() { emit('added', 'new') }
  ```

- Use `provide`/`inject` sparingly for shared context, not as a global state
  stash. Prefer slots over prop drilling when structure is what varies.
- Keep dependencies injected and out of components so components stay
  testable.

## State and data flow

- Keep data flow one-way: server state in a fetch layer, shared UI state in
  Pinia, ephemeral state local to the component.
- Derive everything you can. Cached derived state from computed beats state
  you must remember to update.
- Treat Pinia stores like modules: actions do the work, getters derive,
  components read and call. Keep stores free of view concerns.
- Normalize repeated server data; denormalize only at the edge where views
  need it.

## Templates and styles

- Keep templates readable: small conditionals, named components, extracted
  computed and functions instead of logic inline.
- Always use a stable value for `v-for` keys; the key is identity, not
  position.

  ```vue
  <!-- Incorrect: index keys break state when the list reorders -->
  <li v-for="(item, i) in items" :key="i">

  <!-- Correct: stable identity -->
  <li v-for="item in items" :key="item.id">
  ```

- Escape output by default. Use `v-html` only for content sanitized for the
  exact HTML context, never for user input.

  ```vue
  <!-- Incorrect: rendering untrusted input as HTML -->
  <div v-html="userBio"></div>

  <!-- Correct: escaped interpolation by default -->
  <div>{{ userBio }}</div>
  ```

- Prefer semantic HTML, scoped styles, and CSS nesting; class names are a last
  resort. Keep styles local with `scoped` and avoid deep selectors unless they
  earn their place.

## Rendering and performance

- Derive render data with computed; never recompute in the template or in
  methods called from the template.
- For large or hot collections, prefer `shallowRef` and targeted updates over
  deep reactivity. Batch updates; don't replace arrays when one item changed.
- Code-split routes and heavy components with dynamic `import`. Keep bundles
  honest: lazy-load what is not in the initial view.
- Watch for reactive leaks: watchers and intervals created in setup must
  stop. Prefer `onScopeDispose` and `effectScope` over manual cleanup.

  ```ts
  // Incorrect: a watcher deriving state - extra state to keep in sync
  watch(search, (q) => { filtered.value = all.value.filter(matches(q)) })

  // Correct: derived state recomputes on demand
  const filtered = computed(() => all.value.filter(matches(search.value)))
  ```

## Testing

- Test the public seam: mount the component, drive it with user-visible
  interactions, assert rendered output and emitted events - not internal state.
- Test failure and empty states as well as the happy path. Keep tests
  deterministic: no timers, randomness, or network without fakes.
- Mock only the boundary (fetch layer, stores); let components render for
  real.
- Watch for weakened tests: a test that only passes after loosening a mock or
  asserting internals is suspect.

## Respect the version boundary

- Pin the Vue version and TypeScript setup in use; use features that exist in
  the installed version and check deprecations before upgrading.
- Match the project's ESLint/Prettier configuration and the Vue style guide's
  priority rules; treat style as a consistency choice, not a universal rule.

## Review in risk order

When reviewing Vue, prioritize:

1. Security and correctness: `v-html` with untrusted content, mutated props,
   unstable keys, logic leaked into templates.
2. State and data flow: derived state via watchers, shared state in the wrong
   layer, stores with view concerns, missing error states.
3. Performance: deep reactivity on large data, recompute in render, unloaded
   bundles, watcher and interval leaks.
4. Test quality: tests asserting internals or passing only after loosening
   mocks, missing failure-state coverage.
5. Structure, naming, style, and TypeScript contracts.

Report concrete findings before preferences. Cite the location, explain the
failure mode, and suggest the smallest robust fix.

## Final check

Before finishing:

- Run the test suite and the project's lint and type checks.
- Confirm no prop is mutated, every `v-for` key is stable, and no `v-html`
  renders untrusted input.
- Confirm derived state is computed, not watched; watchers and intervals stop
  when the scope disposes.
- State which verification ran and disclose anything that could not be tested.