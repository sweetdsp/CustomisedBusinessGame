import { CARDS, cardById } from '../src/shared/cards.ts';
import { newGame, roll, endTurn } from '../src/game/engine.ts';
import { shuffleDecks, drawCard } from '../src/game/cards.ts';
import { TILES } from '../src/shared/board.ts';
import type { GameState } from '../src/game/types.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };
const fixed = (...v: number[]) => { let i = 0; return () => (v[i++] + 0.01) / 9; };
let seed = 7;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// ---- deck contents (section 34) ----
const fort = CARDS.filter((c) => c.deck === 'fortune'), fest = CARDS.filter((c) => c.deck === 'festival');
eq(fort.length === 16 && fest.length === 16, '16 cards per deck');
const kinds = (cs: typeof CARDS) => cs.map((c) => c.effect.kind).sort().join();
eq(kinds(fort) === 'advanceToStart,back,collect,collect,collect,collect,collectPerPlace,freeTrip,goToJail,jailFree,nearestUnowned,pay,pay,pay,payEach,payPerBuilding', 'Fortune card types');
eq(kinds(fest) === 'advanceToStart,collect,collect,collect,collect,collect,collect,collectFromEach,collectFromEach,jailFree,pay,pay,pay,pay,pay,payPerBuilding', 'Festival card types');
const amounts = (cs: typeof CARDS) => cs.map((c) => ('amount' in c.effect ? c.effect.amount : 0)).filter(Boolean).sort((a, b) => a - b).join();
eq(amounts(fort) === '400,500,700,1200,1500,2000,2500,3000,4000', 'Fortune amounts');
eq(amounts(fest) === '500,700,800,1000,1000,1200,1500,1500,1800,2000,2000,2500,3000', 'Festival amounts');
eq(new Set(fest.map((c) => c.festival).filter(Boolean)).size === 5, 'five festivals, one per state');
eq(fort.every((c) => c.text.length > 0) && new Set(CARDS.map((c) => c.id)).size === 32, 'unique ids and texts');

// ---- shuffle and draw ----
const sh = shuffleDecks(rng);
eq(sh.fortune.length === 16 && new Set(sh.fortune).size === 16 && sh.festival.every((id) => cardById(id).deck === 'festival'), 'shuffle keeps all 16');
eq(JSON.stringify(shuffleDecks(() => 0.3)) === JSON.stringify(shuffleDecks(() => 0.3)), 'shuffle repeatable with same rng');

const mk = (n = 3): GameState => newGame(Array.from({ length: n }, (_, i) => ({ name: 'P' + i, token: 't' + i })), 200000, () => 0);
const withTop = (g: GameState, id: string): GameState => {
  const d = cardById(id).deck;
  return { ...g, decks: { ...g.decks, [d]: [id, ...g.decks[d].filter((x) => x !== id)] } };
};
const at = (g: GameState, pos: number): GameState => ({ ...g, players: g.players.map((p, i) => (i === g.current ? { ...p, position: pos } : p)) });
const cash = (g: GameState, i: number, c: number): GameState => ({ ...g, players: g.players.map((p, k) => (k === i ? { ...p, cash: c } : p)) });
const idx = (n: string) => TILES.find((t) => t.name === n)!.index;
const own = (g: GameState, seat: number, names: string[], extra = {}): GameState => ({ ...g, properties: { ...g.properties, ...Object.fromEntries(names.map((n) => [idx(n), { owner: seat, mortgaged: false, houses: 0, hotel: false, ...extra }])) } });
// land on Fortune tile 13 from 10 (1+2) or Festival tile 22 from 19, using a chosen top card
const play = (g: GameState, id: string, from?: number, dice: [number, number] = [1, 2]) => {
  const fest = cardById(id).deck === 'festival';
  const start = from ?? (fest ? 19 : 10);
  return roll(at(withTop(g, id), start), fixed(...dice)).state;
};
const done = (g: GameState) => g.phase === 'awaitBuy' ? endTurn({ ...g, phase: 'awaitEnd' }) : endTurn(g);

