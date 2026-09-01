---
name: writing-vue
description: >-
  Write or review clean, maintainable Vue 3 using lessons from vuejs/core, VueUse, Element Plus, Directus, koel, and the official Vue docs and style guide. Use for Vue applications and components: composition API, components, props and events, state, templates and styles, forms, performance, testing, and Vue code review. Pairs with writing-laravel for Laravel + Vue applications.
---

# Writing Vue

## Read what maps

- components, props, events -> Composition API idioms, Components
- state, shared data -> State and data flow
- templates, styles, forms -> Templates and styles
- performance, large lists -> Rendering and performance
- tests -> Testing
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read AGENTS.md, package.json, src entry, routes, tests. Determine Vue/TS versions, build tool (Vite), ESLint/Prettier config, test commands (Vitest), state and router libraries.
- Preserve established conventions unless they cause a concrete correctness or maintainability problem. New projects: simplest structure that fits.

## Composition API idioms

- `<script setup>` and the composition API. Setup order: props, state, derived values, functions.
- `ref` for primitives/single values; `reactive` for object-shaped state; `computed` for derived state. Never derive state with watchers.
- Watchers for side effects only (persistence, sync, refetch). Mind `watch` options: flush, deep, immediate.
- Typed `defineProps`/`defineEmits` so contracts are checkable. `defineExpose` only when a parent genuinely needs it.
- Composables named after the concept (`useOrders`), one responsibility each.

## Components

- Presentational components render props and emit events; containers own state and data fetching.
- Split when a component outgrows a scroll of template and logic — by responsibility, not convenience.
- Never mutate props; emit events or v-model; the parent owns the state.

  ```ts
  // Incorrect: child mutating a prop changes parent state behind its back
  const props = defineProps<{ items: string[] }>()
  props.items.push('new')

  // Correct
  const emit = defineEmits<{ added: [item: string] }>()
  function add() { emit('added', 'new') }
  ```

- `provide`/`inject` sparingly, as shared context not a state stash. Slots over prop drilling when structure varies.
- Inject dependencies; keep components testable.

## State and data flow

- One-way data flow: server state in a fetch layer, shared UI state in Pinia, ephemeral state local.
- Derive what you can: computed beats state you must remember to update.
- Pinia stores as modules: actions do the work, getters derive, components read and call. No view concerns in stores.
- Normalize repeated server data; denormalize only at the view edge.

## Templates and styles

- Templates readable: small conditionals, named components, extracted computed/functions — no logic inline.
- Stable `v-for` keys; the key is identity, not position.

  ```vue
  <!-- Incorrect: index keys break state when the list reorders -->
  <li v-for="(item, i) in items" :key="i">

  <!-- Correct -->
  <li v-for="item in items" :key="item.id">
  ```

- Escape by default. `v-html` only for content sanitized for the exact HTML context, never user input.

  ```vue
  <!-- Incorrect: rendering untrusted input as HTML -->
  <div v-html="userBio"></div>

  <!-- Correct -->
  <div>{{ userBio }}</div>
  ```

- Semantic HTML, scoped styles, CSS nesting; class names last resort. Avoid deep selectors unless they earn their place.

## Rendering and performance

- Derive render data with computed; never recompute in the template or in methods called from it.
- Large/hot collections: `shallowRef` — mutating nested values under `shallowRef` does NOT trigger updates; replace the value (or call `triggerRef`) to notify. For deep reactive state, batch mutations; don't replace whole arrays per change.
- Code-split routes and heavy components with dynamic `import`; lazy-load what is not in the initial view.
- Reactive leaks: watchers and intervals created in setup must stop — prefer `onScopeDispose`/`effectScope`.

  ```ts
  // Incorrect: watcher deriving state - extra state to keep in sync
  watch(search, (q) => { filtered.value = all.value.filter(matches(q)) })

  // Correct: derived state recomputes on demand
  const filtered = computed(() => all.value.filter(matches(search.value)))
  ```

## Testing

- Test the public seam: mount, drive user-visible interactions, assert rendered output and emitted events — not internal state.
- Test failure and empty states. Deterministic: no timers, randomness, or network without fakes.
- Mock only the boundary (fetch layer, stores); let components render for real.
- Suspect tests that pass only after loosening a mock or asserting internals.

## Respect the version boundary

- Pin the Vue/TS versions; use features of the installed version; check deprecations before upgrading.
- Match the project's ESLint/Prettier config and the Vue style guide's priority rules.

## Review in risk order

1. Security/correctness: `v-html` with untrusted content, mutated props, unstable keys, logic in templates.
2. State/data flow: derived state via watchers, shared state in the wrong layer, stores with view concerns, missing error states.
3. Performance: deep reactivity on large data, recompute in render, unloaded bundles, watcher/interval leaks.
4. Test quality: internals assertions, mocks loosened, missing failure-state coverage.
5. Structure, naming, style, TypeScript contracts.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run the test suite, lint, and type checks.
- Confirm no mutated props, stable `v-for` keys, no untrusted `v-html`.
- Derived state computed, not watched; watchers/intervals stop with the scope.
- State which verification ran; disclose what could not be tested.