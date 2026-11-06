// Tests the online referee with an in-memory store (no network, no Supabase needed).
import { handle, type Deps } from '../src/server/handler.ts';
import { ConflictError, type Request, type Response, type Store, type Stored } from '../src/server/types.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };

class MemStore implements Store {
  rows = new Map<string, Stored>();
  clone = (s: Stored): Stored => JSON.parse(JSON.stringify(s));
  async byId(id: string) { const s = this.rows.get(id); return s ? this.clone(s) : null; }
  async byCode(code: string) { for (const s of this.rows.values()) if (s.row.code === code) return this.clone(s); return null; }
  async create(s: Stored) { this.rows.set(s.row.id, this.clone(s)); }
  async save(s: Stored) {
    const cur = this.rows.get(s.row.id);
    if (!cur || cur.row.version !== s.row.version) throw new ConflictError();
    const next = this.clone(s); next.row.version++; this.rows.set(s.row.id, next);
  }
}
let seed = 5;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
let n = 0;
let now = 1_000_000;
const D = (): Deps => ({ now, rng, uuid: () => 'id-' + ++n });
const call = (store: Store, r: Request) => handle(store, r, D());
const ok = (r: Response) => { if (!r.ok) throw new Error('unexpected: ' + r.error); return r; };

const store = new MemStore();
const created = ok(await call(store, {
  op: 'create', startingCash: 200000, endMode: { kind: 'lastStanding' },
  seats: [{ kind: 'host', name: 'Host', token: '🛕' }, { kind: 'online', name: '', token: '🛕' }, { kind: 'computer', level: 'Easy', name: 'Bot', token: '⛵' }],
}));
const row = created.row, hostSecret = created.secret!;
eq(/^[A-Z0-9]{6}$/.test(row.code), 'room code is six letters and numbers');
eq(new Set(row.seats.map((s) => s.token)).size === 3, 'no two seats share a token');
eq(row.status === 'lobby' && !row.seats[1].taken && row.seats[0].taken && row.seats[2].taken, 'online seat starts open');
eq(!JSON.stringify(row).includes(hostSecret), 'the public record never holds secrets');

// start needs every seat filled
eq(!(await call(store, { op: 'start', gameId: row.id, secret: hostSecret })).ok, 'cannot start with an open seat');
// joining
const j = ok(await call(store, { op: 'join', code: row.code.toLowerCase(), name: 'Asha', token: '🐘' }));
eq(j.seat === 1 && j.row.seats[1].name === 'Asha' && j.row.seats[1].token === '🐘', 'join takes the open online seat with chosen name and token');
const joinSecret = j.secret!;
const full = await call(store, { op: 'join', code: row.code, name: 'Late' });
eq(!full.ok, 'code stops working once all seats are filled');
eq(!(await call(store, { op: 'join', code: 'ZZZZZZ', name: 'x' })).ok, 'unknown code refused');
// token choices
eq(!(await call(store, { op: 'token', gameId: row.id, secret: joinSecret, seat: 1, token: '🛕' })).ok, 'cannot take a token already used');
eq((await call(store, { op: 'token', gameId: row.id, secret: joinSecret, seat: 1, token: '🥭' })).ok, 'can change own token in the lobby');
eq(!(await call(store, { op: 'token', gameId: row.id, secret: joinSecret, seat: 0, token: '🐘' })).ok, 'cannot change another seat');
// host can remove, then the seat is open again
ok(await call(store, { op: 'remove', gameId: row.id, secret: hostSecret, seat: 1 }));
eq((await store.byId(row.id))!.row.seats[1].taken === false, 'host removes a player from the lobby');
eq(!(await call(store, { op: 'remove', gameId: row.id, secret: joinSecret, seat: 1 })).ok, 'only the host removes players');
const j2 = ok(await call(store, { op: 'join', code: row.code, name: 'Ravi' }));
const secret2 = j2.secret!;
eq(!(await call(store, { op: 'ping', gameId: row.id, secret: joinSecret })).ok, 'the removed player is no longer known');
// chat
ok(await call(store, { op: 'chat', gameId: row.id, secret: secret2, seat: 1, text: 'hello 👋' }));
eq((await store.byId(row.id))!.row.chat[0].text === 'hello 👋' && !(await call(store, { op: 'chat', gameId: row.id, secret: secret2, seat: 0, text: 'fake' })).ok, 'chat works and cannot speak for another seat');
// start
eq(!(await call(store, { op: 'start', gameId: row.id, secret: secret2 })).ok, 'only the host starts');
const started = ok(await call(store, { op: 'start', gameId: row.id, secret: hostSecret }));
const st0 = started.row.state!;
eq(started.row.status === 'playing' && st0.players.length === 3 && st0.players[2].ai === 'Easy', 'game starts with a computer seat');
eq(!(await call(store, { op: 'join', code: row.code, name: 'x' })).ok, 'code does not work after the game starts');
// the right player acts, others are refused
const cur = st0.current;
const hostSeats = [0];
const secretFor = (seat: number) => (seat === 1 ? secret2 : hostSecret);
if (cur === 2) { /* computer first: let the server run it */ }
const humanSeat = cur === 2 ? 0 : cur;
if (cur !== 2) {
  eq(!(await call(store, { op: 'act', gameId: row.id, secret: secretFor(cur === 0 ? 1 : 0), seat: cur, action: { type: 'roll' } })).ok, 'a player cannot act for a seat they do not own');
  const r = ok(await call(store, { op: 'act', gameId: row.id, secret: secretFor(cur), seat: cur, action: { type: 'roll' } }));
  eq(!!r.row.state!.lastRoll, 'roll accepted and applied by the server');
  eq(!(await call(store, { op: 'act', gameId: row.id, secret: secretFor(cur), seat: cur, action: { type: 'roll' } })).ok, 'rules enforced: cannot roll twice');
}
void hostSeats; void humanSeat;