const g0 = mk();
const dr = drawCard(withTop(g0, 'fortune-9'), 'fortune');
eq(dr.card.id === 'fortune-9' && dr.state.decks.fortune.at(-1) === 'fortune-9' && dr.state.decks.fortune.length === 16, 'drawn card goes to the bottom');
let r = play(g0, 'fortune-11');
eq(r.players[0].heldCards.join() === 'fortune-11' && !r.decks.fortune.includes('fortune-11') && r.decks.fortune.length === 15, 'Get Out of Jail Free is kept and leaves the deck');
eq(play(g0, 'festival-11').players[0].heldCards[0] === 'festival-11', 'Festival jail card kept');
eq(r.lastCard?.id === 'fortune-11' && endTurn(r).lastCard === undefined, 'card shown until the turn ends');

// ---- money cards ----
const c0 = (g: GameState, i = 0) => g.players[i].cash;
eq(c0(play(g0, 'fortune-1')) === 202000 && c0(play(g0, 'fortune-2')) === 198500, 'collect 2,000 / pay 1,500');
eq(c0(play(g0, 'fortune-3')) === 203000 && c0(play(g0, 'fortune-9')) === 202500 && c0(play(g0, 'fortune-10')) === 199300 && c0(play(g0, 'fortune-13')) === 198800 && c0(play(g0, 'fortune-14')) === 204000, 'other Fortune money cards');
const festAmts: [number, number][] = [[2, -1500], [3, 2000], [5, -1000], [6, 1800], [7, 2500], [9, -1200], [10, 1500], [13, -800], [14, 3000], [15, 2000], [16, -700]];
eq(festAmts.every(([n, d]) => c0(play(g0, 'festival-' + n)) === 200000 + d), 'Festival money cards');
// per place (cap 4000, mortgaged count)
eq(c0(play(own(g0, 0, ['Wayanad', 'Alleppey']), 'fortune-12')) === 200800, 'Tourism boom 400 per place');
eq(c0(play(own(g0, 0, ['Wayanad', 'Alleppey'], { mortgaged: true }), 'fortune-12')) === 200800, 'mortgaged places count for Tourism boom');
const twelve = ['Wayanad', 'Alleppey', 'Kumarakom', 'Varkala', 'Thekkady', 'Munnar', 'Badami', 'Chikmagalur', 'Udupi', 'Gokarna', 'Coorg', 'Hampi'];
eq(c0(play(own(g0, 0, twelve), 'fortune-12')) === 204000, 'Tourism boom capped at 4,000');
// buildings
const bld = own(own(g0, 0, ['Wayanad'], { houses: 2 }), 0, ['Alleppey'], { houses: 3, hotel: true });
eq(c0(play(bld, 'fortune-8')) === 200000 - (5 * 500 + 1000), 'Cyclone: 500 per house, 1,000 per hotel');
eq(c0(play(bld, 'festival-8')) === 200000 - 5 * 600, 'Dasara: 600 per house (no hotel charge)');
// each other player (3 players, one bankrupt excluded)
const three = mk(3);
let e = play(three, 'festival-1');
eq(c0(e) === 202000 && c0(e, 1) === 199000 && c0(e, 2) === 199000, 'Pongal: 1,000 from every other player');
e = play(three, 'festival-4');
eq(c0(e) === 201000 && c0(e, 1) === 199500, 'Ugadi: 500 from every other player');
e = play(three, 'fortune-16');
eq(c0(e) === 199000 && c0(e, 1) === 200500 && c0(e, 2) === 200500, 'pay each other player 500');
const withBk = { ...three, players: three.players.map((p, i) => (i === 2 ? { ...p, bankrupt: true } : p)) };
eq(c0(play(withBk, 'fortune-16')) === 199500 && c0(play(withBk, 'fortune-16'), 2) === 200000, 'bankrupt players are not paid');
eq(c0(play(cash(three, 1, 300), 'festival-1')) === 201300 && c0(play(cash(three, 1, 300), 'festival-1'), 1) === 0, 'cannot pay: gives what they have');

