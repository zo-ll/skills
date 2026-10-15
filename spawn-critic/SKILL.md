---
name: spawn-critic
description: >-
  Start a DeepSeek critic in a full interactive Pi session in another tmux
  window. The critic sends its completion prompt directly to the coordinator
  through tmux. Use for "spawn critic", "spawn-critic", "get a critic", or a
  separate Pi review with asynchronous notification. Do not wait or poll.
compatibility: Requires Pi, tmux, Bash, and Git on the same host.
---

# Spawn critic

Start a full Pi session in another tmux window.
Use DeepSeek by default. The user can select another model.
Notify the coordinator through a direct tmux prompt.
Do not use print mode, RPC, a subagent tool, or a shell-only critic.
No helper program is necessary.

## Prepare the review

1. Confirm the artifact and acceptance criteria.
2. Read the applicable project instructions.
3. Resolve the base and head to full commit hashes.
4. Make sure the worktree is clean.
5. Make sure the current head matches the review head.
6. Prepare a private brief outside the repository.

Supply criteria and artifacts, not the maker's reasons or a suggested verdict.
Include the goal, owner decisions, constraints, issue number, and PR number when applicable.
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
  "pane=$origin_pane" "socket=$socket" "session=$session" > "$run/target.txt"
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
tmux -S "$socket" new-window -d -t "$session:" -n "$window" -c "$repo" "$launch"
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
Do not close the critic window unless the user asks.

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
