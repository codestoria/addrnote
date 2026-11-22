#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

bash scripts/watch-sidebar.sh &
watch_pid=$!
./node_modules/.bin/vitepress dev . "$@" &
server_pid=$!
cleanup() {
  kill "$watch_pid" "$server_pid" 2>/dev/null || true
  wait "$watch_pid" "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait -n "$watch_pid" "$server_pid"