// ---- movement cards ----
r = play(g0, 'fortune-4', 10);
eq(r.players[0].position === 0 && r.players[0].cash === 202000 && r.lastRoll!.cardPath!.length === 29 && r.lastRoll!.cardPath!.at(-1) === 0, 'Advance to Start: moves forward, salary once');
r = play(g0, 'festival-12');
eq(r.players[0].position === 0 && r.players[0].cash === 202000, 'Festival Advance to Start');
// Back three steps is a Fortune card, drawn only on Fortune tiles 13 and 37 (no salary, lands on the tile 3 behind)
for (const [from, expect] of [[10, 10], [34, 34]]) {
  const x = roll(at(withTop(mk(), 'fortune-5'), from), fixed(1, 2)).state;
  eq(x.players[0].position === expect && x.lastRoll!.cardPath!.join() === [from + 2, from + 1, from].join() && x.players[0].cash <= 200000, `back three from the Fortune tile lands on tile ${expect}`);
}
// back three effects: Mahabalipuram rent, Tourist Tax
const rentBack = roll(at(own(withTop(g0, 'fortune-5'), 1, ['Mahabalipuram']), 10), fixed(1, 2)).state;
eq(rentBack.players[0].position === 10 && rentBack.players[0].cash === 199600 && rentBack.players[1].cash === 200400, 'back three: landing effect (rent) applies');
const tax = roll(at(own(withTop(g0, 'fortune-5'), 0, ['Wayanad']), 34), fixed(1, 2)).state; // 34+3=37 Fortune -> back to 34 Tourist Tax
eq(tax.players[0].position === 34 && tax.players[0].cash === 199800, 'back three from 37 lands on Tourist Tax and pays it');
// free trip and nearest unowned
r = play(g0, 'fortune-15', 10);
eq(r.players[0].position === 21 && r.players[0].cash === 200000, 'free trip to Rest at the Beach, no salary before Start');
r = play(g0, 'fortune-15', 34, [1, 2]); // from 34: 37 Fortune... trip 37->21 crosses Start
eq(r.players[0].position === 21 && r.players[0].cash === 202000, 'free trip crossing Start pays salary');
r = play(g0, 'fortune-7', 10);
eq(r.players[0].position === 14 && r.phase === 'awaitBuy', 'nearest unowned place offers a buy (Rameswaram, tile 14)');
r = play(own(g0, 0, ['Rameswaram', 'Ooty']), 'fortune-7', 10);
eq(r.players[0].position === 16 && r.phase === 'awaitBuy', 'skips owned places (Kodaikanal 16)');
r = play(own(g0, 1, ['Rameswaram']), 'fortune-7', 10);
eq(r.players[0].position === 15, 'a place owned by another player is skipped too (Ooty 15)');
r = play(own(g0, 1, ['Puttaparthi', 'Srisailam', 'Araku', 'Tirupati']), 'fortune-7', 34);
eq(r.players[0].position === 1 && r.players[0].cash === 202000 && r.phase === 'awaitBuy', 'nearest from 37 wraps past Start (Vemulawada 1), salary paid');
const all = Object.keys(g0.properties).map((i) => TILES[+i].name);
r = play(own(g0, 1, all), 'fortune-7', 10);
eq(r.players[0].position === 13 && r.phase === 'awaitEnd' && r.message.includes('nothing happens'), 'no free place: nothing happens');
// Go to Jail card: tile 11, no salary, turn ends on a double
r = play(g0, 'fortune-6', 10);
eq(r.players[0].position === 11 && r.players[0].inJail && r.players[0].cash === 200000, 'Go to Jail card');
r = roll(at(withTop(g0, 'fortune-6'), 10), fixed(1, 2)).state;
eq(!r.extraTurn, 'card jail ends turn (no double here)');
const dbl = roll(at(withTop(g0, 'festival-12'), 0), fixed(1, 1)).state; // double landing on Festival tile 2
eq(dbl.extraTurn, 'a double that lands on a non-jail card keeps the extra turn');
// Go to Jail card drawn on a double: Fortune tile 13 from 11 with 1+1
const jailDbl = roll(at(withTop(g0, 'fortune-6'), 11), fixed(1, 1)).state;
eq(jailDbl.players[0].position === 11 && !jailDbl.extraTurn, 'Go to Jail card on a double ends the turn (owner answer)');
console.log(errs.length ? errs.join('\n') : 'cards OK');
process.exit(errs.length ? 1 : 0);
