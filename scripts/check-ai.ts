// Plays full computer-only games with a simulated clock to prove the computers never get stuck or break a rule.
import { newGame } from '../src/game/engine.ts';
import { applyAction } from '../src/game/actions.ts';
import { nextComputerMove } from '../src/game/ai.ts';
import { netWorth } from '../src/game/networth.ts';
import type { GameState } from '../src/game/types.ts';

let seed = 99;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };

type Lvl = 'Easy' | 'Medium' | 'High';
function play(levels: Lvl[], endMode: GameState['endMode'], cash = 200000, maxSteps = 60000) {
  let now = 1_000_000;
  const seats = levels.map((ai, i) => ({ name: `${ai}${i}`, token: `t${i}`, ai }));
  let s = newGame(seats, cash, rng, { endMode, now });
  let steps = 0, idle = 0;
  while (!s.gameOver && steps++ < maxSteps) {
    now += 1000 + Math.floor(rng() * 1000); // the 1 to 2 second computer pause
    s = applyAction(s, s.current, { type: 'tick' }, { rng, now }).state;
    const mv = nextComputerMove(s, rng);
    if (!mv) { idle++; now += 1000; if (idle > 200) throw new Error('stuck: no computer move ' + JSON.stringify({ phase: s.phase, auction: !!s.auction, trade: !!s.trade, debt: !!s.debt })); continue; }
    idle = 0;
    try { s = applyAction(s, mv.actor, mv.action, { rng, now }).state; }
    catch (e) { throw new Error(`computer action failed: ${(e as Error).message} ${JSON.stringify(mv.action)}`); }
    for (const p of s.players) if (p.cash < 0) throw new Error('negative cash');
  }
  return { s, steps };
}

