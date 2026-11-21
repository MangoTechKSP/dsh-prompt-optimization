# Notice

This repository contains two kinds of material.

**Code** — the plugin, the preset bundle and the capture tools — is original work, licensed MIT (see [LICENSE](LICENSE)).

**Prompt text** — `packages/dsh-claude-code-persona/prompts/claude-code-persona.md` — is a derivative of the system prompt shipped inside Anthropic's [Claude Code](https://www.anthropic.com/claude-code) CLI. It was captured locally from an installed copy of that CLI (see [docs/provenance.md](docs/provenance.md)), then edited: tool names were remapped to this harness, sections that only make sense inside Claude Code were dropped, and several sections were written for this harness.

What that means in practice:

- This project is **not affiliated with, endorsed by, or supported by Anthropic**.
- Anthropic's own terms of service govern your use of Claude Code and of material derived from it. This repository republishes adapted prompt text for interoperability with a different agent harness; whether that is acceptable for your jurisdiction and your subscription is your call, not the maintainers'.
- No Anthropic binaries, keys or customer data are included. The capture tools only read a CLI that is already installed on your machine.
- If the maintainers of the upstream prompt object, the prompt text will be removed and the plugin will ship a capture script instead: the code, the hook and the packing pipeline do not depend on that file's content.

The name "Claude" is a trademark of Anthropic, used here only to describe what the prompt was modelled on.
