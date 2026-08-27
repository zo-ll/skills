---
name: writing-laravel
description: Write or review clean, maintainable Laravel using lessons from laravel/framework, the first-party packages (Horizon, Telescope, Cashier, Fortify), Spatie tools, real Laravel applications (Monica, koel), and the official Laravel docs. Use for Laravel applications and packages: routing and controllers, validation, authorization, Eloquent, databases, queues, Blade, testing, and Laravel code review.
---

# Writing Laravel

Write Laravel that follows the framework's intended flow, stays testable, and is
unsurprising to a Laravel developer. Draw lessons from the framework itself and
its first-party code without copying any one project's conventions mechanically.

## Read what maps

Read only the section that maps to the change; a small slice needs one section,
not the whole file.

- routes, controllers, resources -> Follow the framework's flow, Keep controllers thin
- validation, authorization, mass assignment -> Handle input and errors deliberately
- models, queries, migrations, N+1 -> Keep Eloquent honest
- jobs, queues, caching -> Follow the framework's flow
- Blade, rendering -> Keep controllers thin, Respect the version boundary
- tests -> Test failure as well as success
- reviewing a PR -> Review in risk order

## Start with the codebase

Before changing code:

1. Read repository instructions, `composer.json`, routes, migrations, models, and
   tests.
2. Determine the Laravel and PHP versions, Pest vs PHPUnit, Pint rules,
   Larastan configuration, and test commands.
3. Preserve established conventions unless they cause a concrete correctness or
   maintainability problem. For new projects, choose the simplest structure that
   fits the expected size.

## Follow the framework's flow

- Route requests through the intended path: routes -> controllers ->
  FormRequests -> policies -> Eloquent -> responses or views.
- Use framework features before reaching for dependencies: rate limiting, queues,
  notifications, events, auth, caching.
- Keep route files declarative. Use route model binding and resource controllers
  where they fit. Put no logic in route files.
- Prefer facades and contracts as the framework expects them; test with the
  framework's fakes before hand-rolled abstractions.
- Keep the service container implicit. Add bindings only where an interface
  genuinely varies or testability demands it.

## Keep controllers thin

- Controllers accept requests and return responses. Validation lives in
  FormRequests, authorization in policies, rendering in views or components.
- Extract to action or service classes when a controller method grows beyond a
  few responsibilities or is reused across controllers and commands.
- Keep models lean: relationships, scopes, and casts. Name query intent with
  scopes. Move involved query logic out of long model methods.
- Do not put business rules in Blade or in route closures.

## Handle input and errors deliberately

- Validate every write path with a FormRequest; use `$request->validated()`.
  Never trust client input, including JSON and file uploads.

  ```php
  // Incorrect: no rules exist, untrusted input passes through
  $post = Post::create($request->all());

  // Correct: the FormRequest owns the rules; validated() is the only input
  public function store(StorePostRequest $request): RedirectResponse
  {
      return redirect()->route('posts.show', Post::create($request->validated()));
  }
  ```

- Never pass raw request arrays into `create` or `update`. Protect mass
  assignment with explicit `$fillable` and only write validated data.

  ```php
  // Incorrect: every attribute is settable by anyone
  protected $guarded = [];
  $post->update($request->all());

  // Correct: whitelist what the model may set
  protected $fillable = ['title', 'body', 'published_at'];
  $post->update($request->validated());
  ```

- Fail loudly for programmer errors. Handle expected failures consistently:
  404 via route model binding, 403 via authorization, 422 via validation.
- Wrap multi-step writes in `DB::transaction`. Design jobs and webhooks to be
  idempotent and safe to retry.

  ```php
  // Incorrect: a failure in step two leaves step one committed
  $order->save();
  $this->charge($order);

  // Correct: both steps commit together or not at all
  DB::transaction(function () use ($order) {
      $order->save();
      $this->charge($order);
  });
  ```
- For JSON APIs, shape output with `JsonResource`, and keep error responses
  consistent in shape and status code.

## Keep Eloquent honest

- Watch for N+1: eager load with `with`, `loadMissing`, and `withCount`.
  Audit list rendering and Blade loops for hidden queries.

  ```php
  // Incorrect: a query per row when the relation is read
  foreach ($orders as $order) {
      echo $order->customer->name;
  }

  // Correct: the relation loads in one query
  $orders = Order::with('customer')->get();
  foreach ($orders as $order) {
      echo $order->customer->name;
  }
  ```
- Store facts, not derived state. Compute derived values unless a measured
  performance problem justifies caching them.
- Add indexes for the columns you filter, sort, or join on. Keep migrations
  versioned and additive; never edit a deployed migration.
- Use casts for typed attribute access. Do not overload accessors and mutators
  with side effects.

## Respect the version boundary

- Pin the Laravel and PHP versions in use. Use features that exist in the
  installed version; check for deprecations before upgrading.
- Match the project's Pint configuration and style. Treat formatting as a
  consistency choice, not a universal rule.
- Isolate third-party integration code behind a narrow interface so it can be
  swapped or faked.

## Test failure as well as success

- Test through the public seam: feature tests that hit routes and assert
  responses, with `RefreshDatabase` and factories. Unit test pure logic.
- Test validation failures, authorization denials, 404s, and empty states, not
  just happy paths.
- Fake external services (`Http::fake`, `Notification::fake`, `Queue::fake`).
  Keep tests deterministic: no time- or random-dependent assertions.
- Prove each test earns its place: revert the fix and watch it fail. Suspect any
  test that only passes after loosening a mock.
- Add regression tests for fixed bugs and focused tests for new invariants.

## Review in risk order

When reviewing Laravel, prioritize:

1. Security: mass-assignment exposure, missing authorization, unescaped output,
   raw SQL, leaked credentials, missing rate limiting on auth endpoints.
2. Data integrity: unvalidated input, missing transactions, N+1 queries,
   non-idempotent jobs, lost updates.
3. Behavior: wrong status codes, inconsistent error shapes, silent failures,
   jobs without failure handling.
4. Test gaps: missing coverage of failure and authorization paths, weakened or
   meaningless tests.
5. Structure, naming, style, and framework misuse that fights conventions.

Report concrete findings before preferences. Cite the location, explain the
failure mode, and suggest the smallest robust fix.

## Final check

Before finishing:

- Run the test suite, Pint (or the project's format check), and Larastan if
  configured.
- Confirm every write path is validated, every authorization decision is
  policed, and no N+1 is introduced in list rendering.
- Confirm migrations are additive and reviewed, config drives env-dependent
  behavior, and jobs are idempotent.
- State which verification ran and disclose anything that could not be tested.