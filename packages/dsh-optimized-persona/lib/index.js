// Replace this harness's deployment prose in the system prompt with the Claude
// Code working-style prompt, keeping tool documentation, the identity line and
// the model line intact.
//
// It rewrites the assembled prompt (the `system-prompt/assemble` waterfall), so
// it survives upstream changes to individual section text: sections are kept or
// dropped by *name prefix*, and anything unknown is dropped by default and
// logged once, which is what makes "sync with the new DSH version" a matter of
// reading the log rather than editing prompts.
//
// Deliberately dependency-free: no schemastery import, so the package resolves
// the same whether it is linked from the profile or copied into it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cordis plugin name. */
export const name = 'optimized-persona';

/** The prompt registry this row hooks. */
export const inject = ['systemPrompt'];

const DEFAULT_PROMPT = fileURLToPath(new URL('../prompts/optimized-persona.md', import.meta.url));

const DEFAULTS = {
  enabled: true,
  promptFile: '',
  sectionName: 'optimized:persona',
  // Only sections this plugin actually overwrites are dropped; everything else
  // stays, including whatever other plugins contribute. A keep-list would
  // silently delete a stranger's section, so the default is a drop-list of one:
  // the deployment's own persona suffix, which this text replaces. `plan:`,
  // `team:` and any tool/MCP section must survive untouched.
  dropPrefixes: ['deployment:persona-suffix'],
  dropNames: [],
  insertAfter: ['harness:identity', 'deployment:persona-prefix'],
  logDropped: true,
  // The prompt tells the model it may put images into the conversation itself.
  // Keep that paragraph only when the current route actually has a tool that can
  // do it, so a lean preset never advertises a capability it does not have.
  imageGuidance: 'auto',
};

/** Tools that can commit an image into the conversation. */
const IMAGE_TOOLS = ['read_image', 'browser_real_screenshot', 'browser_screenshot', 'screen_shot', 'univer_screenshot'];

/** Does the assembled route expose at least one image-inserting tool? */
function routeHasImageTool(composed) {
  const tools = Array.isArray(composed?.tools) ? composed.tools : [];
  return tools.some((tool) => IMAGE_TOOLS.includes(tool?.name));
}

/** Remove the "images are evidence" paragraph, leaving the rest of the section. */
function stripImageParagraph(text) {
  const paragraphs = text.split('\n\n');
  const kept = paragraphs.filter((paragraph) => !paragraph.startsWith('Images are evidence, not decoration'));
  return kept.length === paragraphs.length ? text : kept.join('\n\n');
}

let cache = { file: '', mtimeMs: 0, text: '' };

/** Read the persona text, re-reading whenever the file changes on disk. */
function loadPrompt(file) {
  const stat = fs.statSync(file);
  if (cache.file !== file || cache.mtimeMs !== stat.mtimeMs) {
    cache = { file, mtimeMs: stat.mtimeMs, text: fs.readFileSync(file, 'utf8').trim() };
  }
  return cache.text;
}

/**
 * Install the persona rewrite for every agent scope.
 * @param ctx - plugin context (must provide `systemPrompt`).
 * @param config - optional overrides; see {@link DEFAULTS}.
 */
export function apply(ctx, config) {
  const cfg = { ...DEFAULTS, ...(config ?? {}) };
  if (!cfg.enabled) return;

  const file = cfg.promptFile ? path.resolve(cfg.promptFile) : DEFAULT_PROMPT;
  const reported = new Set();

  ctx.on('system-prompt/assemble', async (assembly, _context, next) => {
    const composed = await next();
    if (!composed || !Array.isArray(composed.sections)) return composed;

    let text;
    try {
      text = loadPrompt(file);
    } catch (error) {
      const sig = `read:${error.code ?? error.message}`;
      if (!reported.has(sig)) {
        reported.add(sig);
        console.warn(`[optimized-persona] cannot read ${file}: ${error.message}`);
      }
      return composed;
    }
    if (!text) return composed;

    const wantsImages = cfg.imageGuidance === 'always' || (cfg.imageGuidance === 'auto' && routeHasImageTool(composed));
    if (!wantsImages) text = stripImageParagraph(text);

    const kept = [];
    const dropped = [];
    for (const section of composed.sections) {
      // A block carrying our own name means an earlier pass of this same hook
      // (duplicate registration after a live reload) already ran: drop it
      // silently and re-insert, so the prompt never grows a second copy.
      if (section.name === cfg.sectionName) continue;
      const keep = !cfg.dropNames.includes(section.name) && !cfg.dropPrefixes.some((prefix) => section.name.startsWith(prefix));
      (keep ? kept : dropped).push(section);
    }

    if (cfg.logDropped && dropped.length > 0) {
      const signature = dropped.map((section) => section.name).sort().join('|');
      if (!reported.has(signature)) {
        reported.add(signature);
        console.warn(`[optimized-persona] replaced ${dropped.length} section(s): ${dropped.map((section) => section.name).join(', ')}`);
      }
    }

    const block = { name: cfg.sectionName, text, interpolate: false };
    let index = -1;
    for (const anchor of cfg.insertAfter) {
      const at = kept.findIndex((section) => section.name === anchor);
      if (at > index) index = at;
    }
    const sections = index >= 0
      ? [...kept.slice(0, index + 1), block, ...kept.slice(index + 1)]
      : [block, ...kept];

    return { ...composed, sections };
  }, { prepend: true });
}

export { DEFAULTS };
export default apply;
