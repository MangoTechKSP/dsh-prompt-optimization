// Multi-mode capture endpoint for Claude Code prompt research.
// Usage: node probe.cjs <port>
//   GET  /__label?name=xxx   -> switch capture label (also picks response mode)
//   POST /v1/messages        -> append request to capture-<label>.jsonl
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = Number(process.argv[2] || 8795);
const DIR = __dirname;

let label = 'unlabelled';
let subagentType = 'general-purpose';
let agentMode = false;

function decode(buf, enc) {
  const e = (enc || '').toLowerCase();
  try {
    if (e.includes('gzip')) return zlib.gunzipSync(buf).toString('utf8');
    if (e.includes('br')) return zlib.brotliDecompressSync(buf).toString('utf8');
    if (e.includes('deflate')) return zlib.inflateSync(buf).toString('utf8');
    if (e.includes('zstd') && zlib.zstdDecompressSync) return zlib.zstdDecompressSync(buf).toString('utf8');
  } catch (err) {
    return '<decode-failed: ' + err.message + '>';
  }
  return buf.toString('utf8');
}

const textReply = {
  id: 'msg_probe',
  type: 'message',
  role: 'assistant',
  model: 'probe',
  content: [{ type: 'text', text: 'ok' }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
};

const agentReply = (type) => ({
  id: 'msg_probe_agent',
  type: 'message',
  role: 'assistant',
  model: 'probe',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_probe_01',
      name: 'Agent',
      input: {
        description: 'probe subagent prompt',
        prompt: 'Report the exact text OK and nothing else.',
        subagent_type: type,
      },
    },
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

let seq = 0;

http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');

    if (u.pathname === '/__label') {
      label = u.searchParams.get('name') || 'unlabelled';
      subagentType = u.searchParams.get('sub') || 'general-purpose';
      agentMode = u.searchParams.get('agent') === '1';
      console.log('label ->', label);
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok ' + label);
    }

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      seq++;
      const raw = Buffer.concat(chunks);
      const text = decode(raw, req.headers['content-encoding']);
      const file = path.join(DIR, 'capture-' + label + '.jsonl');
      fs.appendFileSync(
        file,
        JSON.stringify({
          seq,
          method: req.method,
          url: req.url,
          headers: req.headers,
          rawBytes: raw.length,
          body: text.slice(0, 4000000),
        }) + '\n',
      );
      console.log(`[${seq}] ${label} ${req.method} ${u.pathname} raw=${raw.length} dec=${text.length}`);

      // Agent mode: first request asks for a subagent so the next request carries
      // the subagent's own system prompt.
      let payload = textReply;
      if (agentMode) {
        let isFollowUp = false;
        try {
          const b = JSON.parse(text);
          isFollowUp = JSON.stringify(b.messages || []).includes('toolu_probe_01');
        } catch {}
        payload = isFollowUp ? textReply : agentReply(subagentType);
      }

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log('probe listening on http://127.0.0.1:' + PORT));
