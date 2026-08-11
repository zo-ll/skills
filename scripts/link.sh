#!/usr/bin/env bash
# Link every skill in this repo into every agent-harness skill directory on
# this machine. The repo is the single source of truth: harnesses load the
# skills through symlinks, so edits/commits here are live everywhere.
#
# Safe by construction:
#   - never touches a directory it doesn't own (no clobbering divergent copies)
#   - an existing symlink to this repo is left alone
#   - an existing real dir that is byte-identical is replaced with a symlink
#   - an existing real dir that differs is skipped with a warning
#
# Usage:  ./scripts/link.sh        # link all skills into all found harnesses
#         ./scripts/link.sh foo    # link only the "foo" skill

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Harness skill directories present on this machine. Add new harnesses here.
HARNESS_SKILL_DIRS=(
  "$HOME/.pi/agent/skills"
  "$HOME/.agents/skills"
  "$HOME/.claude/skills"
  "$HOME/.codex/skills"
  "$HOME/.config/crush/skills"
  "$HOME/.config/devin/skills"
  "$HOME/.config/goose/skills"
  "$HOME/.config/opencode/skills"
  "$HOME/.codemaker/skills"
  "$HOME/.codestudio/skills"
  "$HOME/.commandcode/skills"
  "$HOME/.astrbot/data/skills"
)

link_one() { # repo_skill_dir harness_dir skill_name
  local skill_dir="$1" harness="$2" name="$3"
  local target="$harness/$name"

  # Already linked to this repo?
  if [ -L "$target" ] && [ "$(readlink -f "$target")" = "$(readlink -f "$skill_dir")" ]; then
    return 0
  fi

  if [ -e "$target" ]; then
    if diff -rq "$skill_dir" "$target" >/dev/null 2>&1; then
      rm -rf "$target"
    else
      echo "SKIP (differs): $target"
      return 0
    fi
  fi

  mkdir -p "$harness"
  ln -s "$skill_dir" "$target"
  echo "linked: $target"
}

main() {
  local want="${1:-}"
  local linked=0 skipped=0

  for skill_dir in "$REPO"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    local name
    name="$(basename "$skill_dir")"
    if [ -n "$want" ] && [ "$name" != "$want" ]; then
      continue
    fi

    for harness in "${HARNESS_SKILL_DIRS[@]}"; do
      [ -d "$harness" ] || continue
      local target="$harness/$name"
      local before
      before="$(readlink -f "$target" 2>/dev/null || true)"
      link_one "$skill_dir" "$harness" "$name"
      if [ "$(readlink -f "$target" 2>/dev/null || true)" != "$before" ]; then
        linked=$((linked + 1))
      fi
    done
  done

  echo "done: $linked link(s) created/refreshed"
}

main "$@"
