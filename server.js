import crypto from 'node:crypto';
import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000;
const makeId = () => crypto.randomBytes(5).toString('base64url').toUpperCase();

app.post('/session', (_req, res) => {
  let id;
  do id = makeId(); while (sessions.has(id));
  sessions.set(id, { createdAt: Date.now(), sender: null, receiver: null });
  res.status(201).json({ id, expiresIn: SESSION_TTL_MS / 1000 });
});

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`QuickTransfer ready at http://localhost:${port}`);
});
const wss = new WebSocketServer({ server, path: '/signal' });

function send(ws, message) { if (ws?.readyState === ws?.OPEN) ws.send(JSON.stringify(message)); }
function closeSession(id) {
  const session = sessions.get(id);
  if (!session) return;
  send(session.sender, { type: 'peer-left' });
  send(session.receiver, { type: 'peer-left' });
  sessions.delete(id);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get('session');
  const role = url.searchParams.get('role');
  const session = sessions.get(id);
  if (!session || Date.now() - session.createdAt > SESSION_TTL_MS || !['sender', 'receiver'].includes(role)) {
    send(ws, { type: 'error', message: 'This transfer session has expired.' }); ws.close(); return;
  }
  if (session[role]) { send(ws, { type: 'error', message: `A ${role} is already connected.` }); ws.close(); return; }
  session[role] = ws;
  send(ws, { type: 'ready', role });
  const other = role === 'sender' ? session.receiver : session.sender;
  if (other) { send(other, { type: 'peer-joined' }); send(ws, { type: 'peer-joined' }); }
  ws.on('message', raw => {
    let message; try { message = JSON.parse(raw); } catch { return; }
    if (['offer', 'answer', 'candidate'].includes(message.type)) send(role === 'sender' ? session.receiver : session.sender, message);
  });
  ws.on('close', () => { if (sessions.get(id)?.[role] === ws) closeSession(id); });
});

setInterval(() => {
  for (const [id, s] of sessions) if (Date.now() - s.createdAt > SESSION_TTL_MS) closeSession(id);
}, 60_000).unref();
