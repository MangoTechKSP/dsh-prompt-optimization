# Design notes

The persona text is a working-style prompt: what to do, in what order of priority, and how much prose the answer deserves. It is written against the sections this harness actually assembles, so every tool name in it exists.

## What the plugin keeps and what it replaces

DSH builds the system prompt from named sections. The plugin keeps everything that is *documentation* — tool manuals (`tool:*`), MCP servers (`mcp-*`), the harness identity line, the model line (`deployment:persona-prefix`), file references, plan and team policy — and drops the rest, which is the deployment's own prose about how to behave. Its own text is inserted right after the model line.

Dropping by prefix rather than by exact name is deliberate: a DSH release that rewords a section does not break the plugin, and a release that renames one produces a log line (`replaced N section(s): …`) instead of a silent behaviour change.

## The sections, and why each one exists

| section | why |
| --- | --- |
| Doing tasks | Four kinds of work come through this harness (code, research, documents, machine operations). Code leads; the rest are supported rather than treated as malformed requests. |
| Executing actions with care | Reversibility and blast radius, not a permission ritual. Approval prompts are disabled in some deployments, so the prompt never promises a dialog that will not appear. |
| Tone and style | Short. `file_path:line` references. No colon before a tool call. |
| Text output | The reader cannot see tool calls, so intent goes in prose before the first call, and the turn ends with one or two sentences. |
| Session-specific guidance | Which delegation tool to use, and that a fork executes rather than re-delegates. |
| Context management | Automatic compaction is the default; the explicit compress tool is for reclaiming a spent span inside one turn. |
| Instruction precedence | Five layers, permission facts first, style last, and "the user's requirement is the end; plugins and skills are means". |
| Working with skills and plugins | When to load one, that a catalog entry is a summary, and that a missing plugin is reported rather than faked. |
| Answer shape | Size the answer to the question: two to six lines for a fact, a table for a comparison, numbered steps for a procedure. Images are evidence, not decoration. |
| Aesthetics | Visual deliverables are judged as design: space, one accent, one type scale, checked against the render. |
| Judgment and candor | No unsolicited ethics lectures, no manufactured hedging, disagree once and then act. |
| Privacy and personal data | The workspace is the boundary; no uploads to third parties, no secrets in output or commits, no browsing private directories to "get oriented". |
| Speed | Fewer steps, not shorter words: no re-reading, narrowest read, parallel calls, ship the change. |
| When you are stuck | A long session builds its own gravity. Two failed attempts means changing the shape of the work: delegate to a fresh context, reuse a plugin, or say that a new session seeded with a summary would be faster. |

## Deliberately absent

- Tool manuals. The harness already emits them, and duplicating them costs tokens and drifts out of date.
- A memory system, an environment block, and a model list. All three are facts about one deployment, not about working style.
- Any claim that a tool will ask the user for permission. The deployment decides that, and the prompt points at the deployment's own statement instead.

## Editing

Edit `packages/dsh-claude-code-persona/prompts/claude-code-persona.md`. `node packages/dsh-claude-code-persona/test.mjs` verifies the rewrite: section survival, insertion point, idempotency across two passes, tool-name mapping, and the `imageGuidance` modes.
