#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
SRC="$ROOT/scripts/hooks/pre-commit"
DST=$(git rev-parse --git-path hooks/pre-commit)
mkdir -p "$(dirname "$DST")"
if [ -e "$DST" ] || [ -L "$DST" ]; then
  if [ "$(readlink "$DST" || true)" = "$SRC" ]; then
    echo "pre-commit hook already installed."
    exit 0
  fi
  echo "Refusing to overwrite existing hook: $DST" >&2
  exit 1
fi
ln -s "$SRC" "$DST"
echo "pre-commit hook installed."
