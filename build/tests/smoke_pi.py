#!/usr/bin/env python3
"""Exercise the build skill through real Pi sessions. Uses model tokens."""

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[2]
DEPENDENCIES = ("how", "why", "small-units", "prove-it", "verify-app", "check-the-check")


def run(command, cwd, **kwargs):
    return subprocess.run(command, cwd=cwd, check=True, text=True, capture_output=True, **kwargs)


def fixture(directory):
    directory.mkdir()
    files = {
        "AGENTS.md": (
            "# Fixture\n\n"
            "Use scripts/verify.sh for behavior checks.\n"
            "Keep the existing verification script unchanged.\n"
            "Preserve notes.txt; it contains an unrelated user edit.\n"
            "Do not change the supported behavior without the task specification.\n"
        ),
        "app.py": (
            "import sys\n\n\n"
            "def escape_text(value):\n"
            "    return value.replace('<', '&lt;').replace('>', '&gt;')\n\n\n"
            "if __name__ == '__main__':\n"
            "    print(escape_text(sys.argv[1]))\n"
        ),
        "tests/test_app.py": (
            "import subprocess\nimport sys\nimport unittest\n\n\n"
            "class RenderTests(unittest.TestCase):\n"
            "    def render(self, value):\n"
            "        return subprocess.check_output(\n"
            "            [sys.executable, 'app.py', value], text=True\n"
            "        ).removesuffix('\\n')\n\n"
            "    def test_plain_text(self):\n"
            "        self.assertEqual(self.render('Ada'), 'Ada')\n\n"
            "    def test_angle_brackets(self):\n"
            "        self.assertEqual(self.render('<Ada>'), '&lt;Ada&gt;')\n"
        ),
        "scripts/verify.sh": (
            "#!/usr/bin/env bash\nset -euo pipefail\n"
            "cd -- \"$(dirname -- \"${BASH_SOURCE[0]}\")/..\"\n"
            "python3 -m unittest discover -s tests -v\n"
        ),
        "VERIFY.md": (
            "# Verification\n\nRun `scripts/verify.sh`.\n\n"
            "The tests execute app.py and compare actual CLI output.\n"
            "Current cases cover plain text and angle brackets.\n"
        ),
        "notes.txt": "Owner notes.\n",
    }
    for name, content in files.items():
        path = directory / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    (directory / "scripts/verify.sh").chmod(0o755)
    run(["git", "init", "-b", "main"], directory)
    run(["git", "add", "."], directory)
    run([
        "git", "-c", "user.name=Skill smoke test", "-c", "user.email=smoke@example.invalid",
        "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
        "commit", "-m", "Fixture baseline",
    ], directory)
    (directory / "notes.txt").write_text("Owner notes.\nUnrelated user edit.\n")
    run(["bash", "scripts/verify.sh"], directory)
    return files


def invoke(case, task, model, timeout):
    command = [
        "pi", "--print", "--mode", "json", "--no-session", "--no-extensions", "--no-mcp",
        "--no-skills", "--no-prompt-templates", "--no-themes", "--no-context-files", "--offline",
        "--tools", "read,bash,edit,write", "--model", model, "--thinking", "low",
    ]
    for name in ("build", *DEPENDENCIES):
        command.extend(["--skill", str(ROOT / name)])
    command.append("/skill:build " + task)
    with (case / "events.jsonl").open("w") as output, (case / "stderr.log").open("w") as errors:
        subprocess.run(command, cwd=case / "repo", stdout=output, stderr=errors, timeout=timeout, check=True)
    events = [json.loads(line) for line in (case / "events.jsonl").read_text().split("\n") if line.strip()]
    assert any(event.get("type") == "agent_settled" and not event.get("aborted") for event in events), "No settled run"
    assert not any(
        event.get("type") == "message_end"
        and event.get("message", {}).get("role") == "assistant"
        and event["message"].get("stopReason") in ("error", "aborted")
        for event in events
    ), "The model run failed"
    calls = [event for event in events if event.get("type") == "tool_execution_start"]
    for call in calls:
        if call["toolName"] != "bash":
            continue
        command_text = call.get("args", {}).get("command", "")
        assert not re.search(r"\b(?:filo|tmux)\b", command_text), "Unexpected coordinator or critic command"
        assert not re.search(r"(?:^|[;&\n])\s*pi\s", command_text), "Unexpected extra Pi session"
    return events, calls


def preserve_baseline(repo, head, files):
    assert run(["git", "rev-parse", "HEAD"], repo).stdout.strip() == head, "Unauthorized commit"
    assert (repo / "notes.txt").read_text() == "Owner notes.\nUnrelated user edit.\n", "User edit changed"
    assert (repo / "scripts/verify.sh").read_text() == files["scripts/verify.sh"], "Verification script changed"


