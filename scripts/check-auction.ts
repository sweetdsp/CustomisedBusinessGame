import { newGame } from '../src/game/engine.ts';
import { applyAction } from '../src/game/actions.ts';
import { startAuction, bid, settleAuction } from '../src/game/auction.ts';
import { proposeTrade, answerTrade, expireTrade, emptyBundle } from '../src/game/trade.ts';
import { TILES } from '../src/shared/board.ts';
import type { GameState } from '../src/game/types.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };
const throws = (f: () => unknown, m: string) => { try { f(); errs.push('should refuse: ' + m); } catch { /* ok */ } };
const idx = (n: string) => TILES.find((t) => t.name === n)!.index;
const mk = (n = 3): GameState => newGame(Array.from({ length: n }, (_, i) => ({ name: 'P' + i, token: 't' + i })), 200000, () => 0, { now: 1000 });
const at = (g: GameState, now: number): GameState => ({ ...g, now });
const own = (g: GameState, seat: number, names: string[], extra = {}): GameState => ({ ...g, properties: { ...g.properties, ...Object.fromEntries(names.map((n) => [idx(n), { owner: seat, mortgaged: false, houses: 0, hotel: false, ...extra }])) } });
const cashOf = (g: GameState, i: number, c: number): GameState => ({ ...g, players: g.players.map((p, k) => (k === i ? { ...p, cash: c } : p)) });
const R = idx('Ramappa');

// ---- auction ----
let g = startAuction(mk(), R).state;
eq(!!g.auction && g.auction.bid === 0 && g.auction.endsAt === 11000, 'auction opens with a 10 second countdown');
g = bid(at(g, 2000), 1, 100);
eq(g.auction!.bid === 100 && g.auction!.bidder === 1, 'first tap +100 gives the Rs 100 starting bid');
eq(g.auction!.endsAt === 11000, 'a bid with 9s left does not shorten the countdown');
g = bid(at(g, 9500), 2, 500);
eq(g.auction!.bid === 600 && g.auction!.endsAt === 12500, 'bid in the last second lifts the countdown to 3 seconds (not 10)');
g = bid(at(g, 10000), 1, 100);
eq(g.auction!.bid === 700 && g.auction!.endsAt === 13000, 'rises in steps from the leading bid');
throws(() => bid(g, 1, 100), 'leader cannot raise own bid');
throws(() => bid(g, 0, 300), 'only +100 and +500');
throws(() => bid(cashOf(g, 2, 650), 2, 100), 'bid above cash');
eq(settleAuction(at(g, 12999)).auction !== null, 'not over before the countdown ends');
const done = settleAuction(at(g, 13000));
eq(done.auction === null && done.properties[R].owner === 1 && done.players[1].cash === 199300, 'highest bidder wins and pays the bank');
const none = settleAuction(at(startAuction(mk(), R).state, 11000));
eq(none.properties[R].owner === null && none.auction === null, 'no bids: place stays unowned');
eq(startAuction(mk(2).players.length ? { ...mk(2), players: mk(2).players.map((p) => ({ ...p, cash: 99 })) } : mk(), R).started === false, 'no auction when nobody can afford Rs 100');
// bankrupt players cannot bid
throws(() => bid({ ...startAuction(mk(), R).state, players: mk().players.map((p, i) => (i === 2 ? { ...p, bankrupt: true } : p)) }, 2, 100), 'bankrupt cannot bid');
// queue: places wait for their turn
let q = { ...mk(), auctionQueue: [R, idx('Basar')] };
q = settleAuction({ ...startAuction({ ...q, auctionQueue: [idx('Basar')] }, R).state, now: 20000 });
eq(q.auction?.tile === idx('Basar') && q.auctionQueue.length === 0, 'next queued place is auctioned after the first');

// declining or being unable to afford starts an auction (full flow through actions)
let f = mk();
f = { ...f, current: 0, players: f.players.map((p, i) => (i === 0 ? { ...p, position: 2 } : p)) };
let rolled = applyAction(f, 0, { type: 'roll' }, { rng: (() => { const v = [0.0, 0.2]; let i = 0; return () => v[i++] ?? 0; })(), now: 2000 });
// dice faces: floor(0*9)=0, floor(.2*9)=1 => 1 step: tile 3 Ramappa
eq(rolled.state.phase === 'awaitBuy' && rolled.state.players[0].position === 3, 'landed on Ramappa, offered to buy');
let d = applyAction(rolled.state, 0, { type: 'decline' }, { rng: Math.random, now: 2500 }).state;
eq(d.auction?.tile === 3 && d.phase === 'awaitEnd', 'declining opens an auction for everyone');
throws(() => applyAction(d, 0, { type: 'endTurn' }, { rng: Math.random, now: 3000 }), 'cannot end turn during an auction');
d = applyAction(d, 2, { type: 'bid', step: 500 }, { rng: Math.random, now: 3000 }).state;
d = applyAction(d, 0, { type: 'tick' }, { rng: Math.random, now: 20000 }).state;
eq(d.properties[3].owner === 2 && d.auction === null, 'tick settles the auction by the server clock');

