---
name: writing-phoenix
description: >-
  Write or review clean, maintainable Phoenix applications using lessons from phoenixframework/phoenix, phoenix_live_view, LiveBeats, and the official Phoenix and LiveView guides. Use for Phoenix app code: routes and controllers, plugs, contexts, LiveView (assigns, events, forms, streams), channels, testing, and Phoenix code review. Assumes Elixir/OTP/Ecto knowledge - see writing-elixir for changesets and processes.
---

# Writing Phoenix

## Read what maps

- routes, controllers, plugs -> Routes and controllers
- contexts, schema access -> Contexts and boundaries
- LiveView, events, forms, streams -> LiveView
- channels, sockets -> Channels
- tests -> Testing
- reviewing a PR -> Review in risk order

## Start with the codebase

- Read mix.exs (phoenix / phoenix_live_view versions), router, contexts, `*_web` vs core dirs (umbrella: app_web / app), config, tests. Test helpers: ConnCase / LiveViewTest / ChannelCase.
- Preserve conventions; new projects start from the generated structure.

## Routes and controllers

- Routes declarative in the router: `scope`, `pipe_through`, resources vs explicit routes; no logic in the router.
- Controllers call contexts, never Ecto directly; return render/redirect/json; plugs for shared behavior.

  ```elixir
  # Incorrect: controller reaching into the data layer
  def index(conn, _params) do
    users = Repo.all(User)
    render(conn, :index, users: users)
  end

  # Correct: through the context boundary
  def index(conn, _params) do
    users = Accounts.list_users()
    render(conn, :index, users: users)
  end
  ```

## Contexts and boundaries

- Contexts own all Ecto access for a domain; controllers, channels, and jobs call contexts only. One context per domain; its public functions are the domain API.
- No cross-context Ecto access; compose at the boundary, not by sharing Repo calls.

## LiveView

- Fetch data in `mount` and store in assigns; `render` stays pure — no queries in render.

  ```elixir
  # Incorrect: querying in render - impure, runs every render, N+1-prone
  def render(assigns) do
    posts = Posts.list_posts()
    ~H"<%= for post <- posts %>..."
  end

  # Correct: fetch in mount, keep render pure
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :posts, Posts.list_posts())}
  end
  ```

- Assigns immutable: update via `assign`/`assign_new`, never mutate `socket.assigns`.
- `handle_event` updates assigns and stays small; no blocking work — `start_async`/`await`/`ok`, or a Task in a separate process.

  ```elixir
  # Incorrect: a slow call blocks the LiveView process
  def handle_event("refresh", _, socket) do
    stats = Analytics.slow_report()
    {:noreply, assign(socket, :stats, stats)}
  end

  # Correct
  def handle_event("refresh", _, socket) do
    {:noreply, start_async(socket, :report, fn -> Analytics.slow_report() end)}
  end
  def handle_async(:report, {:ok, stats}, socket) do
    {:noreply, assign(socket, :stats, stats)}
  end
  ```

- Forms driven by `to_form` + changeset; validation errors through the changeset, never ad hoc.
- Streams (`stream_assigns`, `stream_insert`) for large or incremental lists; `phx-click` with values, not JS callbacks.
- Cross-reference: changesets and OTP discipline live in `writing-elixir`.

## Channels

- Authenticate in `join/3`; assign identity via the socket; reject anonymous joins.

  ```elixir
  # Incorrect: join without identity - broadcasts cannot be scoped
  def join("room:lobby", _payload, socket), do: {:ok, socket}

  # Correct
  def join("room:" <> id, _payload, socket) do
    if authorized?(socket, id) do
      {:ok, assign(socket, :room_id, id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end
  ```

- Broadcasts scoped to authorized topics; `handle_in` small and non-blocking; presence used deliberately.

## Testing

- ConnCase for controllers, LiveViewTest for LiveView, ChannelCase for channels.
- Cover unauthorized joins, validation failures, empty states — not just happy paths. Deterministic: no sleeps, no wall-clock.
- Tests earn their place: revert the fix and watch it fail. Suspect tests that pass only after loosening a mock.

## Respect the version boundary

- Pin Phoenix/LiveView versions; features of the installed version; check deprecations before upgrading.
- Match the project's config; format/Credo follow the `writing-elixir` conventions.

## Review in risk order

1. LiveView: impure render, assigns mutation, blocking work in events, unbound streams.
2. Data flow: controllers/channels bypassing contexts; Ecto leaks; N+1 in render or streams.
3. Security/auth: unauthenticated joins, missing authorization at the boundary, trusted params.
4. Channels: unscoped broadcasts, blocking handlers.
5. Tests: missing LiveView/join/auth coverage.
6. Structure: logic in the router, oversized controllers, contexts crossing domains.

Report concrete findings before preferences: cite the location, explain the failure mode, suggest the smallest robust fix.

## Final check

- Run `mix test` (including LiveViewTest), `mix format --check-formatted`, Credo.
- Contexts own all Ecto access; live views fetch in mount; joins authenticated.
- State which verification ran; disclose what could not be tested.