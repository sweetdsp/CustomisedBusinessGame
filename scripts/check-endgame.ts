import { newGame, roll, endTurn, payJailFine, useJailCard } from '../src/game/engine.ts';
import { applyAction } from '../src/game/actions.ts';
import { netWorth } from '../src/game/networth.ts';
import { declareBankrupt, winnersByNetWorth, endIfTimeUp } from '../src/game/endgame.ts';
import { TILES } from '../src/shared/board.ts';
import type { GameState } from '../src/game/types.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };
const throws = (f: () => unknown, m: string) => { try { f(); errs.push('should refuse: ' + m); } catch { /* ok */ } };
const fixed = (...v: number[]) => { let i = 0; return () => (v[i++] + 0.01) / 9; };
const idx = (n: string) => TILES.find((t) => t.name === n)!.index;
const mk = (n = 3, opts = {}): GameState => newGame(Array.from({ length: n }, (_, i) => ({ name: 'P' + i, token: 't' + i })), 200000, () => 0, { now: 1000, ...opts });
const at = (g: GameState, pos: number): GameState => ({ ...g, players: g.players.map((p, i) => (i === g.current ? { ...p, position: pos } : p)) });
const cashOf = (g: GameState, i: number, c: number): GameState => ({ ...g, players: g.players.map((p, k) => (k === i ? { ...p, cash: c } : p)) });
const own = (g: GameState, seat: number, names: string[], extra = {}): GameState => ({ ...g, properties: { ...g.properties, ...Object.fromEntries(names.map((n) => [idx(n), { owner: seat, mortgaged: false, houses: 0, hotel: false, ...extra }])) } });
const jailed = (g: GameState, turns = 0): GameState => ({ ...g, players: g.players.map((p, i) => (i === g.current ? { ...p, position: 11, inJail: true, jailTurns: turns } : p)) });
const ctx = (now: number) => ({ rng: Math.random, now });

// ---- Jail (section 31) ----
let j = jailed(mk());
let r = roll(j, fixed(1, 2)); // no double
eq(r.state.players[0].inJail && r.state.players[0].jailTurns === 1 && r.state.players[0].position === 11 && r.state.phase === 'awaitEnd' && !r.state.extraTurn, 'no double: stays in Jail, turn ends');
r = roll(j, fixed(3, 3)); // double
eq(!r.state.players[0].inJail && r.state.players[0].position === 17, 'double: leaves Jail and moves by the total');
eq(!r.state.extraTurn && r.state.doublesCount === 0, 'a double that leaves Jail gives no extra turn');
r = roll(jailed(mk(), 2), fixed(1, 2)); // third failed turn
eq(!r.state.players[0].inJail && r.state.players[0].position === 14 && r.state.players[0].cash === 198000, 'third failed turn: pay Rs 2,000 and move by the roll');
eq(r.state.players[0].jailTurns === 0, 'jail turns reset');
let pf = payJailFine(jailed(mk()));
eq(!pf.players[0].inJail && pf.players[0].cash === 198000 && pf.phase === 'awaitRoll', 'pay the fine, then roll normally');
eq(roll(pf, fixed(2, 2)).state.extraTurn, 'after paying the fine a double gives an extra turn as usual');
throws(() => payJailFine(cashOf(jailed(mk()), 0, 1999)), 'fine needs cash');
throws(() => payJailFine(mk()), 'not in Jail');
const withCard = { ...jailed(mk()), players: jailed(mk()).players.map((p, i) => (i === 0 ? { ...p, heldCards: ['fortune-11'] } : p)), decks: { ...mk().decks, fortune: mk().decks.fortune.filter((c) => c !== 'fortune-11') } };
const uc = useJailCard(withCard);
eq(!uc.players[0].inJail && uc.players[0].heldCards.length === 0 && uc.decks.fortune.at(-1) === 'fortune-11' && uc.players[0].cash === 200000, 'Get Out of Jail Free card: free, returns to the bottom of its deck');
throws(() => useJailCard(jailed(mk())), 'no card to use');
// jailed player still collects rent, can buy/mortgage
const rentJ = own(mk(), 0, ['Ramappa']);
eq(roll(at({ ...rentJ, current: 1 }, 0), fixed(1, 2)).state.players[0].cash === 200400, 'a jailed owner still collects rent');
// card/go-to-jail tile send to jail, jail turns start at 0
const gj = roll(at(mk(), 28), fixed(2, 2));
eq(gj.state.players[0].inJail && gj.state.players[0].jailTurns === 0, 'Go to Jail starts with 0 failed turns');

