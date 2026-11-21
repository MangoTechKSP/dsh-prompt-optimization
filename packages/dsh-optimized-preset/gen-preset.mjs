// Generate the optimized agent presets from the shipped standard preset:
// identical tool set and plugin rows, plus the persona plugin configured for a
// different default level of autonomy. Removing tools here would break every
// profile that installs a different set of plugins.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'E:/DeepSeekHarness/dsh/node_modules/@deepseek-ai/dsh-web-app/presets/standard.patch.yml';
const OUT = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');

const VARIANTS = [
  {
    suffix: 'optimized',
    id: 'optimized',
    name: 'Optimized',
    description: '精简、克制的回答风格与工作流程，工具集与其他预设完全相同。',
    order: 5,
    autonomy: 'balanced',
  },
  {
    suffix: 'optimized-auto',
    id: 'optimized-auto',
    name: 'Optimized · 独立',
    description: '同上，并且尽量自己解决：先查代码、跑命令、派子智能体，必要时才问用户。',
    order: 6,
    autonomy: 'independent',
  },
  {
    suffix: 'optimized-guided',
    id: 'optimized-guided',
    name: 'Optimized · 协作',
    description: '同上，并且随时对齐：有多种做法时先给选项，遇到阻塞或取舍就停下来问。',
    order: 7,
    autonomy: 'collaborative',
  },
];

const src = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const START = '          - id: persona\n';
const at = src.indexOf(START);
if (at < 0) throw new Error('plugins list not found — upstream preset drifted');
const plugins = src.slice(at).replace(/\n*$/, '\n');

const header = [
  '# Agent presets optimized: `@deepseek-ai/dsh-agent-preset` declarations inserted',
  '# after the web patch. Edits saved from the Web editor override a row\'s',
  '# `config.plugins` by id from the profile patch.',
  '- insert:',
  '',
].join('\n');

const blocks = VARIANTS.map((v) => [
  `    - id: preset-${v.suffix}`,
  `      name: '@deepseek-ai/dsh-agent-preset'`,
  `      config:`,
  `        id: ${v.id}`,
  `        name: ${v.name}`,
  `        description: ${v.description}`,
  `        order: ${v.order}`,
  `        plugins:`,
  plugins.replace(/\n$/, ''),
  `          - id: optimized-persona`,
  `            name: dsh-optimized-persona`,
  `            config:`,
  `              autonomy: ${v.autonomy}`,
  `              imageGuidance: auto`,
].join('\n'));

const yml = header + blocks.join('\n') + '\n';

const pkgPath = path.join(OUT, 'package.json');
const current = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};

fs.writeFileSync(path.join(OUT, 'cordis.patch.yml'), yml);
fs.writeFileSync(pkgPath, JSON.stringify({
  name: 'dsh-optimized-preset',
  version: current.version ?? '1.0.0',
  private: true,
  type: 'module',
  license: 'Apache-2.0',
  dsh: { bundle: { patch: './cordis.patch.yml' } },
}, null, 2) + '\n');

console.log('wrote bundle:', OUT);
console.log('lines:', yml.split('\n').length, '| presets:', (yml.match(/^    - id: preset-/gm) || []).length, '| rows:', (yml.match(/^          - id: /gm) || []).length);
