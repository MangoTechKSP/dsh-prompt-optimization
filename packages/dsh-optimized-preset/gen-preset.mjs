// Generate the "optimized" agent preset from the shipped standard preset:
// identical tool set and plugin rows — only the preset's own name, id and
// description change. Removing tools here would break every profile that
// installs a different set of plugins.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'E:/DeepSeekHarness/dsh/node_modules/@deepseek-ai/dsh-web-app/presets/standard.patch.yml';
const OUT = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');

let yml = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');

if (!yml.includes('- id: preset-standard')) throw new Error('preset-standard row not found — upstream preset drifted');
if (!yml.includes('        id: standard\n')) throw new Error('standard preset id not found — upstream preset drifted');

yml = yml.replace('# Agent preset standard:', '# Agent preset optimized:');
yml = yml.replace('- id: preset-standard', '- id: preset-optimized');
yml = yml.replace(
  '        id: standard\n',
  '        id: optimized\n        name: Optimized\n        description: 精简、克制的回答风格与工作流程，工具集与其他预设完全相同。\n',
);
yml = yml.replace('        order: 1\n', '        order: 5\n');

fs.writeFileSync(path.join(OUT, 'cordis.patch.yml'), yml);
fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({
  name: 'dsh-optimized-preset',
  version: '1.0.0',
  private: true,
  type: 'module',
  license: 'Apache-2.0',
  dsh: { bundle: { patch: './cordis.patch.yml' } },
}, null, 2) + '\n');

console.log('wrote bundle:', OUT);
console.log('lines:', yml.split('\n').length, '| rows:', (yml.match(/^          - id: /gm) || []).length, '| id optimized:', /id: optimized\n/.test(yml));
