// Computer players (section 16). Dice decide movement; the computer only decides: buy, build, bids, trade answers, jail, raising money.
import { CONSTANTS } from '../shared/constants.ts';
import { TILES, propertyOf } from '../shared/board.ts';
import { checkBuild, checkMortgage, checkSell, checkUnmortgage, unmortgageCost } from './build.ts';
import { bidReason } from './auction.ts';
import { ownedTiles } from './rent.ts';
import { debtTotal } from './endgame.ts';
import type { Action } from './actions.ts';
import type { Bundle, GameState, Rng } from './types.ts';

type Level = 'Easy' | 'Medium' | 'High';
const price = (t: number) => propertyOf(TILES[t])!.price;
const reserve = (l: Level) => CONSTANTS.AI_CASH_RESERVE[l];

// How many places of this tile's state the player holds (unmortgaged).
const heldInState = (state: GameState, seat: number, tile: number) =>
  ownedTiles(state, seat).filter((t) => TILES[t].state === TILES[tile].state && !state.properties[t].mortgaged).length;

function wantsToBuy(state: GameState, seat: number, tile: number, l: Level): boolean {
  const cash = state.players[seat].cash;
  const after = cash - price(tile);
  if (after < 0) return false;
  const held = heldInState(state, seat, tile);
  if (l === 'Easy') return true; // buys almost anything it lands on
  if (l === 'Medium') return after >= reserve(l) || (held > 0 && after >= reserve(l) / 4); // prefers states it already holds
  // High: protects cash, but chases three places of one state for doubled base rent
  return after >= reserve(l) || (held + 1 >= CONSTANTS.DOUBLED_RENT_MIN_PLACES && after >= reserve(l) / 4);
}

function bidLimit(state: GameState, seat: number, tile: number, l: Level): number {
  const held = heldInState(state, seat, tile);
  let factor = CONSTANTS.AI_BID_LIMIT_FACTOR[l];
  if (l !== 'Easy' && held > 0) factor += CONSTANTS.AI_SET_BONUS_FACTOR * Math.min(held, 2);
  if (l === 'High' && held + 1 >= CONSTANTS.DOUBLED_RENT_MIN_PLACES) factor = Math.max(factor, 1.3);
  const cashRoom = state.players[seat].cash - reserve(l);
  return Math.max(0, Math.min(price(tile) * factor, l === 'Easy' ? state.players[seat].cash : cashRoom));
}

function bidDecision(state: GameState, seat: number, l: Level, rng: Rng): Action | null {
  const a = state.auction!;
  if (a.bidder === seat) return null;
  const limit = bidLimit(state, seat, a.tile, l);
  const gap = limit - a.bid;
  if (gap < CONSTANTS.AUCTION_BID_STEPS[0]) return null;
  // Easy bids loosely (bigger jumps); others raise in small steps unless far below their limit
  const big = CONSTANTS.AUCTION_BID_STEPS[1];
  const step = gap >= big * (l === 'Easy' ? 1 : 3) && rng() < (l === 'Easy' ? 0.7 : 0.4) ? big : CONSTANTS.AUCTION_BID_STEPS[0];
  if (bidReason(state, seat, step)) return null;
  return { type: 'bid', step };
}

function bundleValue(state: GameState, b: Bundle): number {
  let v = b.cash + b.cards.length * CONSTANTS.JAIL_FINE;
  for (const t of b.tiles) v += state.properties[t].mortgaged ? propertyOf(TILES[t])!.mortgage : price(t);
  return v;
}

// Accept when what comes in is worth enough compared with what goes out.
function tradeAnswer(state: GameState, seat: number, l: Level): boolean {
  const t = state.trade!;
  const incoming = t.give, outgoing = t.get; // the proposer's give is what this player receives
  let got = bundleValue(state, incoming);
  const lost = bundleValue(state, outgoing);
  if (l === 'High') {
    // value completing a set of three, and refuse to break one it already has
    for (const tile of incoming.tiles) if (heldInState(state, seat, tile) + 1 >= CONSTANTS.DOUBLED_RENT_MIN_PLACES) got += price(tile) * 0.5;
    for (const tile of outgoing.tiles) if (heldInState(state, seat, tile) >= CONSTANTS.DOUBLED_RENT_MIN_PLACES) return false;
  }
  return got > 0 && got >= lost * CONSTANTS.AI_TRADE_ACCEPT_RATIO[l];
}

// Raise money for a debt: sell buildings first, then mortgage the least useful places; give up if nothing is left.
function raiseMoney(state: GameState, seat: number): Action {
  const mine = ownedTiles(state, seat);
  const sellable = mine.filter((t) => checkSell(state, t).ok);
  if (sellable.length) return { type: 'sell', tile: sellable[0] };
  const mortgageable = mine.filter((t) => checkMortgage(state, t).ok)
    .sort((a, b) => heldInState(state, seat, a) - heldInState(state, seat, b) || price(b) - price(a));
  if (mortgageable.length) return { type: 'mortgage', tile: mortgageable[0] };
  return { type: 'bankrupt' };
}

function ownTurn(state: GameState, seat: number, l: Level): Action {
  const me = state.players[seat];
  const cash = me.cash;
  if (state.phase === 'awaitBuy') return wantsToBuy(state, seat, me.position, l) ? { type: 'buy' } : { type: 'decline' };
  if (state.phase === 'awaitRoll') {
    if (me.inJail) {
      if (me.heldCards.length) return { type: 'useJailCard' };
      if (cash >= CONSTANTS.JAIL_FINE * CONSTANTS.AI_JAIL_PAY_CASH_MULTIPLE[l]) return { type: 'payFine' };
    }
    return { type: 'roll' };
  }
  // awaitEnd: build when the cash reserve allows, buy back mortgaged places when comfortable, then end the turn
  const b = checkBuild(state);
  if (b.ok && cash - b.cost >= reserve(l)) return { type: 'build' };
  if (l !== 'Easy') {
    for (const t of ownedTiles(state, seat)) {
      if (checkUnmortgage(state, t).ok && cash - unmortgageCost(t) >= reserve(l) * 2) return { type: 'unmortgage', tile: t };
    }
  }
  return { type: 'endTurn' };
}

// The next thing this computer wants to do, or null when it has nothing to do right now.
export function decide(state: GameState, seat: number, rng: Rng): { actor: number; action: Action } | null {
  const me = state.players[seat];
  if (!me?.ai || me.bankrupt || state.gameOver) return null;
  const l = me.ai;
  let action: Action | null = null;
  if (state.debt) action = state.debt.seat === seat && debtTotal(state) > 0 ? raiseMoney(state, seat) : null;
  else if (state.auction) action = bidDecision(state, seat, l, rng);
  else if (state.trade) action = state.trade.to === seat ? { type: 'answerTrade', accept: tradeAnswer(state, seat, l) } : null;
  else if (state.current === seat) action = ownTurn(state, seat, l);
  return action ? { actor: seat, action } : null;
}

// Which computer should move next (random order among those with something to do).
export function nextComputerMove(state: GameState, rng: Rng): { actor: number; action: Action } | null {
  const moves = state.players.map((_, i) => decide(state, i, rng)).filter((m): m is { actor: number; action: Action } => m !== null);
  return moves.length ? moves[Math.floor(rng() * moves.length)] : null;
}
