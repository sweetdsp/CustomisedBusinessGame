// The referee for online games (section 35). Runs on the server side (Supabase Edge Function); browsers only send requests.
// Everything here is plain TypeScript with an injected store, clock and random source, so it is tested without any service.
import { CONSTANTS } from '../shared/constants.ts';
import { newGame } from '../game/engine.ts';
import { applyAction, tick, retimer, timeoutAction, type Action } from '../game/actions.ts';
import { nextComputerMove } from '../game/ai.ts';
import { passTurn } from '../game/endgame.ts';
import type { GameState, Rng } from '../game/types.ts';
import { ConflictError, type ChatMsg, type GameRow, type LobbySeat, type Request, type Response, type Store, type Stored } from './types.ts';

export interface Deps { now: number; rng: Rng; uuid: () => string }

const TOKENS = ['🛕', '⛵', '🥥', '🥭', '🐘', '🌴'];
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DROP_AFTER_MS = 15_000; // no heartbeat for this long means the player has dropped
const REPLACE_AFTER_ROUNDS = CONSTANTS.RECONNECT_ROUNDS;
const MAX_CHAT = 50;

class Refuse extends Error {}
const fail = (m: string): never => { throw new Refuse(m); };
const ms = (s: number) => s * 1000;

const overlay = (s: GameState) => !!(s.auction || s.trade || s.debt);

function freeToken(seats: { token: string }[], wanted?: string): string {
  const used = new Set(seats.map((s) => s.token));
  if (wanted && TOKENS.includes(wanted) && !used.has(wanted)) return wanted;
  return TOKENS.find((t) => !used.has(t)) ?? fail('No token left');
}

function makeCode(rng: Rng): string {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)];
  return c;
}

// Which seats a secret may control: the host's secret controls every "human on the host's PC" seat.
function allowedSeats(st: Stored, secret: string): number[] {
  const out: number[] = [];
  st.row.seats.forEach((s, i) => {
    if (s.kind === 'host' && secret === st.secrets.host) out.push(i);
    if (s.kind === 'online' && st.secrets.seats[i] === secret) out.push(i);
  });
  return out;
}
const isHost = (st: Stored, secret: string) => secret === st.secrets.host;

function earliestDue(s: GameState, now: number): number {
  const times = [s.auction?.endsAt, s.trade?.endsAt, s.debt?.endsAt, s.turnEndsAt].filter((t): t is number => typeof t === 'number');
  return times.length ? Math.max(now + 250, Math.min(...times)) : now + 3000;
}

function touch(st: Stored, d: Deps) { st.row.updatedAt = d.now; }

export async function handle(store: Store, req: Request, d: Deps): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await handleOnce(store, req, d);
    } catch (e) {
      if (e instanceof ConflictError) continue; // someone else wrote first: reload and try again
      if (e instanceof Refuse) return { ok: false, error: e.message };
      if (e instanceof Error) return { ok: false, error: e.message };
      return { ok: false, error: 'Something went wrong' };
    }
  }
  return { ok: false, error: 'Busy, please try again' };
}

async function load(store: Store, id: string): Promise<Stored> {
  return (await store.byId(id)) ?? fail('Game not found (it may have expired)');
}

