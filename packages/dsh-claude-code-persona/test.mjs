// Unit test for the prompt rewrite, runnable without booting the harness:
//   node test.mjs
import assert from 'node:assert/strict';
import { apply } from './lib/index.js';

function fakeCtx() {
  const handlers = [];
  return {
    handlers,
    ctx: {
      on(event, handler, options) {
        handlers.push({ event, handler, options });
        return () => {};
      },
    },
  };
}

function assembly() {
  return {
    sections: [
      { name: 'harness:identity', text: 'You are an AI agent powered by DeepSeek Harness.' },
      { name: 'deployment:persona-prefix', text: 'You are a coding agent powered by the {{model}} model.' },
      { name: 'deployment:persona-suffix', text: 'Your working directory is {{cwd}}.' },
      { name: 'plan:policy', text: 'PLAN POLICY TEXT' },
      { name: 'team:policy', text: 'TEAM POLICY TEXT' },
      { name: 'app:web-surface', text: 'WEB SURFACE TEXT' },
      { name: 'tool:bash', text: 'bash tool docs' },
      { name: 'mcp-resource-servers', text: 'mcp servers' },
    ],
    contexts: [],
    tools: [],
    variables: { model: 'deepseek-flash', cwd: 'E:/x' },
  };
}

const { ctx, handlers } = fakeCtx();
apply(ctx, {});
const entry = handlers.find((h) => h.event === 'system-prompt/assemble');
assert.ok(entry, 'registered the assemble hook');
assert.equal(entry.options.prepend, true, 'runs before other listeners');

const out = await entry.handler(assembly(), {}, async () => assembly());
const names = out.sections.map((s) => s.name);

assert.deepEqual(
  names,
  [
    'harness:identity',
    'deployment:persona-prefix',
    'claude-code:persona',
    'plan:policy',
    'team:policy',
    'app:web-surface',
    'tool:bash',
    'mcp-resource-servers',
  ],
  'keeps identity/model/plan/team/tool sections, drops deployment prose, inserts the block after the model line',
);

const block = out.sections.find((s) => s.name === 'claude-code:persona');
assert.ok(block.text.length > 10000, 'persona text loaded from prompts/');
assert.equal(block.interpolate, false, 'persona text is never template-interpolated');
assert.ok(block.text.includes('# Executing actions with care'), 'carries the Claude Code sections');
assert.ok(block.text.includes('the skill tool'), 'keeps the skill guidance');
assert.ok(
  !/\b(TaskCreate|TodoWrite|WebFetch|WebSearch|MultiEdit)\b/.test(block.text),
  'no Claude-only tool names survive mapping',
);
assert.ok(!block.text.includes('Read('), 'no unmapped Claude tool names');

// unknown sections from plugins installed later are dropped by default
const withUnknown = assembly();
withUnknown.sections.push({ name: 'some-future-plugin:policy', text: 'x' });
const out2 = await entry.handler(withUnknown, {}, async () => withUnknown);
assert.ok(!out2.sections.some((s) => s.name === 'some-future-plugin:policy'), 'unknown sections dropped');

// a second pass over this plugin's own output (duplicate registration after a
// live reload) must not stack a second copy of the block
const twice = await entry.handler(out, {}, async () => out);
assert.equal(twice.sections.filter((s) => s.name === 'claude-code:persona').length, 1, 'idempotent across passes');
assert.deepEqual(twice.sections.map((s) => s.name), names, 'second pass leaves the same section list');

// keepPrefixes can be extended through config
const custom = fakeCtx();
apply(custom.ctx, { keepPrefixes: ['tool:', 'harness:identity', 'deployment:persona-prefix', 'plan:'] });
const customEntry = custom.handlers.find((h) => h.event === 'system-prompt/assemble');
const out3 = await customEntry.handler(assembly(), {}, async () => assembly());
assert.ok(out3.sections.some((s) => s.name === 'plan:policy'), 'config can preserve a section');

// image guidance follows the route's tools
assert.ok(!block.text.includes('Images are evidence'), 'drops image guidance when no image tool is mounted');

const withImage = assembly();
withImage.tools = [{ name: 'read_image' }];
const imageOut = await entry.handler(withImage, {}, async () => withImage);
const imageBlock = imageOut.sections.find((s) => s.name === 'claude-code:persona');
assert.ok(imageBlock.text.includes('Images are evidence'), 'keeps image guidance when read_image is mounted');
assert.ok(imageBlock.text.includes('read_image'), 'names the tool that does it');

const forced = fakeCtx();
apply(forced.ctx, { imageGuidance: 'always' });
const forcedEntry = forced.handlers.find((h) => h.event === 'system-prompt/assemble');
const forcedOut = await forcedEntry.handler(assembly(), {}, async () => assembly());
assert.ok(
  forcedOut.sections.find((s) => s.name === 'claude-code:persona').text.includes('Images are evidence'),
  'imageGuidance: always keeps the paragraph without an image tool',
);

const off2 = fakeCtx();
apply(off2.ctx, { imageGuidance: 'never' });
const offEntry = off2.handlers.find((h) => h.event === 'system-prompt/assemble');
const offOut = await offEntry.handler(withImage, {}, async () => withImage);
assert.ok(
  !offOut.sections.find((s) => s.name === 'claude-code:persona').text.includes('Images are evidence'),
  'imageGuidance: never drops the paragraph even with an image tool',
);

// disabled means no hook at all
const off = fakeCtx();
apply(off.ctx, { enabled: false });
assert.equal(off.handlers.length, 0, 'disabled plugin registers nothing');

console.log('ok: all assertions passed');
