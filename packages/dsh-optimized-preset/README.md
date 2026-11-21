# dsh-optimized-preset

A DSH Agent preset named **Claude**: the standard tool set minus the Office/Univer tools, paired with the Claude Code style prompt from the sibling package.

```
Agent 预设 → 自定义 → Claude
```

It is a bundle, not a plugin: `cordis.patch.yml` declares one `@deepseek-ai/dsh-agent-preset` row with `id: claude`, `order: 5`, and an explicit `plugins` list so the preset does not inherit whatever the profile happens to have installed. Derive a variant by editing that list — `gen-preset.mjs` regenerates it from a newer `standard.patch.yml` when DSH ships one with new sections.
