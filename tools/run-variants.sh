#!/usr/bin/env bash
set -u
D="$(cd "$(dirname "$0")" && pwd)"
cd "$D"
P=8795
S="$D/settings-probe.json"

lab() { curl -s "http://127.0.0.1:$P/__label?name=$1" >/dev/null; echo; echo "==================== $1"; }
run() { echo "--- cmd: $*"; "$@" 2>&1 | head -6; echo "exit=${PIPESTATUS[0]}"; }

lab 01-default
run claude -p "hi" --settings "$S"

lab 02-nodynamic
run claude -p "hi" --settings "$S" --exclude-dynamic-system-prompt-sections

lab 04-plan
run claude -p "hi" --settings "$S" --permission-mode plan

lab 05-agent
run claude -p "hi" --settings "$S" --agents '{"reviewer":{"description":"probe reviewer","prompt":"You are a meticulous reviewer. Always cite line numbers."}}' --agent reviewer

lab 06-subagent
run claude -p "hi" --settings "$S" --allowedTools "Agent"

lab 03-bare
run env ANTHROPIC_BASE_URL=http://127.0.0.1:$P ANTHROPIC_API_KEY=sk-probe ANTHROPIC_MODEL=claude-sonnet-4-5 claude --bare -p "hi"

echo
echo "==== captured files ===="
ls -la capture-*.jsonl 2>/dev/null
