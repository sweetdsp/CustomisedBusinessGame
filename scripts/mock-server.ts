// Local stand-in for the Supabase function, for browser testing only: same referee code, in-memory store.
import { createServer } from 'node:http';
import { handle } from '../src/server/handler.ts';
import { ConflictError, type Store, type Stored } from '../src/server/types.ts';

class MemStore implements Store {
  rows = new Map<string, Stored>();
  clone = (s: Stored): Stored => JSON.parse(JSON.stringify(s));
  async byId(id: string) { const s = this.rows.get(id); return s ? this.clone(s) : null; }
  async byCode(code: string) { for (const s of this.rows.values()) if (s.row.code === code) return this.clone(s); return null; }
  async create(s: Stored) { this.rows.set(s.row.id, this.clone(s)); }
  async save(s: Stored) {
    const cur = this.rows.get(s.row.id);
    if (!cur || cur.row.version !== s.row.version) throw new ConflictError();
    const next = this.clone(s); next.row.version++; this.rows.set(s.row.id, next); s.row.version = next.row.version;
  }
}
const store = new MemStore();
const port = Number(process.argv[2] ?? 8787);
createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(404, cors); res.end(); return; } // e.g. the live-update socket, which this stand-in does not offer
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400, cors); res.end(); return; }
    const out = await handle(store, parsed, { now: Date.now(), rng: Math.random, uuid: () => crypto.randomUUID() });
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out));
  });
}).listen(port, () => console.log('mock referee on', port));
