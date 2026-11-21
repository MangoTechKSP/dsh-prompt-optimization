# dsh-claude-code

Two packages that give [DeepSeek Harness](https://github.com/deepseek-ai) a Claude Code style system prompt: short imperative rules, explicit priorities, and answers sized to the question instead of the effort.

| package | what it does |
| --- | --- |
| [`dsh-claude-code-persona`](packages/dsh-claude-code-persona) | Rewrites the assembled system prompt at request time. Keeps tool documentation, the identity line, the model line, plan/team policy; replaces the rest with a working-style prompt. |
| [`dsh-claude-preset`](packages/dsh-claude-preset) | An Agent preset named **Claude** with a lean coding tool set (Office/Univer tools removed). Works with or without the persona plugin. |

The persona plugin does not copy Claude Code's text verbatim — it carries the *behaviour* of that prompt, re-pointed at tools this harness actually has, plus five sections Claude Code has no equivalent for: instruction precedence, skills and plugins, answer shape, aesthetics, and privacy. See [docs/provenance.md](docs/provenance.md) for exactly what was taken, what was dropped and why.

## Install

Persona plugin, from a packed tarball:

```bash
git clone <this repo> && cd dsh-claude-code
npm pack ./packages/dsh-claude-code-persona
dsh plugin --profile web add "file:$PWD/dsh-claude-code-persona-1.0.0.tgz"
```

Preset bundle, from the directory (bundles install as directories, not tarballs):

```bash
plugin_manager install_bundle <repo>/packages/dsh-claude-preset
# or: dsh plugin --profile web add "file:<repo>/packages/dsh-claude-preset"
```

Then restart, or let `patchReload: live` pick it up. The preset appears under **Agent 预设 → 自定义** for new sessions.

Verify without starting anything:

```bash
printf 'plan:policy must survive: '; dsh --profile web --dump-config | grep -c "id: preset-claude"
```

## Configuration

`dsh-claude-code-persona` takes a plain object; unknown keys are ignored.

| key | default | meaning |
| --- | --- | --- |
| `enabled` | `true` | Set `false` to leave the prompt untouched without uninstalling. |
| `promptFile` | bundled `prompts/claude-code-persona.md` | Absolute path to a different persona text. The file is re-read when its mtime changes, so edits apply on the next request. |
| `sectionName` | `claude-code:persona` | Name of the injected section. Registering twice replaces instead of duplicating. |
| `keepPrefixes` | `tool:`, `mcp-`, `harness:identity`, `deployment:persona-prefix`, `context:`, `ui:deliverable`, `free-search:`, `plan:`, `team:`, `app:`, `structured:` | Section-name prefixes kept as-is. Everything else is treated as deployment prose and dropped. |
| `dropNames` | `[]` | Exact section names to drop even if a prefix matches. |
| `insertAfter` | `harness:identity`, `deployment:persona-prefix` | Where the persona text is inserted. |
| `logDropped` | `true` | Log each dropped section name once, which is how a DSH upgrade gets noticed. |

Example profile patch:

```yaml
- id: persona
  name: dsh-claude-code-persona
  config:
    dropNames: ['app:web-surface']
```

## How it works

DSH assembles the system prompt from named sections and runs a waterfall hook, `system-prompt/assemble`, before sending it. The plugin joins that hook, drops every section whose name is not tool or deployment documentation, and inserts its own text. Because the rule is by name prefix, a DSH release that rewords the built-in sections does not break it — an upgrade that renames one shows up as a line in the log instead of a silent behaviour change.

Nothing here depends on `@deepseek-ai/*` at runtime, so it resolves the same whether the profile links it or copies it in.

## Keeping up with Claude Code

The persona text is derived from the prompt of the Claude Code CLI release recorded in `prompts/claude-code.version.json`. When Anthropic ships a new release, `tools/` can re-capture the differences locally instead of guessing — see [docs/provenance.md](docs/provenance.md).

## License

MIT for the code. The prompt text is a derivative of Anthropic's Claude Code system prompt — read [NOTICE.md](NOTICE.md) before redistributing.