// ---- trades ----
const base = own(own(mk(), 0, ['Ramappa', 'Wayanad']), 1, ['Basar']);
const give = { ...emptyBundle(), tiles: [R], cash: 500 }, get = { ...emptyBundle(), tiles: [idx('Basar')] };
let t = proposeTrade({ ...base, now: 5000 }, 0, 1, give, get);
eq(t.trade!.endsAt === 15000 && t.tradesThisTurn === 1, 'trade has a 10 second answer timer');
const acc = answerTrade(t, true);
eq(acc.properties[R].owner === 1 && acc.properties[idx('Basar')].owner === 0 && acc.players[0].cash === 199500 && acc.players[1].cash === 200500 && acc.trade === null, 'accepted trade swaps places and cash');
eq(answerTrade(t, false).trade === null && answerTrade(t, false).properties[R].owner === 0, 'declined trade changes nothing');
eq(expireTrade(at(t, 14999)).trade !== null && expireTrade(at(t, 15000)).trade === null && expireTrade(at(t, 15000)).properties[R].owner === 0, 'no answer in 10 seconds counts as declined');
eq(proposeTrade(base, 0, 1, { ...emptyBundle(), cash: 100 }, emptyBundle()).trade !== null, 'a gift is allowed');
throws(() => proposeTrade(base, 0, 1, emptyBundle(), emptyBundle()), 'empty trade');
throws(() => proposeTrade(base, 1, 0, emptyBundle(), { ...emptyBundle(), cash: 1 }), 'only the current player proposes');
throws(() => proposeTrade(base, 0, 1, { ...emptyBundle(), tiles: [idx('Basar')] }, emptyBundle()), 'cannot offer a place you do not own');
throws(() => proposeTrade(own(base, 0, ['Ramappa'], { houses: 1 }), 0, 1, give, get), 'place with buildings cannot be traded');
throws(() => proposeTrade(base, 0, 1, { ...emptyBundle(), cash: 999999 }, emptyBundle()), 'cannot offer more cash than owned');
throws(() => proposeTrade(base, 0, 1, emptyBundle(), { ...emptyBundle(), cash: 999999 }), 'cannot ask more cash than they have');
throws(() => proposeTrade(proposeTrade(base, 0, 1, give, get), 0, 2, give, emptyBundle()), 'one trade at a time');
let three = base;
for (let i = 0; i < 3; i++) three = answerTrade(proposeTrade(three, 0, 1, { ...emptyBundle(), cash: 100 }, emptyBundle()), false);
throws(() => proposeTrade(three, 0, 1, { ...emptyBundle(), cash: 100 }, emptyBundle()), 'at most three trades per turn');
const mortg = own(base, 0, ['Ramappa'], { mortgaged: true });
eq(answerTrade(proposeTrade(mortg, 0, 1, { ...emptyBundle(), tiles: [R] }, emptyBundle()), true).properties[R].mortgaged, 'mortgaged place can be traded and stays mortgaged');
const cardG = { ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, heldCards: ['fortune-11'] } : p)) };
const cardT = answerTrade(proposeTrade(cardG, 0, 1, { ...emptyBundle(), cards: ['fortune-11'] }, emptyBundle()), true);
eq(cardT.players[1].heldCards.join() === 'fortune-11' && cardT.players[0].heldCards.length === 0, 'Get Out of Jail Free card can be traded');
// cash changes between proposal and answer: rejected, nobody goes negative
const late = answerTrade({ ...t, players: t.players.map((p, i) => (i === 0 ? { ...p, cash: 100 } : p)) }, true);
eq(late.properties[R].owner === 0 && late.players[0].cash === 100, 'trade rechecked at acceptance');
const viaAction = applyAction({ ...base, now: 1 }, 0, { type: 'proposeTrade', to: 1, give, get }, { rng: Math.random, now: 5000 }).state;
throws(() => applyAction(viaAction, 2, { type: 'answerTrade', accept: true }, { rng: Math.random, now: 6000 }), 'only the other player answers');
eq(applyAction(viaAction, 1, { type: 'answerTrade', accept: true }, { rng: Math.random, now: 6000 }).state.properties[R].owner === 1, 'other player accepts through actions');
throws(() => applyAction(viaAction, 0, { type: 'roll' }, { rng: Math.random, now: 6000 }), 'no rolling while a trade is open');
console.log(errs.length ? errs.join('\n') : 'auction and trade OK');
process.exit(errs.length ? 1 : 0);
