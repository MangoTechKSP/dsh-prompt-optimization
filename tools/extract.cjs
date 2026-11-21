// Extract system prompts / tool inventories from captured request JSONL.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const OUT = path.join(DIR, 'extracted');
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(DIR).filter((f) => f.startsWith('capture-') && f.endsWith('.jsonl'));
const report = [];

function headings(text) {
  return (text.match(/^#{1,3} .+$/gm) || []).map((h) => h.trim());
}

for (const f of files) {
  const label = f.replace(/^capture-|\.jsonl$/g, '');
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter(Boolean);
  let n = 0;
  for (const line of lines) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (!rec.body || rec.body.length < 500) continue;
    let b;
    try {
      b = JSON.parse(rec.body);
    } catch {
      report.push(`${label}: unparseable body seq=${rec.seq} len=${rec.body.length}`);
      continue;
    }
    n++;
    const sys = Array.isArray(b.system) ? b.system : b.system ? [{ text: b.system }] : [];
    const sysText = sys.map((s) => s.text || '').join('\n\n');
    const tools = (b.tools || []).map((t) => t.name);
    const base = `${label}__r${n}`;
    fs.writeFileSync(path.join(OUT, base + '.system.txt'), sysText);
    fs.writeFileSync(
      path.join(OUT, base + '.meta.json'),
      JSON.stringify(
        {
          label,
          seq: rec.seq,
          model: b.model,
          headerVersion: rec.headers['anthropic-version'],
          betas: rec.headers['anthropic-beta'],
          sysBlocks: sys.map((s) => ({ len: (s.text || '').length, cache: !!s.cache_control })),
          tools: tools.map((t) => ({ name: t, len: JSON.stringify((b.tools || []).find((x) => x.name === t)).length })),
          msgs: (b.messages || []).length,
          firstUserLen: b.messages?.[0] ? JSON.stringify(b.messages[0]).length : 0,
          maxTokens: b.max_tokens,
        },
        null,
        2,
      ),
    );
    report.push(
      `${base}: model=${b.model} sysChars=${sysText.length} blocks=[${sys.map((s) => (s.text || '').length).join(',')}] tools=${tools.length} msgs=${(b.messages || []).length} firstUser=${b.messages?.[0] ? JSON.stringify(b.messages[0]).length : 0}`,
    );
    report.push(`   tools: ${tools.join(', ')}`);
    report.push(`   headings: ${headings(sysText).join(' | ')}`);
  }
  report.push(`   -> ${f}: ${n} usable record(s)`);
}
fs.writeFileSync(path.join(DIR, 'extract-report.txt'), report.join('\n'));
console.log(report.join('\n'));
