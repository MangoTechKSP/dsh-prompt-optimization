# Provenance of the prompt text

The persona text is not a guess about how Claude Code behaves. It was captured from the wire, from a locally installed Claude Code CLI, and then edited down for a different harness.

## Capture method

Claude Code talks to an Anthropic-compatible endpoint, so a local server that speaks that protocol sees the exact request: system blocks, tool definitions, and the first user message. The CLI accepts per-invocation environment overrides, which keeps the real configuration untouched:

```bash
node tools/probe.cjs 8795 &
claude -p "hi" --settings '{"env":{"ANTHROPIC_BASE_URL":"http://127.0.0.1:8795","ANTHROPIC_AUTH_TOKEN":"sk-probe","ANTHROPIC_MODEL":"claude-sonnet-4-5"}}'
node tools/extract.cjs
```

`probe.cjs` decompresses the request body (gzip/br/deflate/zstd) and appends one JSON line per request. `extract.cjs` filters the health-check probes and writes every `system` block to `extracted/<label>__r<n>.system.txt`.

Two things bite here and are worth knowing before re-running: the first captured line is a `HEAD /api/hello` health check with an empty body (filter on `body.length >= 500`), and on Windows a `pkill` does not reach the detached server — stop it with `taskkill` or `Get-CimInstance Win32_Process`.

## What the captures showed

Eleven shapes were recorded (Claude Code 2.1.330). The differences matter more than the text itself:

| shape | system prompt | note |
| --- | --- | --- |
| default (`-p`) | 27,220 chars, 14 tools | the baseline |
| `--exclude-dynamic-system-prompt-sections` | 26,857 chars | `# Text output` moves behind `# auto memory` |
| `--permission-mode plan` | identical to default | plan-mode rules ride in the *user* message (+5,031 chars), not the system prompt |
| `--agents` + `--agent` | **196 chars** | a custom agent replaces the entire system prompt, keeping only the identity line |
| subagent `general-purpose` | 2,830 chars | 10–12 tools |
| subagent `Explore` | 3,396 chars | 7 tools, read-only rules |
| subagent `Plan` | 3,721 chars | 7 tools, process + required output |
| subagent `statusline-setup` | 14,738 chars | Read and Edit only |

The custom-agent result is the interesting one for this project: in Claude Code, replacing the system prompt wholesale is a first-class configuration, not a hack. This plugin does the same thing one layer up, through the harness's own assemble hook.

The tool definitions weigh 51,179 chars against 27,208 for the prompt — a reminder that "the prompt" is less than half of what the model reads.

## What was kept, dropped, and written

Kept, adapted: `# Doing tasks`, `# Executing actions with care`, `# Tone and style`, `# Text output`, `# Context management`, and the framing paragraph. Tool names were remapped (`Read` → `read`, `Bash` → `ops_bash`, `TaskCreate` → `todo_write`, `Agent` → `subagent`, and so on).

Dropped: `# System` (it documents Claude Code's own permission prompts, which do not exist here), `# Using your tools` (duplicated by this harness's per-tool sections and its shell routing table), `# auto memory` (no equivalent mechanism, and it hard-codes a `.claude` path), `# Environment` (hard-codes Anthropic model ids and surfaces).

Written for this harness, not derived: `# Instruction precedence`, `# Working with skills and plugins`, `# Answer shape`, `# Aesthetics`, `# Judgment and candor`, `# Privacy and personal data`, `# Speed`. These encode principles the upstream prompt demonstrates rather than states: every rule names the failure it prevents, thresholds are concrete (two to six lines, three similar lines, one accent colour), and defaults are stated as defaults so a stronger instruction can override them.

Deliberately not copied: upstream's absolute "you are highly capable" claims, and its house-style tables. Both read as noise in a harness whose tool set and model differ.

## Re-capturing after an Anthropic release

```bash
node tools/probe.cjs 8795 &
bash tools/run-variants.sh          # writes capture-*.jsonl for each shape
node tools/extract.cjs              # writes extracted/*.system.txt
```

Diff the new `extracted/*.system.txt` against the previous run, port what changed into `packages/dsh-claude-code-persona/prompts/claude-code-persona.md`, then bump `prompts/claude-code.version.json`. `--bare` is deliberately not in the variant list: it ignores the injected `ANTHROPIC_BASE_URL` and reads the real settings file, so it never reaches the local endpoint.
