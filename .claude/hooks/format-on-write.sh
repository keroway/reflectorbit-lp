#!/usr/bin/env bash
# Claude Code PostToolUse hook for Edit / Write / MultiEdit.
# Auto-formats the touched file with Biome when the extension matches.
# Formatting is best-effort only: it must always exit 0 so an unavailable
# formatter never blocks the agent's main loop.
set -u

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
payload="$(cat || true)"
[ -z "$payload" ] && exit 0

extract_file_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -r '.tool_input.file_path // empty' 2>/dev/null
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$1" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input", {}).get("file_path", ""))
except Exception: pass' 2>/dev/null
    return
  fi
  printf '%s' "$1" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

file="$(extract_file_path "$payload")"
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  "${PROJECT_ROOT}"/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  */node_modules/*|*/dist/*|*/build/*|*/.git/*) exit 0 ;;
esac

case "$file" in
  *.ts|*.js|*.mjs|*.json)
    cd "$PROJECT_ROOT" || exit 0
    pnpm exec biome format --write --no-errors-on-unmatched "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
