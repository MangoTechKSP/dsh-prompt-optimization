// Scan claude.exe for long printable ASCII runs (prompt-sized text blobs).
const fs = require('fs');
const path = require('path');

const BIN =
  process.argv[2] ||
  'C:/Users/MSI-ZYQ/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe';
const OUT = path.join(__dirname, 'mined-strings.txt');
const MIN = Number(process.argv[3] || 300);

const size = fs.statSync(BIN).size;
const fd = fs.openSync(BIN, 'r');
const CHUNK = 1 << 24;
let carry = Buffer.alloc(0);
const runs = [];

function harvest(buf) {
  // printable = \t \n \r, 0x20-0x7e
  let start = -1;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    const ok = c === 9 || c === 10 || c === 13 || (c >= 0x20 && c <= 0x7e);
    if (ok) {
      if (start < 0) start = i;
    } else {
      if (start >= 0 && i - start >= MIN) runs.push(buf.toString('latin1', start, i));
      start = -1;
    }
  }
  return start >= 0 ? buf.subarray(start) : Buffer.alloc(0);
}

for (let off = 0; off < size; off += CHUNK) {
  const len = Math.min(CHUNK, size - off);
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, off);
  const joined = carry.length ? Buffer.concat([carry, buf]) : buf;
  carry = harvest(joined);
  if (runs.length > 4000) break;
}
fs.closeSync(fd);

// dedupe, keep order
const seen = new Set();
const uniq = [];
for (const r of runs) {
  if (seen.has(r)) continue;
  seen.add(r);
  uniq.push(r);
}
fs.writeFileSync(OUT, uniq.join('\n\n===== RUN =====\n\n'));
console.log('runs>=', MIN, ':', runs.length, 'unique:', uniq.length);
console.log('out:', OUT, 'bytes:', fs.statSync(OUT).size);
const lens = uniq.map((s) => s.length).sort((a, b) => b - a);
console.log('largest 10:', lens.slice(0, 10).join(', '));
