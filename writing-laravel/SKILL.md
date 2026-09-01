---
name: writing-laravel
description: >-
  Write or review clean, maintainable Laravel using lessons from laravel/framework, the first-party packages (Horizon, Telescope, Cashier, Fortify), Spatie tools, real Laravel applications (Monica, koel), and the official Laravel docs. Use for Laravel applications and packages: routing and controllers, validation, authorization, Eloquent, databases, queues, Blade, testing, and Laravel code review.
---

# Writing Laravel

## Read what maps

- routes, controllers, resources -> Follow the framework's flow, Keep controllers thin
- validation, authorization, mass assignment -> Handle input and errors deliberately
- models, queries, migrations, N+1 -> Keep Eloquent honest
- jobs, queues, caching -> Follow the framework's flow
- Blade, rendering -> Keep controllers thin, Respect the version boundary
- tests -> Test failure as well as success
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read AGENTS.md, composer.json, routes, migrations, models, tests. Determine Laravel/PHP versions, Pest vs PHPUnit, Pint rules, Larastan config, test commands.
- Preserve established conventions unless they cause a concrete correctness or maintainability problem. New projects: simplest structure that fits the expected size.

## Follow the framework's flow

- Route through: routes -> controllers -> FormRequests -> policies -> Eloquent -> responses/views.
- Use framework features before dependencies: rate limiting, queues, notifications, events, auth, caching.
- Route files declarative; route model binding + resource controllers where they fit; no logic in route files.
- Use the framework's fakes before hand-rolled abstractions. Add container bindings only where an interface genuinely varies or testability demands it.

## Keep controllers thin

- Controllers accept requests and return responses. Validation in FormRequests, authorization in policies, rendering in views/components.
- Extract to action/service classes when a controller method grows beyond a few responsibilities or is reused across controllers and commands.
- Models stay lean: relationships, scopes, casts. Name query intent with scopes.
- No business rules in Blade or route closures.

## Handle input and errors deliberately

- Every HTTP write path validated with a FormRequest; use `$request->validated()`. Never trust client input, including JSON and uploads. Jobs/commands/imports validate by their own contracts (schemas, idempotency, exceptions), not FormRequests.

  ```php
  // Incorrect: no rules, untrusted input passes
  $post = Post::create($request->all());

  // Correct: FormRequest owns the rules
  public function store(StorePostRequest $request): RedirectResponse
  {
      return redirect()->route('posts.show', Post::create($request->validated()));
  }
  ```

- Explicit `$fillable`; never raw request arrays into create/update; only validated data.

  ```php
  // Incorrect: every attribute settable
  protected $guarded = [];
  $post->update($request->all());

  // Correct: whitelist settable attributes
  protected $fillable = ['title', 'body', 'published_at'];
  $post->update($request->validated());
  ```

- Fail loudly for programmer errors. Expected failures consistent: 404 via route model binding, 403 via authorization, 422 via validation.
- Multi-step writes in `DB::transaction`; side effects (payments, emails, external calls) run AFTER commit — never inside the transaction: they cannot be rolled back and hold locks during I/O. Jobs/webhooks idempotent and retryable.

  ```php
  // Incorrect: external call inside the DB transaction - not rollbackable,
  // holds a connection and locks during network I/O
  DB::transaction(function () use ($order) {
      $order->save();
      $this->charge($order);
  });

  // Correct: transaction for the DB writes; the charge runs after commit
  DB::transaction(fn () => $order->save());
  dispatch(new ChargeOrder($order));   // idempotent, queued after commit
  ```

- JSON APIs: shape with `JsonResource`; consistent error shape and status codes.

## Keep Eloquent honest

- No N+1: eager load with `with`, `loadMissing`, `withCount`. Audit list rendering and Blade loops.

  ```php
  // Incorrect: query per row
  foreach ($orders as $order) { echo $order->customer->name; }

  // Correct
  $orders = Order::with('customer')->get();
  foreach ($orders as $order) { echo $order->customer->name; }
  ```

- Store facts, not derived state; compute unless a measured performance problem justifies caching.
- Index filtered/sorted/joined columns. Migrations versioned and additive; never edit a deployed migration.
- Casts for typed attribute access; no side effects in accessors/mutators.

## Respect the version boundary

- Pin Laravel/PHP versions; use features of the installed version; check deprecations before upgrading.
- Match the project's Pint config and style. Isolate third-party integration behind a narrow interface.

## Test failure as well as success

- Feature tests hit routes and assert responses (RefreshDatabase, factories); unit-test pure logic.
- Test validation failures, authorization denials, 404s, empty states — not just happy paths.
- Fake externals: `Http::fake`, `Notification::fake`, `Queue::fake`. Deterministic: no time-/random-dependent assertions.
- Tests earn their place: revert the fix and watch it fail. Suspect tests that pass only after loosening a mock.
- Regression tests for fixed bugs; focused tests for new invariants.

## Review in risk order

1. Security: mass-assignment exposure, missing authorization, unescaped output, raw SQL, leaked credentials, missing rate limiting on auth endpoints.
2. Data integrity: unvalidated input, missing transactions, N+1 queries, non-idempotent jobs, lost updates.
3. Behavior: wrong status codes, inconsistent error shapes, silent failures, jobs without failure handling.
4. Test gaps: missing failure/auth-path coverage, weakened or meaningless tests.
5. Structure, naming, style, framework misuse that fights conventions.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run the test suite, Pint `--test` (read-only format check), Larastan if configured.
- Confirm every HTTP write path is validated, every authorization decision is policed, no N+1 in list rendering.
- Migrations additive and reviewed; config drives env-dependent behavior; jobs idempotent.
- State which verification ran; disclose anything that could not be tested.