// computers play on the server when ticked
const compGame = ok(await call(store, { op: 'create', startingCash: 200000, endMode: { kind: 'lastStanding' }, seats: [{ kind: 'host', name: 'H', token: '🛕' }, { kind: 'computer', level: 'High', name: 'C', token: '⛵' }] }));
const hs = compGame.secret!;
ok(await call(store, { op: 'start', gameId: compGame.row.id, secret: hs }));
let g = (await store.byId(compGame.row.id))!;
g.row.state!.current = 1; g.row.state!.phase = 'awaitRoll'; g.row.dueAt = 0; // make it the computer's turn
await store.rows.set(g.row.id, { ...g, row: { ...g.row, version: g.row.version } });
let moved = false;
for (let i = 0; i < 20 && !moved; i++) {
  now += 2500;
  ok(await call(store, { op: 'ping', gameId: compGame.row.id, secret: hs }));
  const t = ok(await call(store, { op: 'tick', gameId: compGame.row.id }));
  if (t.row.state!.lastRoll) moved = true;
}
eq(moved, 'the server plays the computer seat on tick');

// idle human: auto roll after 10 seconds, three timeouts means dropped
const idle = ok(await call(store, { op: 'create', startingCash: 200000, endMode: { kind: 'lastStanding' }, seats: [{ kind: 'host', name: 'A', token: '🛕' }, { kind: 'host', name: 'B', token: '⛵' }] }));
const is = idle.secret!;
ok(await call(store, { op: 'start', gameId: idle.row.id, secret: is }));
let missedSeen = 0, droppedSeen = false;
for (let i = 0; i < 80 && !droppedSeen; i++) {
  now += 11_000;
  const t = ok(await call(store, { op: 'tick', gameId: idle.row.id }));
  const pl = t.row.state!.players;
  missedSeen = Math.max(missedSeen, ...pl.map((p) => p.missedTurns));
  droppedSeen = pl.some((p) => !p.connected);
}
eq(missedSeen >= 1 && droppedSeen, 'idle players are rolled for automatically, then treated as dropped after three timeouts');

