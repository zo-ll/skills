#!/usr/bin/env bash
# Bootstrap this repo's active skills on a new machine.
#
# Makes active skills live in every discovered harness skill directory.
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
echo "Done. Restart your harness if it does not detect the updated skills."