// ---- Debts (section 29) ----
const rentDebt = roll(cashOf(at(own(mk(), 1, ['Ramappa']), 0), 0, 100), fixed(1, 2)).state;
eq(!!rentDebt.debt && rentDebt.debt.endsAt === 31000 && rentDebt.players[0].cash === 100, 'debt opens with a 30 second grace period');
throws(() => applyAction(rentDebt, 0, { type: 'roll' }, ctx(2000)), 'nothing but raising money during a debt');
throws(() => applyAction(rentDebt, 1, { type: 'mortgage', tile: 3 }, ctx(2000)), 'only the debtor acts');
// raise money by mortgaging: the debt is paid at once
const raising = own(rentDebt, 0, ['Wayanad']); // owns Wayanad (mortgage 1,500)
const paid = applyAction(raising, 0, { type: 'mortgage', tile: idx('Wayanad') }, ctx(5000)).state;
eq(paid.debt === null && paid.players[0].cash === 100 + 1500 - 400 && paid.players[1].cash === 200400, 'raising enough pays the debt at once');
// not enough raised: still owing, then bankrupt on timeout
const poorRaise = { ...own(cashOf(rentDebt, 0, 0), 0, ['Wayanad']), debt: { ...rentDebt.debt!, owed: [{ to: 1, amount: 4000 }] } };
const still = applyAction(poorRaise, 0, { type: 'mortgage', tile: idx('Wayanad') }, ctx(5000)).state;
eq(!!still.debt && still.players[0].cash === 1500, 'raised some, still owes');
const out = applyAction(still, 1, { type: 'tick' }, ctx(31000)).state;
eq(out.players[0].bankrupt && out.debt === null && out.players[1].cash === 200000 + 1500, 'time up: bankrupt, creditor gets all remaining cash');
eq(applyAction(rentDebt, 1, { type: 'tick' }, ctx(30999)).state.debt !== null, 'still within the 30 seconds');
// tax debt: owes bank, cash vanishes
const taxDebt = roll(cashOf(at(mk(), 2), 0, 500), fixed(1, 2)).state; // tile 5 Income Tax
eq(taxDebt.debt?.owed[0].to === null && taxDebt.debt.owed[0].amount === 2000, 'tax debt owed to the bank');
// card: pay each other player with not enough cash
const cardDebt = { ...mk(3), decks: { ...mk().decks, fortune: ['fortune-16', ...mk().decks.fortune.filter((c) => c !== 'fortune-16')] } };
const cd = roll(cashOf(at(cardDebt, 10), 0, 700), fixed(1, 2)).state;
eq(cd.debt?.owed.length === 2 && cd.debt.owed.every((o) => o.amount === 500), 'card debt owed to each other player');
// selling buildings counts as raising money
const withBuilding = own(rentDebt, 0, ['Wayanad'], { houses: 1 });
const sold = applyAction(withBuilding, 0, { type: 'sell', tile: idx('Wayanad') }, ctx(5000)).state;
eq(sold.debt === null && sold.players[0].cash === 100 + 500 - 400 && sold.players[1].cash === 200400, 'selling a house (half of Rs 1,000) raises money and pays the debt');