// dropped player: skipped, can come back within three rounds, replaced by a computer afterwards
const dr = ok(await call(store, { op: 'create', startingCash: 200000, endMode: { kind: 'lastStanding' }, seats: [{ kind: 'host', name: 'Host', token: '🛕' }, { kind: 'online', name: '', token: '⛵' }, { kind: 'computer', level: 'Easy', name: 'C', token: '🥥' }] }));
const dj = ok(await call(store, { op: 'join', code: dr.row.code, name: 'Dev' }));
ok(await call(store, { op: 'start', gameId: dr.row.id, secret: dr.secret! }));
const dropId = dr.row.id;
// both stop sending pings: seat 1 drops (host pings keep it alive)
let replaced = false, skipped = 0;
for (let i = 0; i < 400 && !replaced; i++) {
  now += 3000;
  await call(store, { op: 'ping', gameId: dropId, secret: dr.secret! }); // host keeps pinging
  const t = ok(await call(store, { op: 'tick', gameId: dropId }));
  const p = t.row.state!.players[1];
  skipped = Math.max(skipped, p.droppedRounds);
  replaced = !!p.replaced;
  // the host plays its own turns so the game moves on
  const s = t.row.state!;
  if (!replaced && s.current === 0 && !s.auction && !s.trade && !s.debt) {
    const a = s.phase === 'awaitRoll' ? { type: 'roll' as const } : s.phase === 'awaitBuy' ? { type: 'decline' as const } : { type: 'endTurn' as const };
    await call(store, { op: 'act', gameId: dropId, secret: dr.secret!, seat: 0, action: a });
  }
}
eq(skipped >= 3 && replaced, 'a dropped player is skipped and replaced by a computer after three rounds');
const after = await call(store, { op: 'ping', gameId: dropId, secret: dj.secret! });
eq(!after.ok && /broken/.test(after.error), 'the original player cannot rejoin after replacement and sees the broken-session message');
const pl2 = (await store.byId(dropId))!.row.state!.players[1];
eq(pl2.ai === 'Medium' && pl2.cash >= 0, 'the computer keeps the seat with its cash and places');

// a dropped player who returns in time
const back = ok(await call(store, { op: 'create', startingCash: 200000, endMode: { kind: 'lastStanding' }, seats: [{ kind: 'host', name: 'Host', token: '🛕' }, { kind: 'online', name: '', token: '⛵' }] }));
const bj = ok(await call(store, { op: 'join', code: back.row.code, name: 'Dev' }));
ok(await call(store, { op: 'start', gameId: back.row.id, secret: back.secret! }));
now += 20_000;
await call(store, { op: 'ping', gameId: back.row.id, secret: back.secret! });
ok(await call(store, { op: 'tick', gameId: back.row.id }));
eq((await store.byId(back.row.id))!.row.state!.players[1].connected === false, 'no heartbeat: marked dropped');
ok(await call(store, { op: 'ping', gameId: back.row.id, secret: bj.secret! }));
const bp = (await store.byId(back.row.id))!.row.state!.players[1];
eq(bp.connected && bp.droppedRounds === 0, 'returning within the window restores the player');

// concurrent writes retry instead of losing data
const fl = ok(await call(store, { op: 'create', startingCash: 300000, endMode: { kind: 'timed', minutes: 45 }, seats: [{ kind: 'host', name: 'A', token: '🛕' }, { kind: 'host', name: 'B', token: '⛵' }] }));
const results = await Promise.all([1, 2, 3].map((i) => call(store, { op: 'chat', gameId: fl.row.id, secret: fl.secret!, seat: 0, text: 'm' + i })));
eq(results.every((r) => r.ok) && (await store.byId(fl.row.id))!.row.chat.length === 3, 'simultaneous requests do not lose each other');
eq(!(await call(store, { op: 'create', startingCash: 100000, endMode: { kind: 'lastStanding' }, seats: [{ kind: 'host', name: 'A', token: '🛕' }, { kind: 'host', name: 'B', token: '⛵' }] })).ok, 'only the two lakh and three lakh starts exist');
eq(!(await call(store, { op: 'create', startingCash: 200000, endMode: { kind: 'timed', minutes: 40 }, seats: [{ kind: 'host', name: 'A', token: '🛕' }, { kind: 'host', name: 'B', token: '⛵' }] })).ok, 'game time must be 30 plus steps of 15');

console.log(errs.length ? errs.join('\n') : 'server OK');
process.exit(errs.length ? 1 : 0);
