import { rollDice } from '../src/game/dice.ts';
import { newGame, roll, endTurn as rawEnd, buy, decline } from '../src/game/engine.ts';
import { rentFor, luxuryTax, touristTax } from '../src/game/rent.ts';
import { TILES, propertyOf } from '../src/shared/board.ts';
import type { GameState } from '../src/game/types.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };

// Small seeded generator so the check is repeatable
let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const fixed = (...v: number[]) => { let i = 0; return () => (v[i++] + 0.01) / 9; }; // fixed dice faces

const endTurn = (s: GameState) => rawEnd(s.phase === 'awaitBuy' ? decline(s) : s); // landing on a place for sale needs an answer first
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

// ---- Stage 4: buying, rent, taxes, tile effects ----
const idx = (name: string) => TILES.find((t) => t.name === name)!.index;
const own = (g: GameState, seat: number, names: string[], extra: Partial<GameState['properties'][number]> = {}): GameState => ({
  ...g, properties: { ...g.properties, ...Object.fromEntries(names.map((n) => [idx(n), { owner: seat, mortgaged: false, houses: 0, hotel: false, ...extra }])) },
});
const base = mk();
// buy: price deducted, owner set; cannot buy without enough cash
let b4 = roll(at(base, 0), fixed(1, 2)).state; // tile 3 Ramappa, 4000
eq(b4.phase === 'awaitBuy', 'landing on unowned place offers a buy');
const bought = buy(b4);
eq(bought.properties[3].owner === 0 && bought.players[0].cash === 196000 && bought.phase === 'awaitEnd', 'buy at full price');
const poor = { ...at(base, 0), players: base.players.map((p, i) => (i === 0 ? { ...p, cash: 3999 } : p)) };
const pr = roll(poor, fixed(1, 2));
eq(pr.state.phase === 'awaitEnd' && pr.state.properties[3].owner === null && pr.state.players[0].cash === 3999, 'cannot afford: stays unowned, no negative cash');
const dec = decline(b4);
eq(dec.phase === 'awaitEnd' && dec.properties[3].owner === null, 'decline leaves it unowned (interim)');
let threw = false; try { buy(base); } catch { threw = true; } eq(threw, 'buy outside awaitBuy rejected');

// rent amounts (Telangana: Vemulawada 200, Ramappa 400, Basar 500)
let r4 = own(base, 1, ['Ramappa']);
eq(rentFor(r4, 3) === 400, 'base rent');
const own3 = own(base, 1, ['Vemulawada', 'Ramappa', 'Basar']);
eq(rentFor(own3, 3) === 800, 'doubled at 3 places of a state');
eq(rentFor(own(own3, 1, ['Ramappa'], { mortgaged: true }), 1) === 200, 'a mortgaged place does not count toward doubling');
eq(rentFor(own(own3, 1, ['Ramappa'], { mortgaged: true }), 3) === 0, 'mortgaged place collects no rent');
eq(rentFor(own(own3, 1, ['Ramappa'], { houses: 1 }), 3) === 1200 - 0 && rentFor(own3, 3) === 800, 'one house: table rent, never doubled');
eq(rentFor(own(own3, 1, ['Ramappa'], { houses: 2 }), 3) === 2000 && rentFor(own(own3, 1, ['Ramappa'], { houses: 3 }), 3) === 2900, 'two and three house rent');
eq(rentFor(own(own3, 1, ['Ramappa'], { houses: 3, hotel: true }), 3) === 3900, 'hotel rent');
const twoOwners = own(own(base, 0, ['Courtallam', 'Mahabalipuram', 'Kanyakumari']), 1, ['Vemulawada', 'Ramappa', 'Basar']);
eq(rentFor(twoOwners, 9) === 600 && rentFor(twoOwners, 3) === 800, 'two players can both have doubled rent');
const two = own(base, 1, ['Vemulawada', 'Ramappa']);
eq(rentFor(two, 3) === 400, 'two places: no doubling');

