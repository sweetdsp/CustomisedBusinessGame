import { rollDice } from '../src/game/dice.ts';
import { newGame, roll, endTurn } from '../src/game/engine.ts';
import type { GameState } from '../src/game/types.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };

// Small seeded generator so the check is repeatable
let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const fixed = (...v: number[]) => { let i = 0; return () => (v[i++] + 0.01) / 9; }; // fixed dice faces

const seen = new Set<number>();
for (let i = 0; i < 10000; i++) {
  const [a, b] = rollDice(rng);
  eq(!(a === 0 && b === 0), 'never 0+0');
  eq(a >= 0 && a <= 8 && b >= 0 && b <= 8, 'faces 0-8');
  seen.add(a + b);
}
eq([...Array(16)].every((_, i) => seen.has(i + 1)) && !seen.has(0) && !seen.has(17), 'totals exactly 1-16');
eq(rollDice(fixed(0, 0, 0, 1)).join() === '0,1', '0+0 is rerolled, 0+1 gives one step');

const mk = (): GameState => newGame([{ name: 'A', token: 'a' }, { name: 'B', token: 'b' }, { name: 'C', token: 'c' }], 200000, () => 0);
const at = (g: GameState, pos: number): GameState => ({ ...g, players: g.players.map((p, i) => (i === g.current ? { ...p, position: pos } : p)) });

let g = mk();
eq(g.players.every((p) => p.cash === 200000 && p.position === 0), 'start cash and position');
eq(g.lapSalary === 2000 && newGame([{ name: 'x', token: 'x' }], 300000, () => 0).lapSalary === 3000, 'lap salary by game size');

// salary: crossing, exact landing on Start, and none when not reaching it
let r = roll(at(g, 40), fixed(1, 2)); // 3 steps from 40 -> tile 1, crosses 0
eq(r.result.salaryPaid === 2000 && r.state.players[0].position === 1 && r.state.players[0].cash === 202000, 'cross Start pays once');
r = roll(at(g, 40), fixed(1, 1)); // 2 steps -> exactly tile 0
eq(r.result.salaryPaid === 2000 && r.state.players[0].position === 0, 'landing on Start pays once');
r = roll(at(g, 30), fixed(3, 4));
eq(r.result.salaryPaid === 0 && r.result.path.length === 7, 'no salary mid-board, path has every tile');

// doubles give another turn; non-doubles do not
r = roll(g, fixed(3, 3));
eq(r.state.extraTurn && endTurn(r.state).current === 0 && endTurn(r.state).phase === 'awaitRoll', 'double: same player rolls again');
r = roll(g, fixed(3, 4));
eq(!r.state.extraTurn && endTurn(r.state).current === 1, 'non-double passes the turn');

// third double in a row: no move, Jail (tile 11), no salary, turn ends
let s = at(g, 40);
s = endTurn(roll(s, fixed(1, 1)).state);
s = endTurn(roll(s, fixed(2, 2)).state);
eq(s.doublesCount === 2 && s.current === 0, 'two doubles so far');
const third = roll(at(s, 40), fixed(4, 4));
eq(third.result.toJail && third.state.players[0].position === 11 && third.state.players[0].cash === s.players[0].cash && !third.state.extraTurn, 'third double goes to Jail, no salary, turn ends');
eq(endTurn(third.state).current === 1 && endTurn(third.state).doublesCount === 0, 'turn passes and double count resets');

// turn order skips bankrupt players and wraps
const b = { ...mk(), players: mk().players.map((p, i) => ({ ...p, bankrupt: i === 1 })), phase: 'awaitEnd' as const };
eq(endTurn(b).current === 2 && endTurn({ ...b, current: 2 }).current === 0, 'skip bankrupt, wrap around');
// random first player stays within seats
eq([0, 0.5, 0.99].every((x) => { const n = newGame(mk().players, 200000, () => x).current; return n >= 0 && n < 3; }), 'first player in range');

console.log(errs.length ? errs.join('\n') : 'engine OK');
process.exit(errs.length ? 1 : 0);
