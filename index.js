// index.js
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

// In-memory storage: { code: [ {id, from, cmd, args, ts} ] }
const queues = {};

// Optional: control log noise (set VERBOSE=0 to reduce empty pop logs)
const VERBOSE = process.env.VERBOSE !== '0';

// POST /push
// body: { code: '123456', from: 'pc1', cmd: 'TEST', args: { ... } }
app.post('/push', (req, res) => {
  const { code, from, cmd, args } = req.body || {};
  if (!code || typeof code !== 'string') return res.status(400).json({ ok:false, error:'missing code' });
  if (!cmd) return res.status(400).json({ ok:false, error:'missing cmd' });
  const item = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8),
    from: from || 'unknown',
    cmd,
    args: args || {},
    ts: Date.now()
  };
  queues[code] = queues[code] || [];
  queues[code].push(item);
  console.log(`[PUSH] code=${code} id=${item.id} cmd=${item.cmd} from=${item.from} qlen=${queues[code].length}`);
  return res.json({ ok:true, item });
});

// GET /pop?code=123456
// returns the first queued item for that code and removes it
app.get('/pop', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ ok:false, error:'missing code' });
  const q = queues[code] || [];
  if (q.length === 0) {
    if (VERBOSE) console.log(`[POP] code=${code} empty`);
    return res.json({ ok:true, found:false });
  }
  const item = q.shift();
  console.log(`[POP] code=${code} id=${item.id} cmd=${item.cmd} remaining=${q.length}`);
  return res.json({ ok:true, found:true, item });
});

// GET /peek?code=123456  -> returns all without removing (useful for debugging)
app.get('/peek', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ ok:false, error:'missing code' });
  console.log(`[PEEK] code=${code} size=${(queues[code]||[]).length}`);
  return res.json({ ok:true, queue: queues[code] || [] });
});

// POST /ack  { code, id }  -> just acknowledges (no-op here)
app.post('/ack', (req, res) => {
  const { code, id } = req.body || {};
  if (!code || !id) return res.status(400).json({ ok:false, error:'missing code/id' });
  // no persistence in this simple version
  if (VERBOSE) console.log(`[ACK] code=${code} id=${id}`);
  return res.json({ ok:true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Relay listening on port', port));
