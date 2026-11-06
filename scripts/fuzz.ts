// Fuzz test: random, often illegal requests from random players. Rules must refuse the bad ones and never break an invariant.
import { newGame } from '../src/game/engine.ts';
import { applyAction, type Action } from '../src/game/actions.ts';
import { nextComputerMove } from '../src/game/ai.ts';
import { CARDS } from '../src/shared/cards.ts';
import type { GameState } from '../src/game/types.ts';

let seed = Number(process.env.SEED ?? 99);
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
const GAMES = Number(process.env.GAMES ?? 150);

function bad(s: GameState): string | null {
  for (const p of s.players) {
    if (!Number.isFinite(p.cash) || p.cash < 0) return `cash ${p.cash} for ${p.name}`;
    if (!Number.isInteger(p.position) || p.position < 0 || p.position > 41) return `position ${p.position}`;
  }
  for (const [t, ps] of Object.entries(s.properties)) {
    if (ps.houses < 0 || ps.houses > 3 || (ps.hotel && ps.houses !== 3)) return `buildings on ${t}`;
    if (ps.owner !== null && s.players[ps.owner]?.bankrupt) return `bankrupt owner on ${t}`;
    if (ps.mortgaged && (ps.houses || ps.hotel || ps.owner === null)) return `mortgage state on ${t}`;
  }
  for (const deck of ['fortune', 'festival'] as const) {
    const all = CARDS.filter((c) => c.deck === deck).map((c) => c.id).sort().join();
    const there = [...s.decks[deck], ...s.players.flatMap((p) => p.heldCards).filter((c) => c.startsWith(deck))].sort().join();
    if (all !== there) return `${deck} cards`;
  }
  return null;
}

const rand = (): Action => {
  const tile = Math.floor(rng() * 50) - 3; // includes tiles that are not places or do not exist
  const bundle = () => ({ cash: pick([0, 0, 100, 500, 5000, 999999, -5]), tiles: rng() < 0.5 ? [] : [tile], cards: rng() < 0.2 ? ['fortune-11'] : [] });
  return pick<Action>([
    { type: 'roll' }, { type: 'roll' }, { type: 'buy' }, { type: 'decline' }, { type: 'endTurn' }, { type: 'endTurn' }, { type: 'build' },
    { type: 'mortgage', tile }, { type: 'unmortgage', tile }, { type: 'sell', tile },
    { type: 'bid', step: pick([100, 500, 100, 300, -100, 0]) },
    { type: 'proposeTrade', to: Math.floor(rng() * 5) - 1, give: bundle(), get: bundle() },
    { type: 'answerTrade', accept: rng() < 0.5 }, { type: 'payFine' }, { type: 'useJailCard' },
    ...(rng() < 0.01 ? [{ type: 'bankrupt' } as Action] : [{ type: 'tick' } as Action]),
  ]);
};

let refused = 0, accepted = 0, ended = 0;
const problems: string[] = [];
for (let g = 0; g < GAMES; g++) {
  const n = 2 + (g % 3);
  let now = 9_000_000;
  let s = newGame(Array.from({ length: n }, (_, i) => ({ name: `P${i}`, token: `t${i}`, ai: i % 2 === 0 ? undefined : ('Medium' as const) })), g % 2 ? 300000 : 200000, rng, { endMode: g % 3 === 0 ? { kind: 'timed', minutes: 30 } : { kind: 'lastStanding' }, now });
  try {
    for (let k = 0; k < 4000 && !s.gameOver; k++) {
      now += Math.floor(rng() * 3000);
      let before = s;
      // mix: random junk from random seats, and sensible computer moves so games progress
      const mv = rng() < 0.5 ? nextComputerMove(s, rng) : null;
      const actor = mv ? mv.actor : Math.floor(rng() * (n + 1)) - (rng() < 0.1 ? 1 : 0); // sometimes an invalid seat
      const action = mv ? mv.action : rand();
      try { s = applyAction(s, actor, action, { rng, now }).state; accepted++; } catch { refused++; if (s !== before) throw new Error('refused action changed the state'); }
      const b = bad(s);
      if (b) throw new Error(`${b} after ${JSON.stringify(action)} by seat ${actor}`);
      void before;
    }
  } catch (e) { problems.push(`game ${g}: ${(e as Error).message}`); continue; }
  if (s.gameOver) ended++;
}
console.log(JSON.stringify({ games: GAMES, accepted, refused, ended }));
console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + problems.slice(0, 10).join('\n') : 'fuzz OK: random and illegal requests were refused or applied without breaking any rule');
process.exit(problems.length ? 1 : 0);
