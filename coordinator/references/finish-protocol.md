# Finish protocol (workers and reviewers ping the coordinator)

Unified and harness-agnostic: every completed turn — from pi, Claude Code,
Codex, or any future harness — uses the SAME ping channel (the inbox relay)
and the SAME durable marker. Two artifacts per finish:

## 1. Ping — write ONE line to the inbox (ALL harnesses)

    printf '<your-role>: finished <task-slug> <one-line summary>\n' \
      > /tmp/shipwright/inbox/<task-slug>.ping

- NEW filename per finish (the relay consumes each file after delivering it
  into the coordinator's conversation).
- ONE line only — never multi-line content.
- This works for every harness because writing a file is the one capability
  every coding agent has, including sandboxed ones (codex under
  workspace-write is proven to reach /tmp/shipwright/inbox/).

The relay (coordinator skill `scripts/relay.sh`, run in a relay window,
outside all sandboxes) delivers that single line into the coordinator's
conversation — the coordinator's next turn starts with it.

## 2. Marker — durable record, ALWAYS

    <your current checkout>/.scratch/status/<task-slug>.done

ONE line:

    done TS=<YYYY-MM-DD HH:MM:SS> TASK=<task-slug> RESULT=<pass|handback|checkpoint|correction> SUMMARY=<one-line summary>

`.scratch/` is gitignored. Always write it — it is the durable,
tag/timestamp-queryable record and the cross-check for the ping.

## 3. Hand back normally

Write your usual final handoff in your pane (task report, verdict, etc.).

---

Coordinator side:
- The relay window runs the skill's `scripts/relay.sh`: guarded typed delivery — injects only when the coordinator pane runs `pi` and is not in copy mode; otherwise `DEFER` + retain + retry. Log (`/tmp/shipwright/relay.log`) vocabulary: `ARRIVE` → `DELIVER` / `DEFER`.
- Standing order: the coordinator reads markers (`.scratch/status/*.done`)
  first thing every turn — before any status report or decision.
- Coordinator→worker direction (assignments, corrections, review pointers)
  stays exactly as is (`prompt-target` into the worker pane).