// index.js
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

// In-memory storage: { code: [ {id, from, cmd, args, ts} ] }
const queues = {};

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
  return res.json({ ok:true, item });
});

// GET /pop?code=123456
// returns the first queued item for that code and removes it
app.get('/pop', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ ok:false, error:'missing code' });
  const q = queues[code] || [];
  if (q.length === 0) return res.json({ ok:true, found:false });
  const item = q.shift();
  return res.json({ ok:true, found:true, item });
});

// GET /peek?code=123456  -> returns all without removing (useful for debugging)
app.get('/peek', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ ok:false, error:'missing code' });
  return res.json({ ok:true, queue: queues[code] || [] });
});

// POST /ack  { code, id }  -> just acknowledges (no-op here)
app.post('/ack', (req, res) => {
  const { code, id } = req.body || {};
  if (!code || !id) return res.status(400).json({ ok:false, error:'missing code/id' });
  // no persistence in this simple version
  return res.json({ ok:true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Relay listening on port', port));