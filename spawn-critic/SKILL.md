---
name: spawn-critic
description: >-
  Start a DeepSeek critic in a full interactive Pi session in another tmux
  window. The critic sends its completion prompt directly to the coordinator
  through tmux. Use for "spawn critic", "spawn-critic", "get a critic", or a
  separate Pi review with asynchronous notification. Do not wait or poll.
compatibility: Requires Pi, tmux, Bash, and Git on the same host. GitHub issue checks require gh.
---

# Spawn critic

Start a full Pi session in another tmux window.
Use DeepSeek by default. The user can select another model.
Notify the coordinator through a direct tmux prompt.
Do not use print mode, RPC, a subagent tool, or a shell-only critic.
No helper program is necessary.
After confirmed issue closure, delete the associated critic window.
Keep the report and Pi session history.

## Prepare the review

1. Confirm the artifact and acceptance criteria.
2. Read the applicable project instructions.
3. Resolve the base and head to full commit hashes.
4. Make sure the worktree is clean.
5. Make sure the current head matches the review head.
6. Prepare a private brief outside the repository.

Supply criteria and artifacts, not the maker's reasons or a suggested verdict.
Include the goal, owner decisions, constraints, issue number, and PR number when applicable.
Keep one issue per critic window.
Record the issue repository and number for window cleanup.
For a Git review, require the `code-review` skill and complete file coverage.
For other artifacts, identify each required outcome and its evidence.

If the review includes uncommitted work, obtain an approved snapshot first.
Do not commit unrelated user changes to obtain a snapshot.

## Capture the coordinator and scope

Use the actual repository and base in this example.
Keep the resulting paths and hashes for the prompt and launch commands.

```bash
repo=/absolute/path/to/repo
base_ref=origin/master
model=opencode-go/deepseek-v4-pro
issue_repo=owner/repository
issue_number=123

origin_pane=${TMUX_PANE:?This task requires tmux}
socket=$(tmux display-message -p -t "$origin_pane" '#{socket_path}')
session=$(tmux -S "$socket" display-message -p -t "$origin_pane" '#{session_id}')
head=$(git -C "$repo" rev-parse 'HEAD^{commit}')
base=$(git -C "$repo" merge-base "$base_ref" "$head")
test -z "$(git -C "$repo" status --porcelain)" || exit 1
pi auth check --model "$model" || exit 1

state_root=${XDG_STATE_HOME:-$HOME/.local/state}/spawn-critic
mkdir -p "$state_root"
run=$(mktemp -d "$state_root/review.XXXXXXXX")
run_id=${run##*/}
window="critic-$run_id"
printf '%s\n' "repo=$repo" "base=$base" "head=$head" "model=$model" \
  "pane=$origin_pane" "socket=$socket" "session=$session" \
  "issue_repo=$issue_repo" "issue_number=$issue_number" > "$run/target.txt"
```

The default model is `opencode-go/deepseek-v4-pro` with high reasoning.
Honor an explicit user model choice.
If the model lacks credentials, report the failure.
Do not silently select another family.

## Prepare the critic prompt

Use the write tool to create `<run>/prompt.md`.
Insert the captured values as literal values, not unresolved shell variables.
Include these requirements:

- Review only the frozen artifact and range.
- Read the actual diff, related code, tests, and acceptance criteria.
- Do not edit source, commit, push, merge, or change branches.
- Do not operate a device without explicit permission.
- Write the report only to `<run>/REPORT.md`.
- State `APPROVE` or `REQUEST_CHANGES` explicitly.
- Include the full reviewed hash and model ID.
- Include findings with severity, source locations, evidence, and the smallest correction.
- Include selected, reviewed, and skipped file counts.
- Include commands actually executed, results, and evidence gaps.
- Approve only when no unresolved critical, high, or medium finding remains.
- Stay in the Pi session after notification.

These instructions define the role. They do not provide a security sandbox.
Build success alone does not prove behavior or artifact metadata.

Include an exact completion command in the critic prompt.
Substitute the captured socket, pane, run ID, report path, and full hash.
Use shell-safe quotes for each substituted argument.

```bash
# The critic runs this only after it completes REPORT.md.
printf '%s\n' 'REQUEST_CHANGES or APPROVE; full reviewed SHA; model ID' > /private/run/DONE
if [ "$(tmux -S /captured/socket display-message -p -t %CAPTURED_PANE '#{pane_current_command}')" != pi ]; then
  printf '%s\n' 'Coordinator pane no longer runs Pi. Notification stopped.' >&2
  exit 1
fi
tmux -S /captured/socket send-keys -t %CAPTURED_PANE -l \
  'Critic completed RUN_ID at FULL_SHA. Read /private/run/REPORT.md and /private/run/DONE. Verify the verdict before further action.'
tmux -S /captured/socket send-keys -t %CAPTURED_PANE Enter
```