// ---- Bankruptcy ----
let b = mk(3);
b = own(own(b, 0, ['Wayanad', 'Alleppey'], { houses: 0 }), 0, ['Munnar'], { houses: 2, mortgaged: false });
b = { ...b, players: b.players.map((p, i) => (i === 0 ? { ...p, heldCards: ['festival-11'] } : p)), decks: { ...b.decks, festival: b.decks.festival.filter((c) => c !== 'festival-11') } };
b = { ...b, current: 0, now: 5000 };
const bk = applyAction(b, 0, { type: 'bankrupt' }, ctx(5000)).state;
eq(bk.players[0].bankrupt && bk.players[0].cash === 0, 'bankrupt player is out');
eq(bk.properties[idx('Wayanad')].owner === null && bk.properties[idx('Munnar')].houses === 2, 'places return to the bank; houses stay on them');
eq(bk.auction?.tile === idx('Wayanad') && bk.auctionQueue.length === 2, 'places are auctioned one at a time');
eq(bk.decks.festival.at(-1) === 'festival-11', 'held card returns to the deck');
eq(bk.current === 1 && bk.phase === 'awaitRoll', 'turn passes to the next player');
// no bids: returns to the board unowned
let q = bk;
for (let t = 0; t < 3; t++) q = applyAction(q, 1, { type: 'tick' }, ctx(20000 + t * 20000)).state;
eq(q.auction === null && Object.values(q.properties).filter((p) => p.owner === null).length === 30 && q.properties[idx('Munnar')].houses === 2, 'no bids: all unowned again, buildings kept');
// not your turn: any player may still give up
const other = applyAction(mk(3), 2, { type: 'bankrupt' }, ctx(2000)).state;
eq(other.players[2].bankrupt && !other.gameOver, 'any player can exit at any time');
// last standing
const two = applyAction(mk(2), 1, { type: 'bankrupt' }, ctx(2000)).state;
eq(two.gameOver?.winners.join() === '0' && two.gameOver.reason === 'lastStanding', 'last player standing wins immediately');
throws(() => applyAction(two, 0, { type: 'roll' }, ctx(3000)), 'no actions after the game ends');
// debt-bankrupt with several creditors
const multi = declareBankrupt({ ...cashOf(mk(3), 0, 600), debt: { seat: 0, owed: [{ to: 1, amount: 500 }, { to: 2, amount: 500 }], endsAt: 0, reason: 'card' } }, 0);
eq(multi.players[1].cash === 200500 && multi.players[2].cash === 200100, 'cash shared to creditors in order');
// bankrupt players are skipped in turn order
const skip = { ...mk(3), current: 0, phase: 'awaitEnd' as const, players: mk(3).players.map((p, i) => (i === 1 ? { ...p, bankrupt: true } : p)) };
eq(endTurn(skip).current === 2, 'bankrupt players skipped');

// ---- Net worth and timed end (section 32) ----
const nw = own(own(mk(), 0, ['Wayanad', 'Ramappa'], { houses: 1 }), 0, ['Courtallam'], { mortgaged: true });
// Wayanad 3000 + 1 house 1000, Ramappa 4000 + house 1400, Courtallam mortgaged 1600
const w = netWorth(nw, 0);
eq(w.cash === 200000 && w.places === 3000 + 4000 + 1600 && w.buildings === 1000 + 1400 && w.total === 200000 + 8600 + 2400, 'net worth: price, mortgage value, build prices');
const timed = mk(3, { endMode: { kind: 'timed', minutes: 30 } });
eq(endIfTimeUp({ ...timed, now: 1000 + 30 * 60000 - 1 }).gameOver === null && endIfTimeUp({ ...timed, now: 1000 + 30 * 60000 }).gameOver !== null, 'timed game ends exactly at zero');
const rich = own(timed, 1, ['Munnar']);
eq(winnersByNetWorth({ ...rich, now: 0 }).join() === '1', 'highest net worth wins');
eq(winnersByNetWorth(timed).join() === '0,1,2', 'tie is a shared win');
// ends only after the current player's turn finishes
const late = { ...timed, now: 1000 + 31 * 60000, phase: 'awaitEnd' as const };
eq(late.gameOver === null && endTurn(late).gameOver?.reason === 'time', 'game ends when the current turn finishes after time is up');
const lateDouble = { ...late, extraTurn: true };
eq(endTurn(lateDouble).gameOver === null, 'double: turn sequence continues');
eq(winnersByNetWorth(timed).every((i) => !timed.players[i].bankrupt), 'bankrupt players cannot win on net worth');
console.log(errs.length ? errs.join('\n') : 'endgame OK');
process.exit(errs.length ? 1 : 0);
