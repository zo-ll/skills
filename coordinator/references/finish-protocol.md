# Finish protocol (workers and reviewers ping the coordinator)

Adopt this for EVERY completed turn (task done, checkpoint, correction, or
review verdict). There is no watcher and no polling — the coordinator reads
markers on demand; the ping is the real signal.

## 1. PING THE COORDINATOR — prompt them the same way they prompt you (PRIMARY)

Write a MINI prompt (one line) and paste it into the coordinator pane, exactly
like the coordinator does with you:

    printf '<your-role>: finished <task-slug> <one-line summary>\n' > /tmp/shipwright/ping.txt
    <shipwright scripts>/tmux-agent.sh \
      prompt-target <session>:coordinator.pane /tmp/shipwright/ping.txt pi

Example mini prompt line:

    critic: finished 13-ui-chrome re-review pass Starting asserted gate 57 tests

A prompt in the coordinator's CONVERSATION cannot be missed — it becomes the
coordinator's next turn.

### Sandboxed workers (no tmux access)

If tmux is unreachable from your sandbox (e.g. codex under workspace-write),
ping via the inbox relay instead: write ONE line to a NEW file under
/tmp/shipwright/inbox/:

    printf '<your-role>: finished <task-slug> <one-line summary>\n' \
      > /tmp/shipwright/inbox/<task-slug>.ping

The relay (see coordinator skill `scripts/relay.sh`) delivers that single
line into the coordinator's conversation and consumes it. Never write
multi-line content to the inbox.

## 2. Write a status marker (durable record, ALWAYS)

    <your current checkout>/.scratch/status/<task-slug>.done

ONE line, this exact shape:

    done TS=<YYYY-MM-DD HH:MM:SS> TASK=<task-slug> RESULT=<pass|handback|checkpoint|correction> SUMMARY=<one-line summary>

`.scratch/` is gitignored. Always write it — it is the durable record even
when the ping path works.

## 3. Then hand back normally

Write your usual final handoff in your pane.