// ---- Behaviour by level (section 16) ----
import { TILES } from '../src/shared/board.ts';
const idx = (n: string) => TILES.find((t) => t.name === n)!.index;
const base = (lvl: Lvl, cash: number, pos: number, extra: Record<string, unknown> = {}): GameState => {
  const g = newGame([{ name: 'A', token: 'a', ai: lvl }, { name: 'B', token: 'b' }], 200000, () => 0, { now: 1000 });
  return { ...g, current: 0, ...extra, players: g.players.map((p, i) => (i === 0 ? { ...p, cash, position: pos } : p)) } as GameState;
};
const R = idx('Ramappa'); // Telangana, price 4,000
const buying = (lvl: Lvl, cash: number, held: string[] = []) => {
  let g = { ...base(lvl, cash, R), phase: 'awaitBuy' as const };
  g = { ...g, properties: { ...g.properties, ...Object.fromEntries(held.map((n) => [idx(n), { owner: 0, mortgaged: false, houses: 0, hotel: false }])) } };
  return nextComputerMove(g, rng)!.action.type;
};
eq(buying('Easy', 4500) === 'buy', 'Easy buys almost anything it can afford');
eq(buying('Medium', 4500) === 'decline' && buying('High', 4500) === 'decline', 'Medium and High keep a cash reserve');
eq(buying('Medium', 60000) === 'buy' && buying('High', 60000) === 'buy', 'they buy when cash is comfortable');
eq(buying('Medium', 10000, ['Vemulawada']) === 'buy' && buying('High', 10000, ['Vemulawada']) === 'decline', 'Medium prefers states it holds; High waits for three');
eq(buying('High', 20000, ['Vemulawada', 'Basar']) === 'buy', 'High goes for three in one state (doubled base rent)');
eq(buying('Easy', 3999) === 'decline', 'cannot buy beyond cash');
// bidding: Easy bids loosely, High bids smartly
const auctionAt = (lvl: Lvl, bid: number, cash = 200000) => ({ ...base(lvl, cash, 0), auction: { tile: R, bid, bidder: 1, endsAt: 9_999_999 } });
eq(nextComputerMove(auctionAt('Easy', 5000), rng)?.action.type === 'bid', 'Easy still bids at 5,000 (limit 5,200)');
eq(nextComputerMove(auctionAt('High', 3400), rng) === null && nextComputerMove(auctionAt('High', 3000), rng)?.action.type === 'bid', 'High stops at 85% of the price');
eq(nextComputerMove(auctionAt('Easy', 100, 150), rng) === null, 'never bids above its cash');
eq(nextComputerMove({ ...auctionAt('Easy', 100), auction: { tile: R, bid: 100, bidder: 0, endsAt: 9_999_999 } }, rng) === null, 'does not outbid itself');
// trades: High only accepts clearly beneficial ones
const trade = (lvl: Lvl, give: number, get: number) => {
  const g = base(lvl, 50000, 0, { trade: { from: 1, to: 0, give: { cash: give, tiles: [], cards: [] }, get: { cash: get, tiles: [], cards: [] }, endsAt: 9_999_999 } });
  return (nextComputerMove(g, rng)!.action as { accept: boolean }).accept;
};
eq(trade('Easy', 850, 1000) && !trade('Easy', 700, 1000), 'Easy accepts at 80 percent');
eq(trade('Medium', 1000, 1000) && !trade('Medium', 900, 1000), 'Medium wants a fair deal');
eq(trade('High', 1300, 1000) && !trade('High', 1200, 1000), 'High wants a clear gain');
// raising money: sells buildings first, then mortgages, then gives up
const debtG = (props: Record<number, unknown>) => ({ ...base('Medium', 100, 0), properties: { ...base('Medium', 0, 0).properties, ...props }, debt: { seat: 0, owed: [{ to: 1, amount: 5000 }], endsAt: 9_999_999, reason: 'rent' } }) as GameState;
const WY = idx('Wayanad');
eq(nextComputerMove(debtG({ [WY]: { owner: 0, mortgaged: false, houses: 1, hotel: false } }), rng)?.action.type === 'sell', 'sells buildings first');
eq(nextComputerMove(debtG({ [WY]: { owner: 0, mortgaged: false, houses: 0, hotel: false } }), rng)?.action.type === 'mortgage', 'then mortgages');
eq(nextComputerMove(debtG({}), rng)?.action.type === 'bankrupt', 'nothing left: gives up');
// jail
const jailed = (lvl: Lvl, cash: number) => ({ ...base(lvl, cash, 11), players: base(lvl, cash, 11).players.map((p, i) => (i === 0 ? { ...p, inJail: true } : p)) }) as GameState;
eq(nextComputerMove(jailed('Easy', 5000), rng)?.action.type === 'payFine' && nextComputerMove(jailed('High', 5000), rng)?.action.type === 'roll' && nextComputerMove(jailed('High', 50000), rng)?.action.type === 'payFine', 'jail choices by level');

const wins: Record<string, number> = { Easy: 0, Medium: 0, High: 0 };
let ended = 0, games = 0;
for (let g = 0; g < 24; g++) {
  const levels: Lvl[] = [['Easy', 'Medium'], ['Medium', 'High'], ['Easy', 'High'], ['Easy', 'Medium', 'High'], ['High', 'High', 'Medium', 'Easy'], ['Easy', 'Easy']][g % 6] as Lvl[];
  const timed = g % 2 === 0;
  try {
    const { s } = play(levels, timed ? { kind: 'timed', minutes: 30 } : { kind: 'lastStanding' }, g % 3 === 0 ? 300000 : 200000);
    games++;
    if (s.gameOver) {
      ended++;
      for (const w of s.gameOver.winners) wins[s.players[w].ai!]++;
      eq(s.gameOver.winners.every((w) => !s.players[w].bankrupt), 'winner is still in the game');
    }
  } catch (e) {
    errs.push(`game ${g} (${(e as Error).message})`);
  }
}
eq(ended >= 20, `most games finish (${ended}/${games})`);
console.log('wins', JSON.stringify(wins), 'finished', ended, 'of', games);
console.log(errs.length ? errs.join('\n') : 'ai OK');
process.exit(errs.length ? 1 : 0);