// landing on rent
const rentG = own(at(base, 0), 1, ['Ramappa']);
const paidR = roll(rentG, fixed(1, 2));
eq(paidR.state.players[0].cash === 199600 && paidR.state.players[1].cash === 200400 && paidR.state.phase === 'awaitEnd', 'rent paid to owner');
const ownLand = roll(own(at(base, 0), 0, ['Ramappa']), fixed(1, 2));
eq(ownLand.state.players[0].cash === 200000, 'no rent on own place');
const mortLand = roll(own(at(base, 0), 1, ['Ramappa'], { mortgaged: true }), fixed(1, 2));
eq(mortLand.state.players[0].cash === 200000 && mortLand.state.players[1].cash === 200000, 'no rent on mortgaged place');
const broke = { ...rentG, players: rentG.players.map((p, i) => (i === 0 ? { ...p, cash: 150 } : p)) };
const brokeR = roll(broke, fixed(1, 2));
eq(brokeR.state.players[0].cash === 0 && brokeR.state.players[1].cash === 200150, 'cannot pay: pays all remaining cash, stops at 0');

// taxes and bonus
const toTile = (g: GameState, from: number, a: number, b: number) => roll(at(g, from), fixed(a, b)).state;
eq(toTile(base, 2, 1, 2).players[0].cash === 198000, 'Income Tax 2000 (tile 5)');
eq(toTile(base, 11, 2, 4).players[0].cash === 200000 - 0 && TILES[17].kind === 'luxuryTax', 'sanity: luxury tile is 17');
const lux = own(own(at(base, 0), 0, ['Kodaikanal', 'Ooty'], { houses: 2 }), 0, ['Wayanad'], { mortgaged: true, houses: 0 });
eq(luxuryTax(lux, 0) === 100 * 2 + 50 + 4 * 150, 'Luxury Tax formula: places, mortgaged, houses');
eq(luxuryTax(own(base, 0, ['Wayanad'], { houses: 3, hotel: true }), 0) === 100 + 450 + 400, 'Luxury Tax with hotel');
eq(roll(at(lux, 11), fixed(2, 4)).state.players[0].cash === 200000 - 850, 'Luxury Tax charged on landing (tile 17)');
const many = own(base, 0, ['Wayanad', 'Alleppey', 'Kumarakom', 'Varkala', 'Thekkady', 'Munnar', 'Badami', 'Chikmagalur', 'Udupi', 'Gokarna', 'Coorg', 'Hampi', 'Tirupati', 'Araku', 'Srisailam', 'Puttaparthi']);
eq(touristTax(many, 0) === 3000 && touristTax(own(base, 0, ['Wayanad', 'Alleppey'], { mortgaged: true }), 0) === 400, 'Tourist Tax: 200 each incl. mortgaged, max 3000');
eq(roll(at(own(base, 0, ['Wayanad']), 29), fixed(2, 3)).state.players[0].cash === 199800, 'Tourist Tax charged on landing (tile 34)');
eq(toTile(base, 20, 3, 3).players[0].cash === 201500 && toTile(base, 20, 3, 3).extraTurn, 'Lucky Draw +1500 (tile 26), double keeps extra turn');
const gj = roll(at(base, 28), fixed(2, 2)); // tile 32 on a double
eq(gj.state.players[0].position === 11 && gj.state.players[0].inJail && !gj.state.extraTurn && gj.state.players[0].cash === 200000, 'Go to Jail: tile 11, no salary, turn ends even on a double');
eq(['Fortune', 'Festival'].every((n) => roll(at(base, n === 'Fortune' ? 10 : 19), fixed(1, 2)).state.message.includes('stage 6')), 'card tiles: message only');
eq(propertyOf(TILES[3])!.price === 4000, 'sanity: Ramappa 4000');

console.log(errs.length ? errs.join('\n') : 'engine OK');
process.exit(errs.length ? 1 : 0);
