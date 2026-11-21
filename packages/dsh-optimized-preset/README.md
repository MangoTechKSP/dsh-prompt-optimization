# dsh-optimized-preset

An Agent preset named **Optimized** for the DSH Web UI. It is the shipped `standard` preset — same tool rows, same plugin rows — with a different id, name and description. Tools are never added or removed, so the preset behaves identically no matter which plugins a profile has installed.

Pair it with [`dsh-optimized-persona`](../dsh-optimized-persona) for the prompt rewrite; the preset only makes those rules selectable as a named mode next to Standard / PTC / Minimal / Creative.

## Install

```bash
dsh plugin --profile web add ./packages/dsh-optimized-preset
```

or point `plugin_manager`'s `install_bundle` at this directory. Restart DSH (or let `patchReload: live` pick it up) and the preset appears in the preset picker as **Optimized**.

If a profile already ships its own `tool-office` or any other row, leave it alone — the preset copies whatever `standard` declares at generation time and removes nothing.

## Regenerate

`gen-preset.mjs` derives `cordis.patch.yml` from the installed DSH:

```bash
node packages/dsh-optimized-preset/gen-preset.mjs
```

It reads `node_modules/@deepseek-ai/dsh-web-app/presets/standard.patch.yml`, renames the row to `preset-optimized` / `id: optimized`, sets `order: 5`, and rewrites `package.json`. It fails loudly if the upstream preset's shape changes, rather than emitting a half-renamed bundle.

## License

Apache-2.0, see the repository root `LICENSE`.
