# dsh-prompt-optimization

Two packages that give [DeepSeek Harness](https://github.com/deepseek-ai) a terse, imperative working style: short rules, explicit priorities, and answers sized to the question instead of the effort spent on it.

| package | what it does |
| --- | --- |
| [`dsh-optimized-persona`](packages/dsh-optimized-persona) | Rewrites the assembled system prompt at request time. Keeps tool documentation, the identity line, the model line and plan/team policy; replaces the deployment prose with a working-style prompt. |
| [`dsh-optimized-preset`](packages/dsh-optimized-preset) | Three Agent presets — **Optimized**, **Optimized · 独立**, **Optimized · 协作** — with the same tool set and plugin rows as the shipped standard preset, plus the persona plugin. Nothing is removed, so they work on any profile. |

The prompt is written for this harness, not copied into it: tool names point at tools that exist here, and six sections cover things a coding-only prompt never needed — instruction precedence, skills and plugins, answer shape, aesthetics, judgment and candor, privacy and personal data, speed, and what to do when a long session stops making progress. See [docs/design.md](docs/design.md) for the section list and the reasoning behind keeping or dropping each one.

## Install

Persona plugin, from a packed tarball:

```bash
git clone <this repo> && cd dsh-prompt-optimization
npm pack ./packages/dsh-optimized-persona
dsh plugin --profile web add "file:$PWD/dsh-optimized-persona-1.1.0.tgz"
```

Preset bundle, from the directory (bundles install as directories, not tarballs):

```bash
plugin_manager install_bundle <repo>/packages/dsh-optimized-preset
# or: dsh plugin --profile web add "file:<repo>/packages/dsh-optimized-preset"
```

Then restart, or let `patchReload: live` pick it up. The preset appears under **Agent 预设 → 自定义** for new sessions.

Verify without starting anything:

```bash
dsh --profile web --dump-config | grep -c "id: optimized"
```

## Configuration

`dsh-optimized-persona` takes a plain object; unknown keys are ignored.

| key | default | meaning |
| --- | --- | --- |
| `enabled` | `true` | Set `false` to leave the prompt untouched without uninstalling. |
| `promptFile` | bundled `prompts/optimized-persona.md` | Absolute path to a different persona text. The file is re-read when its mtime changes, so edits apply on the next request. |
| `sectionName` | `optimized:persona` | Name of the injected section. Registering twice replaces instead of duplicating. |
| `dropPrefixes` | `['deployment:persona-suffix']` | Section-name prefixes dropped before the prompt is inserted. Default drops only the deployment prose this text replaces; every other section, including other plugins' sections, survives. |
| `dropNames` | `[]` | Exact section names to drop even if a prefix matches. |
| `insertAfter` | `harness:identity`, `deployment:persona-prefix` | Where the persona text is inserted. |
| `logDropped` | `true` | Log each dropped section name once, which is how a DSH upgrade gets noticed. |
| `imageGuidance` | `auto` | `auto` keeps the "you may put images into the conversation" paragraph only when the route actually mounts an image tool (`read_image`, `browser_real_screenshot`, `screen_shot`, `univer_screenshot`); `always` / `never` override it. |
| `autonomy` | `balanced` | `independent` adds "decide alone first, ask only when it changes the deliverable or the action is irreversible"; `collaborative` adds "check in at the forks, offer options before building, stop and ask instead of guessing". `balanced` adds nothing. |

The three presets differ only in this one key: `optimized` uses `balanced`, `optimized-auto` uses `independent`, `optimized-guided` uses `collaborative`. The shared rules — don't reopen a settled decision, flag a real problem once, ask a multiple-choice question when the request is genuinely ambiguous, admit what you don't know — live in the prompt text, so another preset can pick them up with its own `autonomy` setting.

Example profile patch:

```yaml
- id: persona
  name: dsh-optimized-persona
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

`packages/dsh-optimized-persona/prompts/optimized-persona.md` is the whole prompt; edit it and the next request uses it. `node packages/dsh-optimized-persona/test.mjs` checks the rewrite end to end without booting the harness, and fails if a section disappears, a duplicate appears across two passes, or an unmapped tool name leaks through.

## License

Apache-2.0. See [LICENSE](LICENSE).
