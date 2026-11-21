# dsh-prompt-optimization

Two packages that give [DeepSeek Harness](https://github.com/deepseek-ai) a terse, imperative working style: short rules, explicit priorities, and answers sized to the question instead of the effort spent on it.

| package | what it does |
| --- | --- |
| [`dsh-claude-code-persona`](packages/dsh-claude-code-persona) | Rewrites the assembled system prompt at request time. Keeps tool documentation, the identity line, the model line and plan/team policy; replaces the deployment prose with a working-style prompt. |
| [`dsh-claude-preset`](packages/dsh-claude-preset) | An Agent preset named **Claude** with a lean coding tool set (Office/Univer tools removed). Works with or without the persona plugin. |

The prompt is written for this harness, not copied into it: tool names point at tools that exist here, and six sections cover things a coding-only prompt never needed — instruction precedence, skills and plugins, answer shape, aesthetics, judgment and candor, privacy and personal data, speed, and what to do when a long session stops making progress. See [docs/design.md](docs/design.md) for the section list and the reasoning behind keeping or dropping each one.

## Install

Persona plugin, from a packed tarball:

```bash
git clone <this repo> && cd dsh-prompt-optimization
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
dsh --profile web --dump-config | grep -c "id: preset-claude"
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
| `imageGuidance` | `auto` | `auto` keeps the "you may put images into the conversation" paragraph only when the route actually mounts an image tool (`read_image`, `browser_real_screenshot`, `screen_shot`, `univer_screenshot`); `always` / `never` override it. |

Example profile patch:

```yaml
- id: persona
  name: dsh-claude-code-persona
  config:
    dropNames: ['app:web-surface']
```

## Images in the conversation

A model has no message part to attach an image to, so the picture goes where the text goes: the prompt tells the model to produce an image with `read_image` (PNG/JPEG/WebP/GIF, committed through the attachment store, so it sees exactly the pixels the user will see), `browser_real_screenshot`, `screen_shot` or `univer_screenshot`, and then embed it in the reply itself as a markdown image pointing at the file. The reader sees it inline, without opening anything; `present()` is only for deliverables the user should keep.

The plugin does not reimplement `read_image`; it owns the two ends it can affect — the instruction that says when a picture beats prose, and `imageGuidance: auto`, which drops that instruction on routes that do not mount an image tool.

## How it works

DSH assembles the system prompt from named sections and runs a waterfall hook, `system-prompt/assemble`, before sending it. The plugin joins that hook, drops every section whose name is not tool or deployment documentation, and inserts its own text. Because the rule is by name prefix, a DSH release that rewords the built-in sections does not break it — an upgrade that renames one shows up as a line in the log instead of a silent behaviour change.

Nothing here depends on `@deepseek-ai/*` at runtime, so it resolves the same whether the profile links it or copies it in.

## Editing the prompt

`packages/dsh-claude-code-persona/prompts/claude-code-persona.md` is the whole prompt; edit it and the next request uses it. `node packages/dsh-claude-code-persona/test.mjs` checks the rewrite end to end without booting the harness, and fails if a section disappears, a duplicate appears across two passes, or a Claude-only tool name leaks through.

## License

Apache-2.0. See [LICENSE](LICENSE).
