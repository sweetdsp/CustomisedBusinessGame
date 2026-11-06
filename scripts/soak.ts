// Stress test: many full computer-only games, checking the rules' invariants after every single move.
import { newGame } from '../src/game/engine.ts';
import { applyAction } from '../src/game/actions.ts';
import { nextComputerMove } from '../src/game/ai.ts';
import { CARDS } from '../src/shared/cards.ts';
import type { GameState } from '../src/game/types.ts';

const GAMES = Number(process.env.GAMES ?? 200);
let seed = Number(process.env.SEED ?? 4242);
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

function invariants(s: GameState): string | null {
  for (const [i, p] of s.players.entries()) {
    if (p.cash < 0) return `negative cash for ${p.name}`;
    if (p.position < 0 || p.position > 41) return `bad position ${p.position}`;
    if (p.bankrupt && (p.cash !== 0 || p.heldCards.length)) return `bankrupt player ${i} still holds cash or cards`;
    if (p.inJail && p.position !== 11) return `jailed player not on tile 11`;
  }
  for (const [t, ps] of Object.entries(s.properties)) {
    if (ps.houses < 0 || ps.houses > 3) return `tile ${t}: ${ps.houses} houses`;
    if (ps.hotel && ps.houses !== 3) return `tile ${t}: hotel without three houses`;
    if (ps.owner !== null && (ps.owner < 0 || ps.owner >= s.players.length || s.players[ps.owner].bankrupt)) return `tile ${t}: owner ${ps.owner} invalid or bankrupt`;
    if (ps.mortgaged && ps.owner === null) return `tile ${t}: unowned but mortgaged`;
    if (ps.mortgaged && (ps.houses > 0 || ps.hotel)) return `tile ${t}: mortgaged with buildings`;
  }
  for (const deck of ['fortune', 'festival'] as const) {
    const all = CARDS.filter((c) => c.deck === deck).map((c) => c.id).sort().join();
    const held = s.players.flatMap((p) => p.heldCards).filter((c) => c.startsWith(deck));
    const there = [...s.decks[deck], ...held].sort().join();
    if (all !== there) return `${deck} deck lost or duplicated a card`;
  }
  if (s.auction && s.trade) return 'auction and trade open together';
  if (s.trade && s.debt) return 'trade and debt open together';
  if (s.auction && s.auction.bidder !== null && s.players[s.auction.bidder].bankrupt) return 'bankrupt player leads an auction';
  if (!s.gameOver && s.players.filter((p) => !p.bankrupt).length < 2) return 'game should have ended';
  if (s.players[s.current].bankrupt && !s.gameOver) return 'a bankrupt player has the turn';
  return null;
}

type Lvl = 'Easy' | 'Medium' | 'High';
const LEVELS: Lvl[][] = [['Easy', 'Medium'], ['Medium', 'High'], ['Easy', 'High'], ['Easy', 'Medium', 'High'], ['High', 'High', 'Medium', 'Easy'], ['Easy', 'Easy', 'Easy'], ['Medium', 'Medium']];
const stats = { games: 0, ended: 0, time: 0, last: 0, capped: 0, moves: 0, bankrupt: 0, auctions: 0 };
const problems: string[] = [];

for (let g = 0; g < GAMES; g++) {
  const levels = LEVELS[g % LEVELS.length];
  const timed = g % 2 === 0;
  let now = 5_000_000;
  let s = newGame(levels.map((ai, i) => ({ name: `${ai}${i}`, token: `t${i}`, ai })), g % 3 === 0 ? 300000 : 200000, rng, { endMode: timed ? { kind: 'timed', minutes: 30 + 15 * (g % 4) } : { kind: 'lastStanding' }, now });
  let steps = 0, idle = 0;
  try {
    while (!s.gameOver && steps++ < 40000) {
      now += 1000 + Math.floor(rng() * 1000);
      s = applyAction(s, s.current, { type: 'tick' }, { rng, now }).state;
      const mv = nextComputerMove(s, rng);
      if (!mv) { if (++idle > 300) throw new Error('stuck'); now += 1000; continue; }
      idle = 0;
      const wasAuction = !!s.auction;
      s = applyAction(s, mv.actor, mv.action, { rng, now }).state;
      stats.moves++;
      if (!wasAuction && s.auction) stats.auctions++;
      const bad = invariants(s);
      if (bad) throw new Error(bad);
    }
  } catch (e) {
    problems.push(`game ${g} [${levels}] ${timed ? 'timed' : 'last-standing'}: ${(e as Error).message}`);
    continue;
  }
  stats.games++;
  stats.bankrupt += s.players.filter((p) => p.bankrupt).length;
  if (s.gameOver) { stats.ended++; if (s.gameOver.reason === 'time') stats.time++; else stats.last++; } else stats.capped++;
}
console.log(JSON.stringify(stats));
console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + problems.slice(0, 12).join('\n') : `soak OK: ${stats.games} games, ${stats.moves} moves, rules invariants held every move`);
process.exit(problems.length ? 1 : 0);
