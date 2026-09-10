#!/usr/bin/env bash
# Bootstrap this repo on a new machine with pi and other coding agents.
#
# Makes every resource in this repo live everywhere:
#   skills/  -> symlinked into every harness skill dir (link.sh)
#
# Idempotent: safe to re-run after edits or on a fresh clone. Uses symlinks so
# the repo stays the single source of truth - edit here, live everywhere.
#
# Usage:  ./bin/bootstrap.sh

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Linking skills into all harness skill dirs"
"$REPO/scripts/link.sh"

echo
echo "Done. Restart your agent harness (or run /reload) so the skills are picked up."