async function handleOnce(store: Store, req: Request, d: Deps): Promise<Response> {
  switch (req.op) {
    case 'create': {
      if (req.seats.length < CONSTANTS.MIN_SEATS || req.seats.length > CONSTANTS.MAX_SEATS) fail('A game has 2 to 4 seats');
      if (!(CONSTANTS.STARTING_CASH_OPTIONS as readonly number[]).includes(req.startingCash)) fail('Bad starting cash');
      if (req.endMode.kind === 'timed' && (req.endMode.minutes < CONSTANTS.GAME_MINUTES_START || (req.endMode.minutes - CONSTANTS.GAME_MINUTES_START) % CONSTANTS.GAME_MINUTES_STEP !== 0)) fail('Bad game length');
      const seats: LobbySeat[] = [];
      for (const s of req.seats) {
        const name = (s.name ?? '').trim().slice(0, 14) || `Player ${seats.length + 1}`;
        seats.push({ kind: s.kind, level: s.kind === 'computer' ? s.level ?? 'Medium' : undefined, name, token: freeToken(seats, s.token), taken: s.kind !== 'online' });
      }
      if (!seats.some((s) => s.kind === 'host')) fail('At least one human on the host PC');
      let code = makeCode(d.rng);
      for (let i = 0; i < 20 && (await store.byCode(code)); i++) code = makeCode(d.rng);
      const st: Stored = {
        row: { id: d.uuid(), code, status: 'lobby', seats, startingCash: req.startingCash, endMode: req.endMode, state: null, chat: [], dueAt: 0, updatedAt: d.now, version: 0 },
        secrets: { host: d.uuid(), seats: {}, lastSeen: { host: d.now } },
      };
      await store.create(st);
      return { ok: true, row: st.row, serverNow: d.now, secret: st.secrets.host };
    }

    case 'join': {
      const st = (await store.byCode(req.code.trim().toUpperCase())) ?? fail('No game with that code');
      const open = st.row.seats.findIndex((s) => s.kind === 'online' && !s.taken);
      // The code stops working once all seats are filled or the game has started.
      if (st.row.status !== 'lobby' || open < 0) fail('This room is full or the game has already started');
      const seat = st.row.seats[open];
      seat.name = (req.name ?? '').trim().slice(0, 14) || `Player ${open + 1}`;
      seat.token = freeToken(st.row.seats.filter((_, i) => i !== open), req.token);
      seat.taken = true;
      const secret = d.uuid();
      st.secrets.seats[open] = secret;
      st.secrets.lastSeen[open] = d.now;
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now, seat: open, secret };
    }

    case 'get': {
      const st = await load(store, req.gameId);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'ping': {
      const st = await load(store, req.gameId);
      const seats = allowedSeats(st, req.secret);
      if (!isHost(st, req.secret) && seats.length === 0) {
        const wasReplaced = st.row.state?.players.some((p, i) => p.replaced && st.secrets.seats[i] === req.secret);
        fail(wasReplaced ? 'The session is broken and cannot be reconnected' : 'Unknown player');
      }
      if (!isHost(st, req.secret) && seats.some((i) => st.row.state?.players[i]?.replaced)) fail('The session is broken and cannot be reconnected');
      st.secrets.lastSeen[isHost(st, req.secret) ? 'host' : seats[0]] = d.now;
      // A player who comes back within three rounds is back in the game.
      const state = st.row.state;
      if (state) {
        let changed = false;
        const players = state.players.map((p, i) => {
          const mine = seats.includes(i);
          if (mine && !p.connected && !p.replaced) { changed = true; return { ...p, connected: true, droppedRounds: 0, missedTurns: 0 }; }
          return p;
        });
        if (changed) st.row.state = { ...state, players };
      }
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'token': {
      const st = await load(store, req.gameId);
      if (st.row.status !== 'lobby') fail('The game has started');
      const mine = allowedSeats(st, req.secret);
      if (!isHost(st, req.secret) && !mine.includes(req.seat)) fail('Not your seat');
      if (st.row.seats[req.seat]?.kind === 'computer' && !isHost(st, req.secret)) fail('Not your seat');
      if (!TOKENS.includes(req.token) || st.row.seats.some((s, i) => i !== req.seat && s.token === req.token)) fail('That token is taken');
      st.row.seats[req.seat].token = req.token;
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'remove': {
      const st = await load(store, req.gameId);
      if (!isHost(st, req.secret)) fail('Only the host can remove a player');
      if (st.row.status !== 'lobby') fail('The game has started');
      const s = st.row.seats[req.seat];
      if (!s || s.kind !== 'online' || !s.taken) fail('Nobody to remove there');
      s.taken = false;
      s.name = `Seat ${req.seat + 1}`;
      delete st.secrets.seats[req.seat];
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'start': {
      const st = await load(store, req.gameId);
      if (!isHost(st, req.secret)) fail('Only the host can start');
      if (st.row.status !== 'lobby') fail('Already started');
      if (st.row.seats.some((s) => !s.taken)) fail('Wait for every seat to be filled');
      let state = newGame(
        st.row.seats.map((s) => ({ name: s.name, token: s.token, ai: s.kind === 'computer' ? s.level : undefined })),
        st.row.startingCash, d.rng, { endMode: st.row.endMode, now: d.now },
      );
      state = retimer(null, state, d.now);
      st.row.state = state;
      st.row.status = 'playing';
      st.row.dueAt = d.now + ms(CONSTANTS.COMPUTER_PAUSE_MAX);
      for (const k of Object.keys(st.secrets.lastSeen)) st.secrets.lastSeen[k] = d.now;
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'act': {
      const st = await load(store, req.gameId);
      const state = st.row.state ?? fail('The game has not started');
      if (!allowedSeats(st, req.secret).includes(req.seat)) fail('You cannot play for that seat');
      if (state.players[req.seat].replaced) fail('The session is broken and cannot be reconnected');
      const r = applyAction(state, req.seat, req.action as Action, { rng: d.rng, now: d.now });
      let next = r.state;
      // any move by a person clears their missed-turn count
      if (req.action.type !== 'tick') next = { ...next, players: next.players.map((p, i) => (i === req.seat ? { ...p, missedTurns: 0, connected: true } : p)) };
      st.row.state = next;
      if (next.gameOver) st.row.status = 'finished';
      st.row.dueAt = Math.min(st.row.dueAt || Infinity, earliestDue(next, d.now));
      if (next.players.some((p) => p.ai)) st.row.dueAt = Math.min(st.row.dueAt, d.now + ms(CONSTANTS.COMPUTER_PAUSE_MIN));
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'chat': {
      const st = await load(store, req.gameId);
      const mine = allowedSeats(st, req.secret);
      const seat = isHost(st, req.secret) ? (mine.includes(req.seat) ? req.seat : mine[0] ?? 0) : mine.includes(req.seat) ? req.seat : fail('Not your seat');
      const text = (req.text ?? '').trim().slice(0, 200);
      if (!text) fail('Empty message');
      const msg: ChatMsg = { seat, name: st.row.seats[seat].name, text, ts: d.now };
      st.row.chat = [...st.row.chat, msg].slice(-MAX_CHAT);
      touch(st, d);
      await store.save(st);
      return { ok: true, row: st.row, serverNow: d.now };
    }

    case 'tick': return tickGame(store, req.gameId, d);
  }
}

// The server side of timers: auctions and trades ending, auto-play for idle people, dropped players, and computer moves.
async function tickGame(store: Store, gameId: string, d: Deps): Promise<Response> {
  const st = await load(store, gameId);
  const initial = st.row.state;
  if (!initial || st.row.status !== 'playing') return { ok: true, row: st.row, serverNow: d.now };
  let s: GameState = initial;
  if (d.now < st.row.dueAt) return { ok: true, row: st.row, serverNow: d.now }; // not time yet
  const prev = s;

  // 1. Who is still connected? (no heartbeat for 15 seconds means dropped)
  s = {
    ...s,
    players: s.players.map((p, i) => {
      if (p.ai || p.replaced || !p.connected) return p;
      const key = st.row.seats[i].kind === 'host' ? 'host' : String(i);
      const seen = st.secrets.lastSeen[key] ?? 0;
      return d.now - seen > DROP_AFTER_MS ? { ...p, connected: false } : p;
    }),
  };

  // 2. Time events (auctions, trades, debts)
  s = tick({ ...s, now: d.now });

  // 3. At most one automatic thing per tick
  let acted = false;
  const cur = s.players[s.current];
  if (!s.gameOver && !overlay(s) && !cur.ai) {
    if (!cur.connected && !cur.replaced) {
      // A dropped player's turn is skipped quickly; after three rounds a computer takes over.
      const rounds = cur.droppedRounds + 1;
      s = { ...s, players: s.players.map((p, i) => (i === s.current ? (rounds >= REPLACE_AFTER_ROUNDS ? { ...p, droppedRounds: rounds, replaced: true, ai: 'Medium' as const, connected: true } : { ...p, droppedRounds: rounds }) : p)) };
      s = passTurn(s);
      acted = true;
    } else if (s.turnEndsAt !== null && d.now >= s.turnEndsAt) {
      // 10 seconds up: roll for them, skip optional actions, end the turn
      const act = timeoutAction(s);
      let missed = cur.missedTurns;
      let timedOut = s.turnTimedOut;
      if (!timedOut) { missed++; timedOut = true; }
      s = { ...s, turnTimedOut: timedOut, players: s.players.map((p, i) => (i === s.current ? { ...p, missedTurns: missed, connected: missed >= CONSTANTS.TIMEOUTS_BEFORE_DROPPED ? false : p.connected } : p)) };
      s = applyAction(s, s.current, act, { rng: d.rng, now: d.now }).state;
      acted = true;
    }
  }
  if (!acted && !s.gameOver) {
    // Computers move after a pause of 1 to 2 seconds, run here so they keep playing with every tab closed
    const mv = nextComputerMove(s, d.rng);
    if (mv) {
      s = applyAction(s, mv.actor, mv.action, { rng: d.rng, now: d.now }).state;
      acted = true;
    }
  }

  s = retimer(prev, s, d.now);
  st.row.state = s;
  if (s.gameOver) st.row.status = 'finished';
  const pause = ms(CONSTANTS.COMPUTER_PAUSE_MIN + d.rng() * (CONSTANTS.COMPUTER_PAUSE_MAX - CONSTANTS.COMPUTER_PAUSE_MIN));
  const moreComputer = !s.gameOver && nextComputerMove(s, d.rng) !== null;
  st.row.dueAt = moreComputer ? d.now + pause : Math.max(d.now + 500, earliestDue(s, d.now));
  touch(st, d);
  await store.save(st);
  return { ok: true, row: st.row, serverNow: d.now };
}
export type { GameRow };
