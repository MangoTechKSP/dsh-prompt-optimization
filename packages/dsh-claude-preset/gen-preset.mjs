// Generate the "claude" agent preset bundle from the shipped standard preset:
// same tool set minus Office/Univer, with its own name and description.
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'E:/DeepSeekHarness/dsh/node_modules/@deepseek-ai/dsh-web-app/presets/standard.patch.yml';
const OUT = 'E:/DeepSeekHarness/WorkSpace/dsh-plugins/dsh-claude-preset';

let yml = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');

// the preset row itself
yml = yml.replace('# Agent preset standard:', '# Agent preset claude:');
yml = yml.replace('- id: preset-standard', '- id: preset-claude');
yml = yml.replace('        id: standard\n', '        id: claude\n        name: Claude\n        description: Claude Code 风格提示词，精简编码工具集（不含 Office/Univer）。\n');
yml = yml.replace('        order: 1\n', '        order: 5\n');

// drop the Office/Univer tool group
const office = /          - id: tool-office\n            name: '@deepseek-ai\/dsh-tool-office'\n/;
if (!office.test(yml)) throw new Error('tool-office entry not found — pattern drifted');
yml = yml.replace(office, '');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'cordis.patch.yml'), yml);
fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({
  name: '@local/dsh-claude-preset',
  version: '1.0.0',
  private: true,
  type: 'module',
  dsh: { bundle: { patch: './cordis.patch.yml' } },
}, null, 2) + '\n');

console.log('wrote bundle:', OUT);
console.log('lines:', yml.split('\n').length, '| has claude id:', /id: claude\n/.test(yml), '| office removed:', !yml.includes('dsh-tool-office'));