The completion message must name the actual run and full hash.
Do not send the report body as terminal input.
If the target no longer runs Pi, report the failure in the critic session.
Do not redirect the notification to another pane without confirmation.

## Launch and return

The prompt file must exist before launch.
The command below starts an interactive Pi session with its own history.
Bash `%q` protects paths and arguments in the tmux shell command.

```bash
printf -v launch '%q ' pi --model "$model" --thinking high \
  --name "$window" --session-dir "$run/sessions" "@$run/prompt.md"
critic=$(tmux -S "$socket" new-window -d -P -F '#{window_id} #{pane_id}' \
  -t "$session:" -n "$window" -c "$repo" "$launch")
read -r critic_window critic_pane <<< "$critic"
tmux -S "$socket" set-option -w -t "$critic_window" @spawn_critic_run "$run_id"
printf '%s\n' "critic_window=$critic_window" "critic_pane=$critic_pane" >> "$run/target.txt"
```

1. Inspect the new pane once to confirm that Pi received the prompt.
2. Report the window name and model to the user.
3. Return control to the user.

Do not sleep for completion, poll the report, or block on `tmux wait-for`.
The critic prompts the coordinator directly when it completes the review.
The coordinator can do other work during the review.
Keep the coordinator editor empty for the completion prompt.

Keep the reviewed source unchanged until the critic completes the review.
If source work must continue, use a separate worktree.
Keep the critic window while its issue remains open.
Approval or PR merge alone does not trigger cleanup.
After confirmed issue closure, follow the cleanup procedure below.

## Process the notification

Treat the completion prompt as a notice, not as approval evidence.

1. Read the actual report and completion marker.
2. Match the run, model, base, and full reviewed hash.
3. Compare the reviewed hash with the current PR head.
4. Classify each finding as act on, consider, noted, or dismissed.
5. Give the reason for each dismissal.

If a blocker remains, do not merge.
Correct real defects within the authorized scope.
Request another review from the same critic session after corrections.
Supply the new full hash, correction diff, prior report, and new report path.
Require a new report and notification for that hash.
Never apply approval from an older hash to a new head.

A request for a critic alone does not authorize merge.
If the user authorizes merge after approval, require approval for the current head and all required checks.
Before merge, check the base, unresolved comments, worktree state, and exact CI head.
Use an expected-head condition with the merge command when the host supports it.
Confirm the remote merge result before you report success.

## Delete the window after issue closure

The coordinator owns cleanup. The critic does not delete its own window.
Issue closure triggers cleanup; review completion alone does not.
Do not close an issue merely to delete its critic window.
If no issue is associated, keep the window until the user requests cleanup.

1. Confirm that the critic completed its review.
2. Make sure the report and completion marker exist outside tmux.
3. Confirm the associated issue's closed state on its host.
4. Recover the recorded socket, window ID, pane ID, and run ID.
5. Verify that the window still belongs to that run.
6. Delete only that window.
7. Confirm that the window no longer exists.

Use stable IDs, not a reusable window index or name.
If the window has extra panes or a different run marker, stop cleanup.
Never delete the coordinator window or another issue's critic window.
If the issue remains open for device acceptance, keep the critic window.
If issue lookup fails, keep the window and report the failure.
Check closure after the normal issue workflow or an explicit closure notice.
Do not add a wait loop or poll the issue.

For GitHub, use the captured values in this example.
Recover values as data; do not execute `target.txt` as a shell script.

```bash
test -s "$run/REPORT.md" && test -s "$run/DONE" || exit 1
state=$(gh issue view "$issue_number" --repo "$issue_repo" --json state --jq .state) || exit 1
if [ "$state" = CLOSED ]; then
  coordinator_window=$(tmux -S "$socket" display-message -p -t "$origin_pane" '#{window_id}') || exit 1
  test "$critic_window" != "$coordinator_window" || exit 1
  marker=$(tmux -S "$socket" show-options -w -v -t "$critic_window" @spawn_critic_run) || exit 1
  test "$marker" = "$run_id" || exit 1
  panes=$(tmux -S "$socket" list-panes -t "$critic_window" -F '#{pane_id}') || exit 1
  test "$panes" = "$critic_pane" || exit 1
  tmux -S "$socket" kill-window -t "$critic_window" || exit 1
  # A successful lookup means the window still exists. A server error is not proof of deletion.
  remaining=$(tmux -S "$socket" list-windows -a -F '#{window_id}') || exit 1
  if printf '%s\n' "$remaining" | grep -Fxq -- "$critic_window"; then
    printf '%s\n' 'Critic window cleanup failed.' >&2
    exit 1
  fi
fi
```

Preserve the private run directory, report, completion marker, and session history.
Window cleanup must not delete those files.