def bug_case(root, model, timeout):
    case = root / "bug-fix"
    case.mkdir()
    repo = case / "repo"
    files = fixture(repo)
    head = run(["git", "rev-parse", "HEAD"], repo).stdout.strip()
    events, calls = invoke(
        case,
        "Fix app.py: escape_text leaves ampersands unchanged. Expected A&B -> A&amp;B. "
        "Existing entity-shaped input is text: &lt; -> &amp;lt;. Keep the existing angle-bracket behavior. "
        "Keep the change within app.py, tests/test_app.py, and VERIFY.md.",
        model, timeout,
    )
    preserve_baseline(repo, head, files)
    for name in ("how", "small-units", "prove-it"):
        assert any(
            call["toolName"] == "read"
            and str(call.get("args", {}).get("path", "")).endswith(f"/{name}/SKILL.md")
            for call in calls
        ), f"Required skill was not read: {name}"
    samples = {
        "A&B": "A&amp;B", "<Ada>": "&lt;Ada&gt;", "&lt;": "&amp;lt;",
        "": "", "東京 & città": "東京 &amp; città",
    }
    for value, expected in samples.items():
        actual = run(["python3", "app.py", value], repo).stdout.removesuffix("\n")
        assert actual == expected, (value, actual, expected)
    assert (repo / "tests/test_app.py").read_text() != files["tests/test_app.py"], "No regression test"
    verification = run(["bash", "scripts/verify.sh"], repo)
    (case / "verified.log").write_text(verification.stdout + verification.stderr)
    app_edits = [
        index for index, event in enumerate(events)
        if event.get("type") == "tool_execution_start"
        and event.get("toolName") in ("edit", "write")
        and Path(event.get("args", {}).get("path", "")).name == "app.py"
    ]
    assert app_edits, "No implementation edit in the trace"
    assert any(
        event.get("type") == "tool_execution_end"
        and any(word in json.dumps(event.get("result", {})) for word in ("AssertionError", "FAILED ("))
        for event in events[:app_edits[0]]
    ), "No failing behavior check before the implementation edit"
    status = run(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout
    allowed = {"app.py", "tests/test_app.py", "VERIFY.md", "notes.txt"}
    for line in status.splitlines():
        path = line[3:]
        if "__pycache__/" not in path:
            assert path in allowed, f"Out-of-scope change: {path}"
    print("PASS bug fix: real output, regression test, required skills, failed-before check, preserved user edit, no commit")


def blocked_case(root, model, timeout):
    case = root / "missing-spec"
    case.mkdir()
    repo = case / "repo"
    files = fixture(repo)
    head = run(["git", "rev-parse", "HEAD"], repo).stdout.strip()
    before = run(["git", "diff"], repo).stdout
    untracked_before = {
        name: (repo / name).read_bytes()
        for name in run(["git", "ls-files", "--others", "--exclude-standard"], repo).stdout.splitlines()
    }
    events, _ = invoke(
        case,
        "Change app.py's text format according to REQUIRED_SPEC.md. "
        "That file is the only authority for the new format. Do not invent its contents or change behavior without it.",
        model, timeout,
    )
    preserve_baseline(repo, head, files)
    assert run(["git", "diff"], repo).stdout == before, "Blocked task changed tracked files"
    untracked_after = {
        name: (repo / name).read_bytes()
        for name in run(["git", "ls-files", "--others", "--exclude-standard"], repo).stdout.splitlines()
    }
    assert untracked_after == untracked_before, "Blocked task changed untracked files"
    replies = [
        "\n".join(block.get("text", "") for block in event["message"].get("content", []) if block.get("type") == "text")
        for event in events
        if event.get("type") == "message_end" and event.get("message", {}).get("role") == "assistant"
    ]
    assert replies and "REQUIRED_SPEC.md" in replies[-1], "Missing specification was not reported"
    assert re.search(r"blocked|missing|absent|not found|does not exist", replies[-1], re.I), "No blocker in the final report"
    print("PASS missing specification: blocker reported, no implementation, no extra files, no commit")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=os.environ.get("BUILD_TEST_MODEL") or (
        f"{os.environ['PI_PROVIDER']}/{os.environ['PI_MODEL']}"
        if os.environ.get("PI_PROVIDER") and os.environ.get("PI_MODEL") else None
    ))
    parser.add_argument("--timeout", type=int, default=300, help="Seconds per model run")
    args = parser.parse_args()
    if not args.model:
        parser.error("Pass --model provider/id or set BUILD_TEST_MODEL.")
    for command in ("pi", "git", "bash", "python3"):
        if not shutil.which(command):
            parser.error(f"Required command: {command}")
    evidence = Path(tempfile.mkdtemp(prefix="build-skill-smoke-"))
    print(f"Model: {args.model}", flush=True)
    print(f"Evidence: {evidence}", flush=True)
    bug_case(evidence, args.model, args.timeout)
    blocked_case(evidence, args.model, args.timeout)
    print("PASS both live Pi cases. These smoke checks do not guarantee model compliance on every task.")


if __name__ == "__main__":
    main()
