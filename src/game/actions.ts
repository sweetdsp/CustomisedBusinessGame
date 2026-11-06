// One entry point for every request a player (or computer) can make. The server runs this; browsers only send actions.
import { roll, buy, decline, endTurn, payJailFine, useJailCard } from './engine.ts';
import { declareBankrupt, expireDebt, settleDebtIfCovered } from './endgame.ts';
import { build, mortgage, unmortgage, sellBuilding } from './build.ts';
import { bid, settleAuction } from './auction.ts';
import { proposeTrade, answerTrade, expireTrade } from './trade.ts';
import type { Bundle, GameState, Rng, RollResult } from './types.ts';

export type Action =
  | { type: 'roll' } | { type: 'buy' } | { type: 'decline' } | { type: 'endTurn' }
  | { type: 'build' }
  | { type: 'mortgage'; tile: number } | { type: 'unmortgage'; tile: number } | { type: 'sell'; tile: number }
  | { type: 'bid'; step: number }
  | { type: 'proposeTrade'; to: number; give: Bundle; get: Bundle }
  | { type: 'answerTrade'; accept: boolean }
  | { type: 'payFine' } | { type: 'useJailCard' }
  | { type: 'bankrupt' }
  | { type: 'tick' };

export interface Ctx { rng: Rng; now: number }

// Time-based events: auctions and trades that have run out.
export function tick(state: GameState): GameState {
  let s = state;
  s = settleAuction(s);
  s = expireTrade(s);
  s = expireDebt(s);
  return s;
}

export function applyAction(state: GameState, actor: number, action: Action, ctx: Ctx): { state: GameState; result?: RollResult } {
  let s: GameState = { ...state, now: ctx.now };
  if (action.type === 'tick') return { state: tick(s) };
  s = tick(s); // run out any expired auction or trade first
  if (s.gameOver) throw new Error('The game is over');

  if (action.type === 'bankrupt') return { state: declareBankrupt(s, actor) }; // allowed at any time
  if (s.debt) {
    // Only the player who owes may act: raise money by mortgaging or selling, or give up.
    if (actor !== s.debt.seat) throw new Error('Waiting for a player to raise money');
    if (action.type === 'mortgage') return { state: settleDebtIfCovered(mortgage(s, action.tile)) };
    if (action.type === 'sell') return { state: settleDebtIfCovered(sellBuilding(s, action.tile)) };
    throw new Error('Raise the money first: mortgage or sell');
  }
  if (s.auction) {
    if (action.type === 'bid') return { state: bid(s, actor, action.step) };
    throw new Error('An auction is open');
  }
  if (s.trade) {
    if (action.type === 'answerTrade') {
      if (actor !== s.trade.to) throw new Error('Only the other player can answer');
      return { state: answerTrade(s, action.accept) };
    }
    throw new Error('A trade is open');
  }

  if (actor !== s.current) throw new Error('Not your turn');
  switch (action.type) {
    case 'roll': { const r = roll(s, ctx.rng); return { state: r.state, result: r.result }; }
    case 'buy': return { state: buy(s) };
    case 'decline': return { state: decline(s) };
    case 'endTurn': return { state: endTurn(s) };
    case 'build': return { state: build(s) };
    case 'mortgage': return { state: mortgage(s, action.tile) };
    case 'unmortgage': return { state: unmortgage(s, action.tile) };
    case 'sell': return { state: sellBuilding(s, action.tile) };
    case 'payFine': return { state: payJailFine(s) };
    case 'useJailCard': return { state: useJailCard(s) };
    case 'proposeTrade': return { state: proposeTrade(s, actor, action.to, action.give, action.get) };
    default: throw new Error('Not allowed now');
  }
}
